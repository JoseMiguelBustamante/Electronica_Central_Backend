import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { preguntarSobreInforme } from '../../../../src/services/reportQaService.js';
import { errorCodes } from '../../../../src/config/errorCodes.js';

vi.mock('../../../../src/repositories/configuracionRepository.js', () => ({ obtenerValor: vi.fn() }));
vi.mock('../../../../src/lib/logger.js', () => ({ logger: { warn: vi.fn() } }));
import { obtenerValor } from '../../../../src/repositories/configuracionRepository.js';

const informe = { tipo: 'ventas', resumen: { total: 1200 }, items: [{ idVenta: 'v1', total: 1200 }] };
const pregunta = '¿Cuál es el total?';
const respuesta = 'El total es Bs 1.200,00.';
const reply = (content) => ({ ok: true, json: async () => ({ choices: [{ message: { content } }] }) });
let fetchMock;
beforeEach(() => {
  vi.clearAllMocks();
  obtenerValor.mockResolvedValue({ rows: [{ valor: 'db-model' }] });
  vi.stubEnv('NAN_BUILDERS_API_KEY', 'test-key');
  vi.stubEnv('NAN_BUILDERS_BASE_URL', 'https://example.test/v1/');
  vi.stubEnv('NAN_BUILDERS_MODEL', 'env-model');
  fetchMock = vi.fn().mockResolvedValue(reply(JSON.stringify({ respuesta })));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
const ask = (extra = {}) => preguntarSobreInforme({ pregunta, informe, ...extra });

describe('preguntarSobreInforme S12', () => {
  test('answers from informe, normalizes missing destacados and uses configured model and grounded prompt', async () => {
    expect(await ask()).toEqual({ respuesta, destacados: [] });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://example.test/v1/chat/completions');
    expect(options.headers.Authorization).toBe('Bearer test-key');
    const body = JSON.parse(options.body);
    expect(body).toMatchObject({ model: 'db-model', temperature: 0, max_tokens: 4000 });
    expect(obtenerValor).toHaveBeenCalledWith('modelo_ia');
    expect(body.messages[0].content).toContain('NUNCA inventes');
    expect(body.messages[0].content).toContain('No se puede responder con los datos del informe.');
    expect(body.messages[0].content).toContain('1-3 frases');
    expect(body.messages[0].content).toContain('boliviano');
    expect(body.messages.some(({ content }) => content.includes(JSON.stringify(informe)))).toBe(true);
    expect(body.messages.at(-1)).toEqual({ role: 'user', content: pregunta });
    expect(JSON.stringify(body.messages)).not.toContain('Historial');
  });
  test('includes historial only when supplied, ordered before current question', async () => {
    const historial = [{ pregunta: '¿Cuántas ventas?', respuesta: 'Una venta.' }];
    await ask({ historial });
    const { messages } = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(messages).toContainEqual({ role: 'user', content: historial[0].pregunta });
    expect(messages).toContainEqual({ role: 'assistant', content: historial[0].respuesta });
    expect(messages.at(-1).content).toBe(pregunta);
    await ask();
    expect(JSON.stringify(JSON.parse(fetchMock.mock.calls[1][1].body).messages)).not.toContain('Una venta.');
  });
  test('parses fenced JSON and preserves row identifiers', async () => {
    fetchMock.mockResolvedValue(reply(`\`\`\`json\n${JSON.stringify({ respuesta, destacados: ['v1'] })}\n\`\`\``));
    expect(await ask()).toEqual({ respuesta, destacados: ['v1'] });
  });
  test.each(['not JSON', '{}', '{"respuesta":12}', '{"respuesta":""}', '{"respuesta":"ok","destacados":[1]}', JSON.stringify({ respuesta, destacados: Array(6).fill('v1') })])('invalid model response -> AI_INVALID_RESPONSE: %s', async (content) => {
    fetchMock.mockResolvedValue(reply(content));
    await expect(ask()).rejects.toMatchObject({ code: errorCodes.AI_INVALID_RESPONSE, statusCode: 502 });
  });
  test('malformed upstream JSON -> AI_INVALID_RESPONSE', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => { throw new SyntaxError('invalid JSON'); } });
    await expect(ask()).rejects.toMatchObject({ code: errorCodes.AI_INVALID_RESPONSE, statusCode: 502 });
  });
  test('missing key -> AI_NOT_CONFIGURED without fetch or configuration read', async () => {
    vi.stubEnv('NAN_BUILDERS_API_KEY', '  ');
    await expect(ask()).rejects.toMatchObject({ code: errorCodes.AI_NOT_CONFIGURED, statusCode: 503 });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(obtenerValor).not.toHaveBeenCalled();
  });
  test('fetch rejection -> AI_UNAVAILABLE', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    await expect(ask()).rejects.toMatchObject({ code: errorCodes.AI_UNAVAILABLE, statusCode: 503 });
  });
  test('HTTP upstream failure -> AI_UNAVAILABLE', async () => {
    fetchMock.mockResolvedValue({ ok: false });
    await expect(ask()).rejects.toMatchObject({ code: errorCodes.AI_UNAVAILABLE, statusCode: 503 });
  });
  test('30s timeout -> AI_UNAVAILABLE and aborts fetch', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation((_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('aborted')));
    }));
    const assertion = expect(ask()).rejects.toMatchObject({ code: errorCodes.AI_UNAVAILABLE, statusCode: 503 });
    await vi.advanceTimersByTimeAsync(30000);
    await assertion;
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
  });
  test('resolves model for every request and falls back to env', async () => {
    obtenerValor.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ valor: 'new-model' }] });
    await ask();
    await ask();
    expect(fetchMock.mock.calls.map(([, options]) => JSON.parse(options.body).model)).toEqual(['env-model', 'new-model']);
  });
});
