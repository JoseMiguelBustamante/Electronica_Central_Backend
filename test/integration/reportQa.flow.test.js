import request from 'supertest';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../src/services/authService.js', async (importOriginal) => ({
  ...await importOriginal(),
  getSessionAuthService: vi.fn(async (token) => ({ usuario: {
    roles: [token === 'admin-session' ? 'ADMINISTRADOR' : 'VENDEDOR'],
    permisos: token === 'admin-session' ? ['REPORTES_CONSULTAR'] : [],
    cambioContrasenaObligatorio: false,
  } })),
}));
vi.mock('../../src/repositories/configuracionRepository.js', () => ({ obtenerValor: vi.fn(), guardarValor: vi.fn() }));
import { obtenerValor, guardarValor } from '../../src/repositories/configuracionRepository.js';
import { createApp } from '../../src/app.js';
import { errorCodes } from '../../src/config/errorCodes.js';

const app = createApp();
const informe = { tipo: 'ventas', periodo: { desde: '2026-11-01', hasta: '2026-11-22', zona: 'America/La_Paz' }, resumen: { total: 1500 }, items: [{ idVenta: 'v1', total: 500 }, { idVenta: 'v2', total: 1000 }] };
const body = { pregunta: '¿Cuál es el total?', informe };
const result = { respuesta: 'El total es Bs 1.500,00.', destacados: [] };
let fetchMock;
beforeEach(() => {
  vi.clearAllMocks();
  obtenerValor.mockResolvedValue({ rows: [] });
  vi.stubEnv('NAN_BUILDERS_API_KEY', 'test-key');
  fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(result) } }] }) });
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
const post = (payload = body, token = 'admin-session') => {
  const call = request(app).post('/api/reportes/preguntar');
  if (token) call.set('Authorization', `Bearer ${token}`);
  return call.send(payload);
};

describe('report QA HTTP flow S12', () => {
  test.each([[null, 401, 'MISSING_TOKEN'], ['vendor-session', 403, 'ACCESS_DENIED']])('%s authorization -> %s without model call', async (token, status, code) => {
    const response = await post(body, token);
    expect(response.status).toBe(status);
    expect(response.body.error.code).toBe(errorCodes[code]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(obtenerValor).not.toHaveBeenCalled();
    expect(guardarValor).not.toHaveBeenCalled();
  });
  test.each([
    { ...body, pregunta: 'ab' }, { ...body, pregunta: '   ' }, { ...body, pregunta: 'a'.repeat(501) },
    { ...body, informe: { ...informe, items: Array(61).fill({ idVenta: 'v1' }) } },
    { ...body, desconocido: true }, { ...body, informe: { ...informe, desconocido: true } },
    { ...body, informe: { ...informe, items: [{ nested: { total: 1 } }] } },
    { ...body, informe: { ...informe, resumen: { total: null } } },
    { ...body, historial: Array(6).fill({ pregunta: '¿Total?', respuesta: 'Uno.' }) },
    { ...body, historial: [{ pregunta: 'ab', respuesta: 'Uno.' }] },
    { ...body, historial: [{ pregunta: '¿Total?', respuesta: 'a'.repeat(1001) }] },
  ])('400 invalid payload before fetch: %j', async (payload) => {
    const response = await post(payload);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe(errorCodes.VALIDATION_ERROR);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(obtenerValor).not.toHaveBeenCalled();
    expect(guardarValor).not.toHaveBeenCalled();
  });
  test('200 happy path forwards trimmed question and informe through HTTP boundary', async () => {
    const response = await post({ ...body, pregunta: ` ${body.pregunta} ` });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: result });
    const { messages } = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(messages.at(-1).content).toBe(body.pregunta);
    expect(JSON.stringify(messages)).toContain(JSON.stringify(informe).replaceAll('"', '\\"'));
    expect(guardarValor).not.toHaveBeenCalled();
  });
  test('200 specific row question returns mocked most expensive sale and highlighted identifier', async () => {
    const rowAnswer = { respuesta: 'La venta más cara fue v2, por Bs 1.000,00.', destacados: ['v2'] };
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(rowAnswer) } }] }) });
    const response = await post({ ...body, pregunta: '¿Cuál fue la venta más cara?' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: rowAnswer });
  });
  test('200 accepts 60 items, five history turns and nullable inventory dates', async () => {
    const response = await post({ pregunta: 'abc', informe: { tipo: 'inventario', periodo: null, fechaCorte: null, items: Array(60).fill({ codigo: 'p1', stock: 1, alerta: false, nota: null }) }, historial: Array(5).fill({ pregunta: 'abc', respuesta: 'a' }) });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: result });
  });
  test.each([['key', 503, 'AI_NOT_CONFIGURED'], ['offline', 503, 'AI_UNAVAILABLE'], ['invalid', 502, 'AI_INVALID_RESPONSE']])('%s maps AI error at HTTP boundary', async (mode, status, code) => {
    if (mode === 'key') vi.stubEnv('NAN_BUILDERS_API_KEY', '');
    if (mode === 'offline') fetchMock.mockRejectedValue(new Error('offline'));
    if (mode === 'invalid') fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
    const response = await post();
    expect(response.status).toBe(status);
    expect(response.body.error.code).toBe(errorCodes[code]);
  });
});
