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

  test('locks after 3 failed logins and recovers via email token', async () => {
    const localSuffix = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
    const localPassword = 'ClaveDePruebaSegura123';
    const local = {
      nombreUsuario: `lock.${localSuffix}`,
      correo: `lock.${localSuffix}@example.test`,
      contrasena: localPassword,
      nombre: 'Cliente Lockout',
    };

    const registered = await request(app).post('/api/auth/registro').send(local);
    expect(registered.status).toBe(201);

    const fail1 = await request(app).post('/api/auth/login').send({
      identificador: local.correo,
      contrasena: 'ClaveIncorrecta123',
    });
    expect(fail1.status).toBe(401);
    expect(fail1.body.error.details.intentosRestantes).toBe(2);

    const fail2 = await request(app).post('/api/auth/login').send({
      identificador: local.correo,
      contrasena: 'ClaveIncorrecta123',
    });
    expect(fail2.status).toBe(401);
    expect(fail2.body.error.details.intentosRestantes).toBe(1);

    const fail3 = await request(app).post('/api/auth/login').send({
      identificador: local.correo,
      contrasena: 'ClaveIncorrecta123',
    });
    expect(fail3.status).toBe(423);
    expect(fail3.body.error.code).toBe('AU004');
    expect(fail3.body.error.details.minutosBloqueo).toBe(2);
    expect(fail3.body.error.details.nivelBloqueo).toBe(1);

    const whileLocked = await request(app).post('/api/auth/login').send({
      identificador: local.correo,
      contrasena: localPassword,
    });
    expect(whileLocked.status).toBe(423);
    expect(whileLocked.body.error.details.minutosBloqueo).toBe(2);

    // Expire lock window: next cycle should double to 4 minutes.
    const { default: pg } = await import('pg');
    const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    await client.query(
      `UPDATE electronica_az.usuario
       SET bloqueado_hasta = CURRENT_TIMESTAMP - interval '1 second'
       WHERE lower(correo) = lower($1)`,
      [local.correo],
    );
    await client.end();

    const fail4 = await request(app).post('/api/auth/login').send({
      identificador: local.correo,
      contrasena: 'ClaveIncorrecta123',
    });
    expect(fail4.status).toBe(401);
    expect(fail4.body.error.details.intentosRestantes).toBe(2);

    const fail5 = await request(app).post('/api/auth/login').send({
      identificador: local.correo,
      contrasena: 'ClaveIncorrecta123',
    });
    expect(fail5.status).toBe(401);

    const fail6 = await request(app).post('/api/auth/login').send({
      identificador: local.correo,
      contrasena: 'ClaveIncorrecta123',
    });
    expect(fail6.status).toBe(423);
    expect(fail6.body.error.details.minutosBloqueo).toBe(4);
    expect(fail6.body.error.details.nivelBloqueo).toBe(2);

    const recover = await request(app).post('/api/auth/recuperar').send({ correo: local.correo });
    expect(recover.status).toBe(200);
    expect(recover.body.data.enviado).toBe(true);
    expect(typeof recover.body.data.debugToken).toBe('string');

    const weak = await request(app).post('/api/auth/restablecer').send({
      token: recover.body.data.debugToken,
      contrasenaNueva: 'sinmayuscula1',
    });
    expect(weak.status).toBe(400);

    const newPassword = 'NuevaClaveSegura99';
    const reset = await request(app).post('/api/auth/restablecer').send({
      token: recover.body.data.debugToken,
      contrasenaNueva: newPassword,
    });
    expect(reset.status).toBe(200);
    expect(reset.body.data.restablecido).toBe(true);

    const loginAgain = await request(app).post('/api/auth/login').send({
      identificador: local.correo,
      contrasena: newPassword,
    });
    expect(loginAgain.status).toBe(200);
  });

  test('rejects weak passwords on registro', async () => {
    const weak = await request(app).post('/api/auth/registro').send({
      nombreUsuario: `weak.${Date.now()}`,
      correo: `weak.${Date.now()}@example.test`,
      contrasena: 'todominusculas1',
      nombre: 'Cliente Debil',
    });
    expect(weak.status).toBe(400);
  });
});
