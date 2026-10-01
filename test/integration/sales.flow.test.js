import request from 'supertest';
import { beforeAll, describe, expect, test } from 'vitest';
import { createApp } from '../../src/app.js';
import { query } from '../../src/lib/database.js';

const app = createApp();
const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`;

const ensureSalesPermission = async () => {
  await query(`
    INSERT INTO electronica_az.permiso(codigo, descripcion) VALUES
      ('VENTAS_GESTIONAR', 'Gestionar ventas')
    ON CONFLICT (codigo) DO NOTHING
  `);
  await query(`
    INSERT INTO electronica_az.rol_permiso(id_rol, id_permiso)
    SELECT r.id_rol, p.id_permiso
    FROM electronica_az.rol r
    CROSS JOIN electronica_az.permiso p
    WHERE r.nombre IN ('ADMINISTRADOR', 'DESARROLLADOR', 'VENDEDOR')
      AND p.codigo = 'VENTAS_GESTIONAR'
    ON CONFLICT DO NOTHING
  `);
  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_detalle_venta_producto
      ON electronica_az.detalle_venta (id_venta, id_producto)
  `);
};

const login = async (identificador, contrasena) => {
  const response = await request(app).post('/api/auth/login').send({ identificador, contrasena });
  expect(response.status).toBe(200);
  return response.body.data.token;
};

const seedProductWithStock = async (token, label, stock) => {
  const authorize = { Authorization: `Bearer ${token}` };
  const category = await request(app).post('/api/categorias').set(authorize).send({ nombre: `Cat Sale ${label}` });
  const brand = await request(app).post('/api/marcas').set(authorize).send({ nombre: `Marca Sale ${label}` });
  const unit = await request(app).post('/api/unidades').set(authorize).send({
    nombre: `Unidad Sale ${label}`,
    simbolo: `us${label}`,
    permiteFraccion: false,
  });
  const location = await request(app).post('/api/ubicaciones').set(authorize).send({
    codigo: `SALE-${label}`,
    pasillo: 'S',
    estante: '1',
  });
  const product = await request(app).post('/api/productos').set(authorize).send({
    codigo: `SALE-SKU-${label}`,
    nombre: `Producto Sale ${label}`,
    precioVenta: 10,
    idCategoria: category.body.data.id_categoria,
    idUnidadMedida: unit.body.data.id_unidad_medida,
    idUbicacion: location.body.data.id_ubicacion,
    idMarca: brand.body.data.id_marca,
    stockMinimo: 0,
  });
  expect(product.status).toBe(201);
  const productId = product.body.data.id_producto;

  if (stock > 0) {
    const ajuste = await request(app).post('/api/inventario/ajustes').set(authorize).send({
      idProducto: productId,
      tipo: 'ENTRADA',
      cantidad: stock,
      motivo: 'Stock para venta',
      costoUnitario: 4,
      claveIdempotencia: `sale-stock-${label}`,
    });
    expect(ajuste.status).toBe(201);
  }
  return productId;
};

