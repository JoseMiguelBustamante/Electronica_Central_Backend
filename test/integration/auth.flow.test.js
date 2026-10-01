import request from 'supertest';
import { describe, expect, test } from 'vitest';
import { createApp } from '../../src/app.js';

const app = createApp();
const suffix = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
const password = 'ClaveDePruebaSegura123';
const payload = {
  nombreUsuario: `cliente.${suffix}`,
  correo: `cliente.${suffix}@example.test`,
  contrasena: password,
  nombre: 'Cliente de Integracion',
};

describe('auth flow with PostgreSQL', () => {
  test('registers, logs in, reads profile, logs out and rejects the revoked token', async () => {
    const registered = await request(app).post('/api/auth/registro').send(payload);
    expect(registered.status).toBe(201);
    expect(registered.body.data.usuario).not.toHaveProperty('hash_contrasena');

    const login = await request(app).post('/api/auth/login').send({ identificador: payload.correo, contrasena: password });
    expect(login.status).toBe(200);
    const token = login.body.data.token;
    expect(typeof token).toBe('string');

    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.data.correo).toBe(payload.correo);

    const logout = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${token}`);
    expect(logout.status).toBe(200);

    const revoked = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(revoked.status).toBe(401);
    expect(revoked.body.error.code).toBe('AU001');
  });

  test('rejects an unauthenticated protected request', async () => {
    const response = await request(app).get('/api/auth/me');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AU003');
  });
});
