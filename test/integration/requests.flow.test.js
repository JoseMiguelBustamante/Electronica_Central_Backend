import request from 'supertest';
import { beforeAll, describe, expect, test } from 'vitest';
import { createApp } from '../../src/app.js';
import { query } from '../../src/lib/database.js';

const app = createApp();
const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`;

const ensureRequestsPermission = async () => {
  await query(`
    INSERT INTO electronica_az.permiso(codigo, descripcion) VALUES
      ('SOLICITUDES_GESTIONAR', 'Gestionar solicitudes')
    ON CONFLICT (codigo) DO NOTHING
  `);
  await query(`
    INSERT INTO electronica_az.rol_permiso(id_rol, id_permiso)
    SELECT r.id_rol, p.id_permiso
    FROM electronica_az.rol r
    CROSS JOIN electronica_az.permiso p
    WHERE r.nombre IN ('ADMINISTRADOR', 'DESARROLLADOR', 'VENDEDOR')
      AND p.codigo = 'SOLICITUDES_GESTIONAR'
    ON CONFLICT DO NOTHING
  `);
};

const login = async (identificador, contrasena) => {
  const response = await request(app).post('/api/auth/login').send({ identificador, contrasena });
  expect(response.status).toBe(200);
  return response.body.data.token;
};

describe('requests flow with PostgreSQL', () => {
  let adminToken;
  let vendedorToken;
  let clienteToken;
  let otherClienteToken;
  let walkInClientId;
  let ownRequestId;

  beforeAll(async () => {
    await ensureRequestsPermission();
    adminToken = await login(process.env.BOOTSTRAP_ADMIN_EMAIL, process.env.BOOTSTRAP_ADMIN_PASSWORD);

    const vendor = await request(app).post('/api/usuarios').set('Authorization', `Bearer ${adminToken}`).send({
      nombreUsuario: `vend.req.${suffix}`,
      correo: `vend.req.${suffix}@example.test`,
      contrasena: 'ClaveVendedorSegura123',
      roles: ['VENDEDOR'],
    });
    expect(vendor.status).toBe(201);
    vendedorToken = await login(`vend.req.${suffix}@example.test`, 'ClaveVendedorSegura123');

    const walkIn = await request(app).post('/api/clientes').set('Authorization', `Bearer ${adminToken}`).send({
      nombre: `WalkIn Req ${suffix}`,
      documento: `DOC-REQ-${suffix}`,
    });
    expect(walkIn.status).toBe(201);
    walkInClientId = walkIn.body.data.id_cliente;

    const reg = await request(app).post('/api/auth/registro').send({
      nombreUsuario: `cli.req.${suffix}`,
      correo: `cli.req.${suffix}@example.test`,
      contrasena: 'ClaveDePruebaSegura123',
      nombre: `Cliente Req ${suffix}`,
    });
    expect(reg.status).toBe(201);
    clienteToken = await login(`cli.req.${suffix}@example.test`, 'ClaveDePruebaSegura123');

    const other = await request(app).post('/api/auth/registro').send({
      nombreUsuario: `cli2.req.${suffix}`,
      correo: `cli2.req.${suffix}@example.test`,
      contrasena: 'ClaveDePruebaSegura123',
      nombre: `Cliente2 Req ${suffix}`,
    });
    expect(other.status).toBe(201);
    otherClienteToken = await login(`cli2.req.${suffix}@example.test`, 'ClaveDePruebaSegura123');
  });

  test('cliente creates own request; staff creates for walk-in; admin attends; vendor cannot attend', async () => {
    const own = await request(app)
      .post('/api/solicitudes')
      .set('Authorization', `Bearer ${clienteToken}`)
      .send({
        descripcionProducto: `Modulo WiFi ${suffix}`,
        cantidad: 2,
      });
    expect(own.status).toBe(201);
    expect(own.body.data.estado).toBe('PENDIENTE');
    ownRequestId = own.body.data.idSolicitud;

    const stockCheck = await query(
      'SELECT count(*)::int AS total FROM electronica_az.movimiento_inventario WHERE motivo LIKE $1',
      [`%${suffix}%`],
    );
    expect(stockCheck.rows[0].total).toBe(0);

    const staffCreate = await request(app)
      .post('/api/solicitudes')
      .set('Authorization', `Bearer ${vendedorToken}`)
      .send({
        descripcionProducto: `Arduino ${suffix}`,
        cantidad: 1,
        idCliente: walkInClientId,
      });
    expect(staffCreate.status).toBe(201);

    const otherList = await request(app)
      .get('/api/solicitudes')
      .set('Authorization', `Bearer ${otherClienteToken}`);
    expect(otherList.status).toBe(200);
    expect(otherList.body.data.some((row) => row.idSolicitud === ownRequestId)).toBe(false);

    const otherGet = await request(app)
      .get(`/api/solicitudes/${ownRequestId}`)
      .set('Authorization', `Bearer ${otherClienteToken}`);
    expect(otherGet.status).toBe(403);

    const vendorAttend = await request(app)
      .patch(`/api/solicitudes/${ownRequestId}/estado`)
      .set('Authorization', `Bearer ${vendedorToken}`)
      .send({ estado: 'ATENDIDA' });
    expect(vendorAttend.status).toBe(403);

    const adminAttend = await request(app)
      .patch(`/api/solicitudes/${ownRequestId}/estado`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ estado: 'ATENDIDA' });
    expect(adminAttend.status).toBe(200);
    expect(adminAttend.body.data.estado).toBe('ATENDIDA');

    const reattend = await request(app)
      .patch(`/api/solicitudes/${ownRequestId}/estado`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ estado: 'CANCELADA' });
    expect(reattend.status).toBe(422);
  });
});
