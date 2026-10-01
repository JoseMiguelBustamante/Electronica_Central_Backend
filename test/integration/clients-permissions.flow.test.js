import request from 'supertest';
import { describe, expect, test } from 'vitest';
import { createApp } from '../../src/app.js';

const app = createApp();
const suffix = `${Date.now()}${Math.floor(Math.random() * 10000)}`;

describe('clients and persisted permissions with PostgreSQL', () => {
  test('allows an administrator to create a walk-in client, rejects duplicate document and blocks a customer', async () => {
    const adminLogin = await request(app).post('/api/auth/login').send({ identificador: process.env.BOOTSTRAP_ADMIN_USERNAME, contrasena: process.env.BOOTSTRAP_ADMIN_PASSWORD });
    expect(adminLogin.status).toBe(200);
    const adminToken = adminLogin.body.data.token;

    const createdUser = await request(app).post('/api/usuarios').set('Authorization', `Bearer ${adminToken}`).send({ nombreUsuario: `vendedor.${suffix}`, correo: `vendedor.${suffix}@example.test`, contrasena: 'ClaveVendedorSegura123', roles: ['VENDEDOR'] });
    expect(createdUser.status).toBe(201);

    const clientLogin = await request(app).post('/api/auth/registro').send({ nombreUsuario: `permission.${suffix}`, correo: `permission.${suffix}@example.test`, contrasena: 'ClaveDePruebaSegura123', nombre: 'Cliente Permisos' });
    expect(clientLogin.status).toBe(201);
    const login = await request(app).post('/api/auth/login').send({ identificador: `permission.${suffix}@example.test`, contrasena: 'ClaveDePruebaSegura123' });
    const customerToken = login.body.data.token;

    const denied = await request(app).get('/api/clientes').set('Authorization', `Bearer ${customerToken}`);
    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe('FB001');

    const document = `DOC-${suffix}`;
    const created = await request(app).post('/api/clientes').set('Authorization', `Bearer ${adminToken}`).send({ nombre: 'Cliente Presencial', documento: document });
    expect(created.status).toBe(201);

    const duplicate = await request(app).post('/api/clientes').set('Authorization', `Bearer ${adminToken}`).send({ nombre: 'Otro Cliente', documento: document });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('CF001');
  });
});
