import request from 'supertest';
import { beforeAll, describe, expect, test } from 'vitest';
import { createApp } from '../../src/app.js';
import { query } from '../../src/lib/database.js';

const app = createApp();
const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`;

const ensurePurchasesPermission = async () => {
  await query(`
    INSERT INTO electronica_az.permiso(codigo, descripcion) VALUES
      ('COMPRAS_GESTIONAR', 'Gestionar proveedores y compras')
    ON CONFLICT (codigo) DO NOTHING
  `);
  await query(`
    INSERT INTO electronica_az.rol_permiso(id_rol, id_permiso)
    SELECT r.id_rol, p.id_permiso
    FROM electronica_az.rol r
    CROSS JOIN electronica_az.permiso p
    WHERE r.nombre IN ('ADMINISTRADOR', 'DESARROLLADOR')
      AND p.codigo = 'COMPRAS_GESTIONAR'
    ON CONFLICT DO NOTHING
  `);
  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_proveedor_documento_normalizado
      ON electronica_az.proveedor (lower(btrim(documento)))
      WHERE documento IS NOT NULL AND btrim(documento) <> ''
  `);
  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_detalle_compra_producto
      ON electronica_az.detalle_compra (id_compra, id_producto)
  `);
};

const login = async (identificador, contrasena) => {
  const response = await request(app).post('/api/auth/login').send({ identificador, contrasena });
  expect(response.status).toBe(200);
  return response.body.data.token;
};

const createCatalogProduct = async (token, label) => {
  const authorize = { Authorization: `Bearer ${token}` };
  const category = await request(app).post('/api/categorias').set(authorize).send({ nombre: `Cat Buy ${label}` });
  const brand = await request(app).post('/api/marcas').set(authorize).send({ nombre: `Marca Buy ${label}` });
  const unit = await request(app).post('/api/unidades').set(authorize).send({
    nombre: `Unidad Buy ${label}`,
    simbolo: `ub${label}`,
    permiteFraccion: false,
  });
  const location = await request(app).post('/api/ubicaciones').set(authorize).send({
    codigo: `BUY-${label}`,
    pasillo: 'B',
    estante: '1',
  });
  expect([category, brand, unit, location].every((r) => r.status === 201)).toBe(true);

  const product = await request(app).post('/api/productos').set(authorize).send({
    codigo: `BUY-SKU-${label}`,
    nombre: `Producto Buy ${label}`,
    precioVenta: 30,
    idCategoria: category.body.data.id_categoria,
    idUnidadMedida: unit.body.data.id_unidad_medida,
    idUbicacion: location.body.data.id_ubicacion,
    idMarca: brand.body.data.id_marca,
    stockMinimo: 1,
  });
  expect(product.status).toBe(201);
  return product.body.data.id_producto;
};

describe('purchases flow with PostgreSQL', () => {
  let adminToken;
  let vendedorToken;
  let productId;
  let supplierId;
  let purchaseId;

  beforeAll(async () => {
    await ensurePurchasesPermission();
    adminToken = await login(process.env.BOOTSTRAP_ADMIN_EMAIL, process.env.BOOTSTRAP_ADMIN_PASSWORD);

    const createdUser = await request(app)
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nombreUsuario: `vend.buy.${suffix}`,
        correo: `vend.buy.${suffix}@example.test`,
        contrasena: 'ClaveVendedorSegura123',
        roles: ['VENDEDOR'],
      });
    expect(createdUser.status).toBe(201);
    vendedorToken = await login(`vend.buy.${suffix}@example.test`, 'ClaveVendedorSegura123');
    productId = await createCatalogProduct(adminToken, suffix);
  });

  test('vendor is denied; admin manages suppliers and pending purchase without stock change', async () => {
    const authorize = { Authorization: `Bearer ${adminToken}` };

    const denied = await request(app)
      .get('/api/proveedores')
      .set('Authorization', `Bearer ${vendedorToken}`);
    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe('FB001');

    const supplier = await request(app).post('/api/proveedores').set(authorize).send({
      razonSocial: `Proveedor ${suffix}`,
      documento: `DOC-${suffix}`,
      telefono: '70000000',
    });
    expect(supplier.status).toBe(201);
    supplierId = supplier.body.data.idProveedor;

    const duplicateDoc = await request(app).post('/api/proveedores').set(authorize).send({
      razonSocial: `Otro ${suffix}`,
      documento: `DOC-${suffix}`,
    });
    expect(duplicateDoc.status).toBe(409);

    const stockBefore = await query(
      'SELECT stock_actual FROM electronica_az.existencia WHERE id_producto = $1',
      [productId],
    );
    const baseStock = Number(stockBefore.rows[0].stock_actual);

    const purchase = await request(app).post('/api/compras').set(authorize).send({
      idProveedor: supplierId,
      detalles: [{ idProducto: productId, cantidad: 5, costoUnitario: 8 }],
    });
    expect(purchase.status).toBe(201);
    expect(purchase.body.data.estado).toBe('PENDIENTE');
    purchaseId = purchase.body.data.idCompra;

    const stockAfterCreate = await query(
      'SELECT stock_actual FROM electronica_az.existencia WHERE id_producto = $1',
      [productId],
    );
    expect(Number(stockAfterCreate.rows[0].stock_actual)).toBe(baseStock);

    const patched = await request(app).patch(`/api/compras/${purchaseId}`).set(authorize).send({
      idProveedor: supplierId,
      detalles: [{ idProducto: productId, cantidad: 4, costoUnitario: 10 }],
    });
    expect(patched.status).toBe(200);
    expect(patched.body.data.detalles[0].cantidad).toBe(4);

    const stockAfterPatch = await query(
      'SELECT stock_actual FROM electronica_az.existencia WHERE id_producto = $1',
      [productId],
    );
    expect(Number(stockAfterPatch.rows[0].stock_actual)).toBe(baseStock);
  });

  test('receive is idempotent, sets id_detalle_compra, and blocks cancel after receive', async () => {
    const authorize = { Authorization: `Bearer ${adminToken}` };

    const stockBefore = await query(
      'SELECT stock_actual, costo_promedio FROM electronica_az.existencia WHERE id_producto = $1',
      [productId],
    );
    const baseStock = Number(stockBefore.rows[0].stock_actual);

    const receive = await request(app)
      .post(`/api/compras/${purchaseId}/recibir`)
      .set(authorize)
      .send({ claveIdempotencia: `recv-${suffix}` });
    expect(receive.status).toBe(200);
    expect(receive.body.data.compra.estado).toBe('RECIBIDA');
    expect(receive.body.data.movimientos).toHaveLength(1);
    expect(receive.body.data.movimientos[0].idDetalleCompra).toBeTruthy();
    expect(receive.body.data.movimientos[0].stockActual).toBe(baseStock + 4);

    const movement = await query(
      `SELECT id_detalle_compra, motivo, cantidad
       FROM electronica_az.movimiento_inventario
       WHERE id_movimiento = $1`,
      [receive.body.data.movimientos[0].idMovimiento],
    );
    expect(movement.rows[0].id_detalle_compra).toBe(receive.body.data.movimientos[0].idDetalleCompra);
    expect(movement.rows[0].motivo).toBe('RECEPCION_COMPRA');
    expect(Number(movement.rows[0].cantidad)).toBe(4);

    const receiveAgain = await request(app)
      .post(`/api/compras/${purchaseId}/recibir`)
      .set(authorize)
      .send({ claveIdempotencia: `recv-${suffix}` });
    expect(receiveAgain.status).toBe(200);
    expect(receiveAgain.body.data.movimientos[0].idMovimiento)
      .toBe(receive.body.data.movimientos[0].idMovimiento);

    const stockAfterIdem = await query(
      'SELECT stock_actual FROM electronica_az.existencia WHERE id_producto = $1',
      [productId],
    );
    expect(Number(stockAfterIdem.rows[0].stock_actual)).toBe(baseStock + 4);

    const cancelBlocked = await request(app)
      .post(`/api/compras/${purchaseId}/cancelar`)
      .set(authorize);
    expect(cancelBlocked.status).toBe(422);

    const patchBlocked = await request(app).patch(`/api/compras/${purchaseId}`).set(authorize).send({
      idProveedor: supplierId,
      detalles: [{ idProducto: productId, cantidad: 1, costoUnitario: 1 }],
    });
    expect(patchBlocked.status).toBe(422);

    const inactive = await request(app)
      .patch(`/api/proveedores/${supplierId}`)
      .set(authorize)
      .send({ activo: false });
    expect(inactive.status).toBe(200);

    const purchaseWithInactive = await request(app).post('/api/compras').set(authorize).send({
      idProveedor: supplierId,
      detalles: [{ idProducto: productId, cantidad: 1, costoUnitario: 1 }],
    });
    expect(purchaseWithInactive.status).toBe(422);

    const cancelableSupplier = await request(app).post('/api/proveedores').set(authorize).send({
      razonSocial: `Proveedor Cancel ${suffix}`,
      documento: `DOC-CX-${suffix}`,
    });
    expect(cancelableSupplier.status).toBe(201);

    const toCancel = await request(app).post('/api/compras').set(authorize).send({
      idProveedor: cancelableSupplier.body.data.idProveedor,
      detalles: [{ idProducto: productId, cantidad: 2, costoUnitario: 3 }],
    });
    expect(toCancel.status).toBe(201);

    const stockBeforeCancel = await query(
      'SELECT stock_actual FROM electronica_az.existencia WHERE id_producto = $1',
      [productId],
    );
    const cancel = await request(app)
      .post(`/api/compras/${toCancel.body.data.idCompra}/cancelar`)
      .set(authorize);
    expect(cancel.status).toBe(200);
    expect(cancel.body.data.estado).toBe('CANCELADA');

    const stockAfterCancel = await query(
      'SELECT stock_actual FROM electronica_az.existencia WHERE id_producto = $1',
      [productId],
    );
    expect(Number(stockAfterCancel.rows[0].stock_actual)).toBe(Number(stockBeforeCancel.rows[0].stock_actual));
  });
});
