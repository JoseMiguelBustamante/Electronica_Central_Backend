import request from 'supertest';
import { describe, expect, test } from 'vitest';
import { createApp } from '../../src/app.js';

const app = createApp();
const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`;
const password = 'ClaveDePruebaCiclos123';

const loginAdministrator = async () => {
  const response = await request(app).post('/api/auth/login').send({
    identificador: process.env.BOOTSTRAP_ADMIN_EMAIL,
    contrasena: process.env.BOOTSTRAP_ADMIN_PASSWORD,
  });
  expect(response.status).toBe(200);
  return { Authorization: `Bearer ${response.body.data.token}` };
};

const createBase = async (authorize, tag) => {
  const category = await request(app).post('/api/categorias').set(authorize).send({ nombre: `Cat ${tag} ${suffix}` });
  const brand = await request(app).post('/api/marcas').set(authorize).send({ nombre: `Marca ${tag} ${suffix}` });
  const unit = await request(app).post('/api/unidades').set(authorize).send({ nombre: `Unidad ${tag} ${suffix}`, simbolo: `u${tag}${suffix}` });
  const location = await request(app).post('/api/ubicaciones').set(authorize).send({ codigo: `L-${tag}-${suffix}`, pasillo: 'A', estante: '1' });
  const model = await request(app).post('/api/modelos').set(authorize).send({ nombre: `Modelo ${tag} ${suffix}`, idMarca: brand.body.data.id_marca });
  expect([category, brand, unit, location, model].map((r) => r.status)).toEqual([201, 201, 201, 201, 201]);
  return {
    idCategoria: category.body.data.id_categoria,
    idMarca: brand.body.data.id_marca,
    idUnidadMedida: unit.body.data.id_unidad_medida,
    idUbicacion: location.body.data.id_ubicacion,
    idModelo: model.body.data.id_modelo,
  };
};

describe('ciclo 1 y 2 — gaps vs perfil', () => {
  test('CU-5/6/7/8: edit, reject duplicates and in-use deletes, delete unused rows', async () => {
    const authorize = await loginAdministrator();
    const base = await createBase(authorize, 'crud');

    const renamed = await request(app).patch(`/api/categorias/${base.idCategoria}`).set(authorize).send({ nombre: `Cat editada ${suffix}` });
    expect(renamed.status).toBe(200);
    expect(renamed.body.data.nombre).toBe(`Cat editada ${suffix}`);

    const unitEdit = await request(app).patch(`/api/unidades/${base.idUnidadMedida}`).set(authorize).send({ permiteFraccion: true });
    expect(unitEdit.status).toBe(200);
    expect(unitEdit.body.data.permite_fraccion).toBe(true);

    const other = await request(app).post('/api/marcas').set(authorize).send({ nombre: `Otra marca ${suffix}` });
    const duplicate = await request(app).patch(`/api/marcas/${other.body.data.id_marca}`).set(authorize).send({ nombre: ` marca CRUD ${suffix} ` });
    expect(duplicate.status).toBe(409);

    const emptyBody = await request(app).patch(`/api/marcas/${other.body.data.id_marca}`).set(authorize).send({});
    expect(emptyBody.status).toBe(400);

    // The brand still owns a model → cannot be deleted.
    const brandInUse = await request(app).delete(`/api/marcas/${base.idMarca}`).set(authorize);
    expect(brandInUse.status).toBe(409);
    expect(brandInUse.body.error.details.reason).toBe('IN_USE');

    const modelDeleted = await request(app).delete(`/api/modelos/${base.idModelo}`).set(authorize);
    expect(modelDeleted.status).toBe(200);
    const brandDeleted = await request(app).delete(`/api/marcas/${base.idMarca}`).set(authorize);
    expect(brandDeleted.status).toBe(200);
    const missing = await request(app).delete(`/api/marcas/${base.idMarca}`).set(authorize);
    expect(missing.status).toBe(404);
  });

  test('CU-4: admin list, full edit, brand/model rule, deactivate and reactivate', async () => {
    const authorize = await loginAdministrator();
    const base = await createBase(authorize, 'prod');
    const created = await request(app).post('/api/productos').set(authorize).send({
      codigo: `P-${suffix}`,
      nombre: `Producto ${suffix}`,
      precioVenta: 13,
      precioCompra: 10,
      margenGanancia: 30,
      idCategoria: base.idCategoria,
      idUnidadMedida: base.idUnidadMedida,
      idUbicacion: base.idUbicacion,
      idMarca: base.idMarca,
      idModelo: base.idModelo,
      stockMinimo: 2,
    });
    expect(created.status).toBe(201);
    const id = created.body.data.id_producto;
    expect(Number(created.body.data.precio_compra)).toBe(10);
    expect(Number(created.body.data.margen_ganancia)).toBe(30);

    const edited = await request(app).patch(`/api/productos/${id}`).set(authorize).send({
      nombre: `Producto editado ${suffix}`,
      precioCompra: 20,
      margenGanancia: 50,
      precioVenta: 30,
      stockMinimo: 4,
    });
    expect(edited.status).toBe(200);
    expect(edited.body.data.nombre).toBe(`Producto editado ${suffix}`);
    expect(Number(edited.body.data.precio_venta)).toBe(30);

    const otherBrand = await request(app).post('/api/marcas').set(authorize).send({ nombre: `Marca sin modelo ${suffix}` });
    const mismatch = await request(app).patch(`/api/productos/${id}`).set(authorize).send({ idMarca: otherBrand.body.data.id_marca });
    expect(mismatch.status).toBe(422);
    const clearBrand = await request(app).patch(`/api/productos/${id}`).set(authorize).send({ idMarca: null });
    expect(clearBrand.status).toBe(200);
    expect(clearBrand.body.data.id_marca).toBeNull();
    expect(clearBrand.body.data.id_modelo).toBeNull();

    const deactivated = await request(app).patch(`/api/productos/${id}`).set(authorize).send({ activo: false });
    expect(deactivated.body.data.activo).toBe(false);
    const inactiveList = await request(app).get(`/api/productos?buscar=P-${suffix}&estado=inactivos`).set(authorize);
    expect(inactiveList.status).toBe(200);
    expect(inactiveList.body.data).toHaveLength(1);
    expect(Number(inactiveList.body.data[0].stock_minimo)).toBe(4);
    expect(inactiveList.body.data[0].ubicacion).toBe(`L-prod-${suffix}`);

    const reactivated = await request(app).patch(`/api/productos/${id}`).set(authorize).send({ activo: true });
    expect(reactivated.body.data.activo).toBe(true);
    const publicList = await request(app).get(`/api/catalogo/productos?buscar=P-${suffix}`);
    expect(publicList.body.meta.total).toBe(1);
  });

  test('CU-9/CU-10: list compatibilities, public detail shows them, model filter uses them', async () => {
    const authorize = await loginAdministrator();
    const base = await createBase(authorize, 'comp');
    const product = await request(app).post('/api/productos').set(authorize).send({
      codigo: `C-${suffix}`,
      nombre: `Repuesto ${suffix}`,
      precioVenta: 5,
      idCategoria: base.idCategoria,
      idUnidadMedida: base.idUnidadMedida,
      idUbicacion: base.idUbicacion,
    });
    const id = product.body.data.id_producto;

    const added = await request(app).post(`/api/productos/${id}/compatibilidades`).set(authorize).send({ idModelo: base.idModelo, observaciones: 'Versión 2' });
    expect(added.status).toBe(201);
    const duplicate = await request(app).post(`/api/productos/${id}/compatibilidades`).set(authorize).send({ idModelo: base.idModelo });
    expect(duplicate.status).toBe(409);

    const list = await request(app).get(`/api/productos/${id}/compatibilidades`).set(authorize);
    expect(list.status).toBe(200);
    expect(list.body.data).toEqual([expect.objectContaining({
      id_modelo: base.idModelo,
      modelo: `Modelo comp ${suffix}`,
      marca: `Marca comp ${suffix}`,
      observaciones: 'Versión 2',
    })]);

    const detail = await request(app).get(`/api/catalogo/productos/${id}`);
    expect(detail.body.data.compatibilidades).toHaveLength(1);
    expect(detail.body.data).not.toHaveProperty('stock_actual');

    const byModel = await request(app).get(`/api/catalogo/productos?idModelo=${base.idModelo}`);
    expect(byModel.body.data.map((p) => p.id_producto)).toContain(id);
    const filters = await request(app).get('/api/catalogo/filtros');
    expect(filters.body.data.modelos).toContainEqual({ id: base.idModelo, nombre: `Modelo comp ${suffix}` });

    const inUse = await request(app).delete(`/api/modelos/${base.idModelo}`).set(authorize);
    expect(inUse.status).toBe(409);
  });

  test('CU-2: create admin/vendor, edit, deactivate blocks login, self-guard', async () => {
    const authorize = await loginAdministrator();
    const me = await request(app).get('/api/auth/me').set(authorize);

    const vendor = await request(app).post('/api/usuarios').set(authorize).send({
      nombreUsuario: `vend.${suffix}`,
      correo: `vend.${suffix}@example.test`,
      contrasena: password,
      roles: ['VENDEDOR'],
    });
    expect(vendor.status).toBe(201);
    const vendorId = vendor.body.data.id_usuario;

    const duplicateEmail = await request(app).post('/api/usuarios').set(authorize).send({
      nombreUsuario: `vend2.${suffix}`,
      correo: `vend.${suffix}@example.test`,
      contrasena: password,
      roles: ['VENDEDOR'],
    });
    expect(duplicateEmail.status).toBe(409);

    const edited = await request(app).patch(`/api/usuarios/${vendorId}`).set(authorize).send({
      nombreUsuario: `vendedor.${suffix}`,
      roles: ['ADMINISTRADOR'],
    });
    expect(edited.status).toBe(200);
    expect(edited.body.data.roles).toEqual(['ADMINISTRADOR']);

    // An administrator (not developer) cannot edit another administrator.
    const blocked = await request(app).patch(`/api/usuarios/${vendorId}`).set(authorize).send({ activo: false });
    expect(blocked.status).toBe(403);

    const seller = await request(app).post('/api/usuarios').set(authorize).send({
      nombreUsuario: `seller.${suffix}`,
      correo: `seller.${suffix}@example.test`,
      contrasena: password,
      roles: ['VENDEDOR'],
    });
    const off = await request(app).patch(`/api/usuarios/${seller.body.data.id_usuario}`).set(authorize).send({ activo: false });
    expect(off.status).toBe(200);
    expect(off.body.data.activo).toBe(false);
    const login = await request(app).post('/api/auth/login').send({ identificador: `seller.${suffix}@example.test`, contrasena: password });
    expect(login.status).toBe(401);

    const self = await request(app).patch(`/api/usuarios/${me.body.data.id}`).set(authorize).send({ activo: false });
    expect(self.status).toBe(422);
  });

  test('CU-3: bitácora stores IP and table, and filters server-side', async () => {
    const authorize = await loginAdministrator();
    const created = await request(app)
      .post('/api/categorias')
      .set(authorize)
      .set('X-Forwarded-For', '203.0.113.7')
      .send({ nombre: `Cat audit ${suffix}` });
    expect(created.status).toBe(201);

    const logs = await request(app).get('/api/bitacora?tabla=categoria&accion=CATEGORIA_CREADA').set(authorize);
    expect(logs.status).toBe(200);
    const row = logs.body.data.find((item) => item.objeto_afectado === created.body.data.id_categoria);
    expect(row).toMatchObject({ tabla_afectada: 'categoria', direccion_ip: '203.0.113.7', resultado: 'OK' });
    expect(logs.body.data.every((item) => item.tabla_afectada === 'categoria')).toBe(true);

    const logins = await request(app).get('/api/bitacora?accion=INICIO_SESION&limite=5').set(authorize);
    expect(logins.body.data.length).toBeGreaterThan(0);

    const badDate = await request(app).get('/api/bitacora?desde=ayer').set(authorize);
    expect(badDate.status).toBe(400);
  });
});
