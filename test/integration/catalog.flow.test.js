import request from 'supertest';
import { describe, expect, test } from 'vitest';
import { createApp } from '../../src/app.js';
import { query } from '../../src/lib/database.js';

const app = createApp();
const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`;
const credentials = {
  identificador: process.env.BOOTSTRAP_ADMIN_EMAIL,
  contrasena: process.env.BOOTSTRAP_ADMIN_PASSWORD,
};

const loginAdministrator = async () => {
  const response = await request(app).post('/api/auth/login').send(credentials);
  expect(response.status).toBe(200);
  return response.body.data.token;
};

describe('catalog flow with PostgreSQL', () => {
  test('creates an atomic product and publishes a safe projection', async () => {
    const token = await loginAdministrator();
    const authorize = { Authorization: `Bearer ${token}` };

    const category = await request(app).post('/api/categorias').set(authorize).send({ nombre: `Categoria ${suffix}` });
    const brand = await request(app).post('/api/marcas').set(authorize).send({ nombre: `Marca ${suffix}` });
    const unit = await request(app).post('/api/unidades').set(authorize).send({
      nombre: `Unidad ${suffix}`,
      simbolo: `u${suffix}`,
    });
    const location = await request(app).post('/api/ubicaciones').set(authorize).send({ codigo: `A-${suffix}`, pasillo: 'A', estante: '1' });
    const model = await request(app).post('/api/modelos').set(authorize).send({
      nombre: `Modelo ${suffix}`,
      idMarca: brand.body.data.id_marca,
    });
    expect([category, brand, unit, location, model].every((response) => response.status === 201)).toBe(true);

    const product = await request(app).post('/api/productos').set(authorize).send({
      codigo: `SKU-${suffix}`,
      nombre: `Producto ${suffix}`,
      precioVenta: 25.5,
      idCategoria: category.body.data.id_categoria,
      idUnidadMedida: unit.body.data.id_unidad_medida,
      idUbicacion: location.body.data.id_ubicacion,
      idMarca: brand.body.data.id_marca,
      idModelo: model.body.data.id_modelo,
    });
    expect(product.status).toBe(201);

    const existence = await query(
      'SELECT stock_actual, stock_minimo FROM electronica_az.existencia WHERE id_producto = $1',
      [product.body.data.id_producto],
    );
    expect(existence.rows).toEqual([{ stock_actual: '0.0000', stock_minimo: '0.0000' }]);

    const publicList = await request(app).get(`/api/catalogo/productos?buscar=SKU-${suffix}`);
    expect(publicList.status).toBe(200);
    expect(publicList.body.meta.total).toBe(1);
    expect(publicList.body.data[0]).toMatchObject({ codigo: `SKU-${suffix}`, disponibilidad: 'NO_DISPONIBLE' });
    expect(publicList.body.data[0]).not.toHaveProperty('stock_actual');
    expect(publicList.body.data[0]).not.toHaveProperty('costo_promedio');
    expect(publicList.body.data[0]).not.toHaveProperty('id_ubicacion');

    const publicDetail = await request(app).get(`/api/catalogo/productos/${product.body.data.id_producto}`);
    expect(publicDetail.status).toBe(200);
    expect(publicDetail.body.data).not.toHaveProperty('stock_actual');

    const filters = await request(app).get('/api/catalogo/filtros');
    expect(filters.status).toBe(200);
    expect(filters.body.data.categorias).toContainEqual({
      id: category.body.data.id_categoria,
      nombre: `Categoria ${suffix}`,
    });

    const compatibility = await request(app)
      .post(`/api/productos/${product.body.data.id_producto}/compatibilidades`)
      .set(authorize)
      .send({ idModelo: model.body.data.id_modelo });
    expect(compatibility.status).toBe(201);

    const deletedCompatibility = await request(app)
      .delete(`/api/productos/${product.body.data.id_producto}/compatibilidades/${model.body.data.id_modelo}`)
      .set(authorize);
    expect(deletedCompatibility.status).toBe(200);

    const deactivated = await request(app)
      .patch(`/api/productos/${product.body.data.id_producto}`)
      .set(authorize)
      .send({ activo: false });
    expect(deactivated.status).toBe(200);

    const absentProduct = await request(app).get(`/api/catalogo/productos?buscar=SKU-${suffix}`);
    expect(absentProduct.body.meta.total).toBe(0);
  });

  test('rejects a product with a model from a different brand without insertion', async () => {
    const token = await loginAdministrator();
    const authorize = { Authorization: `Bearer ${token}` };
    const category = await request(app).post('/api/categorias').set(authorize).send({ nombre: `Categoria B ${suffix}` });
    const brandA = await request(app).post('/api/marcas').set(authorize).send({ nombre: `Marca A ${suffix}` });
    const brandB = await request(app).post('/api/marcas').set(authorize).send({ nombre: `Marca B ${suffix}` });
    const unit = await request(app).post('/api/unidades').set(authorize).send({
      nombre: `Unidad B ${suffix}`,
      simbolo: `b${suffix}`,
    });
    const location = await request(app).post('/api/ubicaciones').set(authorize).send({ codigo: `B-${suffix}`, pasillo: 'B', estante: '1' });
    const model = await request(app).post('/api/modelos').set(authorize).send({
      nombre: `Modelo B ${suffix}`,
      idMarca: brandA.body.data.id_marca,
    });

    const response = await request(app).post('/api/productos').set(authorize).send({
      codigo: `INVALID-${suffix}`,
      nombre: `Invalido ${suffix}`,
      precioVenta: 1,
      idCategoria: category.body.data.id_categoria,
      idUnidadMedida: unit.body.data.id_unidad_medida,
      idUbicacion: location.body.data.id_ubicacion,
      idMarca: brandB.body.data.id_marca,
      idModelo: model.body.data.id_modelo,
    });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('UE001');
    const publicDetail = await request(app).get(`/api/catalogo/productos?buscar=INVALID-${suffix}`);
    expect(publicDetail.body.meta.total).toBe(0);
  });
});
