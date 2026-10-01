import request from 'supertest';
import { describe, expect, test } from 'vitest';
import { createApp } from '../../src/app.js';

const app = createApp();
const suffix = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
const originalPassword = 'ClaveOriginalDePrueba123';
const temporaryPassword = 'ClaveTemporalDePrueba123';
const newPassword = 'ClaveNuevaDePrueba123';

describe('security flow with PostgreSQL', () => {
  test('enforces password change after an administrator reset and writes audit data', async () => {
    const registered = await request(app).post('/api/auth/registro').send({ nombreUsuario: `reset.${suffix}`, correo: `reset.${suffix}@example.test`, contrasena: originalPassword, nombre: 'Cliente Reset' });
    expect(registered.status).toBe(201);
    const userId = registered.body.data.usuario.id_usuario;

    const adminLogin = await request(app).post('/api/auth/login').send({ identificador: process.env.BOOTSTRAP_ADMIN_USERNAME, contrasena: process.env.BOOTSTRAP_ADMIN_PASSWORD });
    expect(adminLogin.status).toBe(200);
    const adminToken = adminLogin.body.data.token;

    const reset = await request(app).post(`/api/usuarios/${userId}/restablecer`).set('Authorization', `Bearer ${adminToken}`).send({ contrasenaTemporal: temporaryPassword });
    expect(reset.status).toBe(200);

    const userLogin = await request(app).post('/api/auth/login').send({ identificador: `reset.${suffix}@example.test`, contrasena: temporaryPassword });
    expect(userLogin.status).toBe(200);
    const userToken = userLogin.body.data.token;

    const blocked = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${userToken}`);
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe('FB001');

    const changed = await request(app).post('/api/auth/cambiar-contrasena').set('Authorization', `Bearer ${userToken}`).send({ contrasenaActual: temporaryPassword, contrasenaNueva: newPassword });
    expect(changed.status).toBe(200);

    const logs = await request(app).get('/api/bitacora').set('Authorization', `Bearer ${adminToken}`);
    expect(logs.status).toBe(200);
    expect(logs.body.data.some((item) => item.accion === 'ACCESO_RESTABLECIDO' && item.objeto_afectado === userId)).toBe(true);
  });
});