describe('sales flow with PostgreSQL', () => {
  let adminToken;
  let vendedorToken;
  let otherVendorToken;
  let clientId;
  let productId;
  let saleId;

  beforeAll(async () => {
    await ensureSalesPermission();
    adminToken = await login(process.env.BOOTSTRAP_ADMIN_EMAIL, process.env.BOOTSTRAP_ADMIN_PASSWORD);

    const vendor = await request(app).post('/api/usuarios').set('Authorization', `Bearer ${adminToken}`).send({
      nombreUsuario: `vend.sale.${suffix}`,
      correo: `vend.sale.${suffix}@example.test`,
      contrasena: 'ClaveVendedorSegura123',
      roles: ['VENDEDOR'],
    });
    expect(vendor.status).toBe(201);
    vendedorToken = await login(`vend.sale.${suffix}@example.test`, 'ClaveVendedorSegura123');

    const other = await request(app).post('/api/usuarios').set('Authorization', `Bearer ${adminToken}`).send({
      nombreUsuario: `vend2.sale.${suffix}`,
      correo: `vend2.sale.${suffix}@example.test`,
      contrasena: 'ClaveVendedorSegura123',
      roles: ['VENDEDOR'],
    });
    expect(other.status).toBe(201);
    otherVendorToken = await login(`vend2.sale.${suffix}@example.test`, 'ClaveVendedorSegura123');

    const client = await request(app).post('/api/clientes').set('Authorization', `Bearer ${adminToken}`).send({
      nombre: `Cliente Sale ${suffix}`,
      documento: `CLI-SALE-${suffix}`,
      telefono: '71111111',
    });
    expect(client.status).toBe(201);
    clientId = client.body.data.id_cliente;

    productId = await seedProductWithStock(adminToken, suffix, 10);
  });

  test('customer denied; draft does not change stock; confirm creates comprobante', async () => {
    const customer = await request(app).post('/api/auth/registro').send({
      nombreUsuario: `cli.sale.${suffix}`,
      correo: `cli.sale.${suffix}@example.test`,
      contrasena: 'ClaveDePruebaSegura123',
      nombre: 'Cliente Auth',
    });
    expect(customer.status).toBe(201);
    const customerToken = await login(`cli.sale.${suffix}@example.test`, 'ClaveDePruebaSegura123');
    const denied = await request(app)
      .get('/api/ventas')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(denied.status).toBe(403);

    const authorize = { Authorization: `Bearer ${vendedorToken}` };
    const stockBefore = await query(
      'SELECT stock_actual FROM electronica_az.existencia WHERE id_producto = $1',
      [productId],
    );
    const base = Number(stockBefore.rows[0].stock_actual);

    const draft = await request(app).post('/api/ventas').set(authorize).send({
      idCliente: clientId,
      detalles: [{ idProducto: productId, cantidad: 2, precioUnitario: 10 }],
    });
    expect(draft.status).toBe(201);
    expect(draft.body.data.estado).toBe('BORRADOR');
    expect(draft.body.data.total).toBe(20);
    expect(draft.body.data.detalles[0]).not.toHaveProperty('costoUnitarioHistorico');
    saleId = draft.body.data.idVenta;

    const stockDraft = await query(
      'SELECT stock_actual FROM electronica_az.existencia WHERE id_producto = $1',
      [productId],
    );
    expect(Number(stockDraft.rows[0].stock_actual)).toBe(base);

    const confirm = await request(app)
      .post(`/api/ventas/${saleId}/confirmar`)
      .set(authorize)
      .send({ claveIdempotencia: `conf-${suffix}` });
    expect(confirm.status).toBe(200);
    expect(confirm.body.data.estado).toBe('CONFIRMADA');
    expect(confirm.body.data.comprobante.numero).toMatch(/^V-\d{8}-\d{4}$/);

    const confirmAgain = await request(app)
      .post(`/api/ventas/${saleId}/confirmar`)
      .set(authorize)
      .send({ claveIdempotencia: `conf-${suffix}` });
    expect(confirmAgain.status).toBe(200);

    const stockAfter = await query(
      'SELECT stock_actual FROM electronica_az.existencia WHERE id_producto = $1',
      [productId],
    );
    expect(Number(stockAfter.rows[0].stock_actual)).toBe(base - 2);

    const movement = await query(
      `SELECT tipo, id_detalle_venta FROM electronica_az.movimiento_inventario
       WHERE id_producto = $1 AND motivo = 'VENTA_CONFIRMAR'
       ORDER BY fecha_hora DESC LIMIT 1`,
      [productId],
    );
    expect(movement.rows[0].tipo).toBe('SALIDA');
    expect(movement.rows[0].id_detalle_venta).toBeTruthy();
  });

  test('payments ceil to 0.50; delivery requires zero balance; anular ownership', async () => {
    const authorize = { Authorization: `Bearer ${vendedorToken}` };

    const pay = await request(app).post(`/api/ventas/${saleId}/pagos`).set(authorize).send({
      monto: 5.2,
      metodo: 'EFECTIVO',
    });
    expect(pay.status).toBe(201);
    expect(pay.body.data.monto).toBe(5.5);
    expect(pay.body.data.estado).toBe('PENDIENTE');

    const confirmPay = await request(app)
      .post(`/api/pagos/${pay.body.data.idPago}/confirmar`)
      .set(authorize)
      .send({ claveIdempotencia: `pay-${suffix}` });
    expect(confirmPay.status).toBe(200);

    const deliverBlocked = await request(app)
      .post(`/api/ventas/${saleId}/entrega`)
      .set(authorize)
      .send({ claveIdempotencia: `ent-bad-${suffix}` });
    expect(deliverBlocked.status).toBe(422);

    const payRest = await request(app).post(`/api/ventas/${saleId}/pagos`).set(authorize).send({
      monto: 14.5,
      metodo: 'QR',
      referenciaExterna: `QR-${suffix}`,
    });
    expect(payRest.status).toBe(201);
    const confirmRest = await request(app)
      .post(`/api/pagos/${payRest.body.data.idPago}/confirmar`)
      .set(authorize)
      .send({ claveIdempotencia: `pay2-${suffix}` });
    expect(confirmRest.status).toBe(200);

    const deliver = await request(app)
      .post(`/api/ventas/${saleId}/entrega`)
      .set(authorize)
      .send({ claveIdempotencia: `ent-${suffix}` });
    expect(deliver.status).toBe(201);

    const anularPaid = await request(app)
      .post(`/api/ventas/${saleId}/anular`)
      .set(authorize)
      .send({ claveIdempotencia: `anul-paid-${suffix}` });
    expect(anularPaid.status).toBe(422);

    const productB = await seedProductWithStock(adminToken, `${suffix}b`, 5);
    const otherSale = await request(app)
      .post('/api/ventas')
      .set('Authorization', `Bearer ${otherVendorToken}`)
      .send({
        idCliente: clientId,
        detalles: [{ idProducto: productB, cantidad: 1, precioUnitario: 8 }],
      });
    expect(otherSale.status).toBe(201);
    const otherConfirm = await request(app)
      .post(`/api/ventas/${otherSale.body.data.idVenta}/confirmar`)
      .set('Authorization', `Bearer ${otherVendorToken}`)
      .send({ claveIdempotencia: `conf-other-${suffix}` });
    expect(otherConfirm.status).toBe(200);

    const anularAjena = await request(app)
      .post(`/api/ventas/${otherSale.body.data.idVenta}/anular`)
      .set(authorize)
      .send({ claveIdempotencia: `anul-ajena-${suffix}` });
    expect(anularAjena.status).toBe(403);

    const stockBeforeAnul = await query(
      'SELECT stock_actual FROM electronica_az.existencia WHERE id_producto = $1',
      [productB],
    );
    const anularOwn = await request(app)
      .post(`/api/ventas/${otherSale.body.data.idVenta}/anular`)
      .set('Authorization', `Bearer ${otherVendorToken}`)
      .send({ claveIdempotencia: `anul-own-${suffix}` });
    expect(anularOwn.status).toBe(200);
    expect(anularOwn.body.data.estado).toBe('ANULADA');

    const stockAfterAnul = await query(
      'SELECT stock_actual FROM electronica_az.existencia WHERE id_producto = $1',
      [productB],
    );
    expect(Number(stockAfterAnul.rows[0].stock_actual))
      .toBe(Number(stockBeforeAnul.rows[0].stock_actual) + 1);

    const comprobante = await request(app)
      .get(`/api/ventas/${saleId}/comprobante`)
      .set(authorize);
    expect(comprobante.status).toBe(200);
    expect(comprobante.body.data.numero).toBeTruthy();
    expect(comprobante.body.data.total).toBe(20);
  });
});
