import request from 'supertest';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

// Keep real HTTP routing, validation, authentication and permission guards, without DB writes.
vi.mock('../../src/services/authService.js', async (importOriginal) => ({
  ...await importOriginal(),
  getSessionAuthService: vi.fn(async (token) => ({
    usuario: {
      roles: [token === 'admin-session' ? 'ADMINISTRADOR' : 'VENDEDOR'],
      permisos: token === 'admin-session' ? ['REPORTES_CONSULTAR'] : [],
      cambioContrasenaObligatorio: false,
    },
  })),
}));
import { createApp } from '../../src/app.js';
import { errorCodes } from '../../src/config/errorCodes.js';

const app = createApp();
let fetchMock;
const result = { tipo: 'ventas', desde: '2026-11-01', hasta: '2026-11-22' };
beforeEach(() => {
  vi.stubEnv('NAN_BUILDERS_API_KEY', 'test-key');
  fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(result) } }] }) });
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

const post = (texto, token = 'admin-session') => request(app)
  .post('/api/reportes/interpretar').set('Authorization', `Bearer ${token}`).send({ texto });

describe('report voice HTTP flow (session service isolated)', () => {
  test('401 without token', async () => {
    const response = await request(app).post('/api/reportes/interpretar').send({ texto: 'ventas hoy' });
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe(errorCodes.MISSING_TOKEN);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  test('403 VENDEDOR without REPORTES_CONSULTAR', async () => {
    const response = await post('ventas hoy', 'vendor-session');
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe(errorCodes.ACCESS_DENIED);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  test.each(['ab', ' '.repeat(3), 'a'.repeat(501)])('400 invalid texto length', async (texto) => {
    const response = await post(texto);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe(errorCodes.VALIDATION_ERROR);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  test.each(['ventas', 'ganancias', 'inventario', 'rotacion-demanda'])('preserves existing GET %s validation and permissions without invoking AI', async (type) => {
    const denied = await request(app).get(`/api/reportes/${type}`).set('Authorization', 'Bearer vendor-session');
    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe(errorCodes.ACCESS_DENIED);
    const invalid = await request(app).get(`/api/reportes/${type}`).set('Authorization', 'Bearer admin-session');
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe(errorCodes.VALIDATION_ERROR);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  test('200 parsed LLM object through HTTP boundary', async () => {
    const response = await post('ventas este mes');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: result });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  test('200 contextual follow-up forwards context and returns the changed report type', async () => {
    const contexto = { tipo: 'ventas', desde: '2026-11-01', hasta: '2026-11-23', fechaCorte: '2026-11-23' };
    const followUp = { tipo: 'ganancias', desde: contexto.desde, hasta: contexto.hasta };
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(followUp) } }] }) });
    const response = await request(app).post('/api/reportes/interpretar')
      .set('Authorization', 'Bearer admin-session').send({ texto: 'y ganancias de ese mes?', contexto });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: followUp });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).messages).toContainEqual(expect.objectContaining({
      role: 'user', content: expect.stringContaining(JSON.stringify(contexto)),
    }));
  });
  test('400 invalid context tipo without invoking AI', async () => {
    const response = await request(app).post('/api/reportes/interpretar')
      .set('Authorization', 'Bearer admin-session')
      .send({ texto: 'el mes anterior', contexto: { ...result, tipo: 'compras' } });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe(errorCodes.VALIDATION_ERROR);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  test.each([
    ['missing key', 503, 'AI_NOT_CONFIGURED'],
    ['offline', 503, 'AI_UNAVAILABLE'],
    ['bad JSON', 502, 'AI_INVALID_RESPONSE'],
    ['reversed dates', 400, 'VALIDATION_ERROR'],
  ])('%s maps service error at HTTP boundary', async (mode, status, code) => {
    if (mode === 'missing key') vi.stubEnv('NAN_BUILDERS_API_KEY', '');
    if (mode === 'offline') fetchMock.mockRejectedValue(new Error('offline'));
    if (mode === 'bad JSON') fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
    if (mode === 'reversed dates') fetchMock.mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ ...result, desde: '2027-01-01' }) } }] }) });
    const response = await post('ventas hoy');
    expect(response.status).toBe(status);
    expect(response.body.error.code).toBe(errorCodes[code]);
  });
});
