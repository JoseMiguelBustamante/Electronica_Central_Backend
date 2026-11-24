import request from 'supertest';
import { afterAll, describe, expect, test, vi } from 'vitest';

// Isolate sessions only: real HTTP validation, service and PostgreSQL list query; no data writes.
vi.mock('../../src/services/authService.js', async (importOriginal) => ({
  ...await importOriginal(),
  getSessionAuthService: vi.fn(async () => ({ usuario: {
    roles: ['ADMINISTRADOR'], permisos: ['VENTAS_GESTIONAR'], cambioContrasenaObligatorio: false,
  } })),
}));
import { createApp } from '../../src/app.js';
import { closeDatabase } from '../../src/lib/database.js';

const app = createApp();
const get = (params) => request(app).get('/api/ventas').set('Authorization', 'Bearer test-session').query(params);
afterAll(closeDatabase);

describe('S13 sale search HTTP flow with PostgreSQL (read-only)', () => {
  test('GET comprobante filters a known number, gracefully accepting an empty database', async () => {
    const listed = await get({ limite: 100 });
    expect(listed.status).toBe(200);
    expect(Array.isArray(listed.body.data)).toBe(true);
    const known = listed.body.data.find((sale) => sale.numeroComprobante)?.numeroComprobante;
    const term = known ? known.slice(1, -1).toLowerCase() : '84502147';
    const filtered = await get({ comprobante: term });
    expect(filtered.status).toBe(200);
    expect(Array.isArray(filtered.body.data)).toBe(true);
    for (const sale of filtered.body.data) expect(sale.numeroComprobante.toLowerCase()).toContain(term);
    if (known) expect(filtered.body.data.length).toBeGreaterThan(0);
  });
  test('GET cliente filters partial case-insensitive names and combines existing filters', async () => {
    const listed = await get({ limite: 100 });
    expect(listed.status).toBe(200);
    expect(Array.isArray(listed.body.data)).toBe(true);
    const known = listed.body.data.find((sale) => sale.clienteNombre);
    const term = known ? known.clienteNombre.slice(0, 3).toUpperCase() : 'ROSA';
    const filtered = await get({ cliente: term, ...(known ? { idCliente: known.idCliente, estado: known.estado } : {}), pagina: 1, limite: 10 });
    expect(filtered.status).toBe(200);
    expect(Array.isArray(filtered.body.data)).toBe(true);
    for (const sale of filtered.body.data) {
      expect(sale.clienteNombre.toUpperCase()).toContain(term);
      if (known) {
        expect(sale.idCliente).toBe(known.idCliente);
        expect(sale.estado).toBe(known.estado);
      }
    }
    if (known) expect(filtered.body.data.length).toBeGreaterThan(0);
  });
});
