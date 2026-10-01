import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';

const app = createApp();

describe('health endpoints', () => {
  it('returns the API health without environment data', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: { status: 'ok' } });
    expect(JSON.stringify(response.body)).not.toContain('PORT');
    expect(JSON.stringify(response.body)).not.toContain('NODE_ENV');
  });

  it('reports readiness when PostgreSQL Docker is configured', async () => {
    const response = await request(app).get('/ready');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: { status: 'ready' } });
  });
});
