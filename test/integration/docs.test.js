import request from 'supertest';
import { describe, expect, test } from 'vitest';
import { createApp } from '../../src/app.js';

const app = createApp();

describe('API docs', () => {
  test('serves swagger UI shell and openapi json', async () => {
    const ui = await request(app).get('/api/docs/');
    expect([200, 301, 302]).toContain(ui.status);

    const json = await request(app).get('/api/docs/openapi.json');
    expect(json.status).toBe(200);
    expect(json.body.openapi).toMatch(/^3\./);
    expect(json.body.paths['/api/auth/login']).toBeTruthy();
    expect(json.body.paths['/api/reportes/ventas']).toBeTruthy();
    expect(Object.keys(json.body.paths).length).toBeGreaterThan(40);
  });
});
