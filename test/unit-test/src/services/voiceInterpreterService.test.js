import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { interpretarInstruccionReporte } from '../../../../src/services/voiceInterpreterService.js';
import { errorCodes } from '../../../../src/config/errorCodes.js';

vi.mock('../../../../src/repositories/configuracionRepository.js', () => ({ obtenerValor: vi.fn() }));
vi.mock('../../../../src/lib/logger.js', () => ({ logger: { warn: vi.fn() } }));
import { obtenerValor } from '../../../../src/repositories/configuracionRepository.js';
import { logger } from '../../../../src/lib/logger.js';

const period = { tipo: 'ventas', desde: '2026-11-01', hasta: '2026-11-22' };
const reply = (content) => ({ ok: true, json: async () => ({ choices: [{ message: { content } }] }) });
let fetchMock;

beforeEach(() => {
  vi.clearAllMocks();
  obtenerValor.mockResolvedValue({ rows: [] });
  vi.stubEnv('NAN_BUILDERS_API_KEY', 'test-key');
  vi.stubEnv('NAN_BUILDERS_BASE_URL', 'https://example.test/v1/');
  vi.stubEnv('NAN_BUILDERS_MODEL', 'test-model');
  fetchMock = vi.fn().mockResolvedValue(reply(JSON.stringify(period)));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('interpretarInstruccionReporte', () => {
  test('database model overrides env and is resolved again on every request', async () => {
    obtenerValor.mockResolvedValueOnce({ rows: [{ valor: 'deepseek-v4-flash' }] })
      .mockResolvedValueOnce({ rows: [{ valor: 'another-model' }] });
    expect(await interpretarInstruccionReporte('ventas hoy')).toEqual(period);
    expect(await interpretarInstruccionReporte('ventas hoy')).toEqual(period);
    expect(obtenerValor).toHaveBeenNthCalledWith(1, 'modelo_ia');
    expect(obtenerValor).toHaveBeenNthCalledWith(2, 'modelo_ia');
    expect(fetchMock.mock.calls.map(([, options]) => JSON.parse(options.body).model))
      .toEqual(['deepseek-v4-flash', 'another-model']);
  });
  test('missing database row uses env model', async () => {
    expect(await interpretarInstruccionReporte('ventas hoy')).toEqual(period);
    expect(obtenerValor).toHaveBeenCalledWith('modelo_ia');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).model).toBe('test-model');
  });
  test('database read failure logs warning and still fetches using env model', async () => {
    obtenerValor.mockRejectedValue(new Error('configuration table missing'));
    expect(await interpretarInstruccionReporte('ventas hoy')).toEqual(period);
    expect(logger.warn).toHaveBeenCalledWith('voice_model_config_unavailable', { message: 'configuration table missing' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).model).toBe('test-model');
  });
  test('builds a valid object, authorization, model and call-time La Paz date', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-23T02:00:00Z'));
    expect(await interpretarInstruccionReporte('ventas este mes')).toEqual(period);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://example.test/v1/chat/completions');
    expect(options.headers.Authorization).toBe('Bearer test-key');
    const body = JSON.parse(options.body);
    expect(body).toMatchObject({ model: 'test-model', temperature: 0, max_tokens: 4000 });
    expect(body.messages[0].content).toContain('2026-11-22');
    for (const phrase of ['America/La_Paz', 'ventas', 'ganancias', 'inventario', 'rotacion', 'esta semana', 'lunes', 'este mes', 'este año', 'hoy', 'ayer', 'últimos 30 días', 'explícitas']) {
      expect(body.messages[0].content).toContain(phrase);
    }
    expect(body.messages[1]).toEqual({ role: 'user', content: 'ventas este mes' });
    vi.setSystemTime(new Date('2026-11-24T02:00:00Z'));
    await interpretarInstruccionReporte('ventas hoy');
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).messages[0].content).toContain('2026-11-23');
  });
  test('includes context JSON and today in messages for relative follow-ups', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-24T02:00:00Z'));
    const contexto = { tipo: 'ventas', desde: '2026-11-01', hasta: '2026-11-23' };
    await interpretarInstruccionReporte('y ganancias de ese mes?', contexto);
    const { messages, max_tokens } = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(max_tokens).toBe(4000);
    expect(messages[0].content).toContain('Hoy es 2026-11-23 en America/La_Paz');
    expect(messages[0].content).toContain('SOLO un objeto JSON');
    expect(messages).toContainEqual(expect.objectContaining({
      role: 'user', content: expect.stringContaining(JSON.stringify(contexto)),
    }));
    const contextMessage = messages.find(({ content }) => content.includes('Contexto del último reporte pedido:'));
    for (const phrase of ['el mes anterior', 'esa misma semana', 'ese trimestre', 'el año pasado', 'y ganancias de ese mes?']) {
      expect(contextMessage.content).toContain(phrase);
    }
    expect(messages.at(-1)).toEqual({ role: 'user', content: 'y ganancias de ese mes?' });
  });
  test('accepts el mes anterior resolved against the supplied context', async () => {
    const contexto = { tipo: 'ventas', desde: '2026-11-01', hasta: '2026-11-23' };
    const previousMonth = { tipo: 'ventas', desde: '2026-10-01', hasta: '2026-10-31' };
    fetchMock.mockResolvedValue(reply(JSON.stringify(previousMonth)));
    expect(await interpretarInstruccionReporte('el mes anterior', contexto)).toEqual(previousMonth);
  });
  test('accepts a changed report type while preserving the contextual period', async () => {
    const changedType = { ...period, tipo: 'ganancias' };
    fetchMock.mockResolvedValue(reply(JSON.stringify(changedType)));
    expect(await interpretarInstruccionReporte('y ganancias de ese mes?', period)).toEqual(changedType);
  });
  test.each([
    { ...period, tipo: 'compras' },
    { ...period, desde: '2026-02-30' },
    { ...period, hasta: '23/11/2026' },
    { tipo: 'ventas', desde: '2026-11-01' },
    { ...period, fechaCorte: 'invalid' },
  ])('rejects invalid context before fetch: %j', async (contexto) => {
    await expect(interpretarInstruccionReporte('el mes anterior', contexto)).rejects.toMatchObject({
      code: errorCodes.VALIDATION_ERROR, statusCode: 400,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  test('no-context calls omit the context marker even after a contextual call', async () => {
    await interpretarInstruccionReporte('el mes anterior', period);
    await interpretarInstruccionReporte('ventas hoy');
    const { messages } = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(messages).toHaveLength(2);
    expect(JSON.stringify(messages)).not.toContain('Contexto del último reporte pedido:');
    expect(messages[1]).toEqual({ role: 'user', content: 'ventas hoy' });
  });
  test('uses default base URL and model', async () => {
    vi.stubEnv('NAN_BUILDERS_BASE_URL', undefined);
    vi.stubEnv('NAN_BUILDERS_MODEL', undefined);
    await interpretarInstruccionReporte('ventas hoy');
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.nan.builders/v1/chat/completions');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).model).toBe('glm5.3-flash');
  });
  test('parses fenced json', async () => {
    fetchMock.mockResolvedValue(reply(`\`\`\`json\n${JSON.stringify(period)}\n\`\`\``));
    expect(await interpretarInstruccionReporte('ventas este mes')).toEqual(period);
  });
  test.each(['not JSON', '{}', JSON.stringify({ ...period, tipo: 'otro' }), JSON.stringify({ ...period, desde: '' }), JSON.stringify({ ...period, hasta: '2026-02-30' }), JSON.stringify({ tipo: 'inventario' })])('invalid JSON or Zod payload -> AI_INVALID_RESPONSE: %s', async (content) => {
    fetchMock.mockResolvedValue(reply(content));
    await expect(interpretarInstruccionReporte('ventas hoy')).rejects.toMatchObject({ code: errorCodes.AI_INVALID_RESPONSE, statusCode: 502 });
  });
  test('fetch rejection -> AI_UNAVAILABLE', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    await expect(interpretarInstruccionReporte('ventas hoy')).rejects.toMatchObject({ code: errorCodes.AI_UNAVAILABLE, statusCode: 503 });
  });
  test('HTTP upstream failure -> AI_UNAVAILABLE', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    await expect(interpretarInstruccionReporte('ventas hoy')).rejects.toMatchObject({ code: errorCodes.AI_UNAVAILABLE, statusCode: 503 });
  });
  test('30s timeout -> AI_UNAVAILABLE and aborts fetch', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation((_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('aborted')));
    }));
    const assertion = expect(interpretarInstruccionReporte('ventas hoy')).rejects.toMatchObject({ code: errorCodes.AI_UNAVAILABLE, statusCode: 503 });
    await vi.advanceTimersByTimeAsync(30000);
    await assertion;
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
  });
  test('missing key -> AI_NOT_CONFIGURED without fetch', async () => {
    vi.stubEnv('NAN_BUILDERS_API_KEY', '  ');
    await expect(interpretarInstruccionReporte('ventas hoy')).rejects.toMatchObject({ code: errorCodes.AI_NOT_CONFIGURED, statusCode: 503 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  test('desde > hasta -> VALIDATION_ERROR', async () => {
    fetchMock.mockResolvedValue(reply(JSON.stringify({ ...period, desde: '2026-12-01' })));
    await expect(interpretarInstruccionReporte('ventas hoy')).rejects.toMatchObject({ code: errorCodes.VALIDATION_ERROR, statusCode: 400 });
  });
  test.each([
    ['2024-01-01', '2026-01-01'],
    ['2024-02-29', '2026-02-28'],
  ])('clamps max 2 calendar years from %s', async (desde, hasta) => {
    fetchMock.mockResolvedValue(reply(JSON.stringify({ ...period, desde, hasta: '2030-01-01' })));
    expect(await interpretarInstruccionReporte('ventas históricas')).toEqual({ ...period, desde, hasta });
  });
  test.each(['ventas', 'ganancias', 'rotacion'])('preserves valid %s periods at exactly 2 years', async (tipo) => {
    const result = { tipo, desde: '2024-01-01', hasta: '2026-01-01', titulo: 'Reporte' };
    fetchMock.mockResolvedValue(reply(JSON.stringify(result)));
    expect(await interpretarInstruccionReporte('reporte')).toEqual(result);
  });
  test('accepts inventory with only fechaCorte', async () => {
    const result = { tipo: 'inventario', fechaCorte: '2026-11-22' };
    fetchMock.mockResolvedValue(reply(JSON.stringify(result)));
    expect(await interpretarInstruccionReporte('inventario hoy')).toEqual(result);
  });
});
