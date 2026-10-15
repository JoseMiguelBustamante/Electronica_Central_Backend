import express from 'express';
import request from 'supertest';
import { describe, expect, test } from 'vitest';
import { env } from '../../../../src/config/env.js';
import { corsMiddleware } from '../../../../src/middlewares/corsMiddleware.js';

describe('corsMiddleware', () => {
  const app = express();
  app.use(corsMiddleware);
  app.get('/probe', (_req, res) => res.status(200).json({ ok: true }));

  test('allows the configured frontend origin', async () => {
    const response = await request(app).options('/probe').set('Origin', env.FRONTEND_ORIGIN);

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(env.FRONTEND_ORIGIN);
    expect(response.headers['access-control-allow-headers']).toContain('Authorization');
  });

  test('does not reflect a different origin', async () => {
    const response = await request(app).get('/probe').set('Origin', 'http://evil.example');

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});