import request from 'supertest';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { listSalesQueryDto } from '../../../../src/dto/sale.dto.js';

vi.mock('../../../../src/services/authService.js', async (importOriginal) => ({
  ...await importOriginal(),
  getSessionAuthService: vi.fn(async () => ({ usuario: {
    roles: ['ADMINISTRADOR'], permisos: ['VENTAS_GESTIONAR'], cambioContrasenaObligatorio: false,
  } })),
}));
vi.mock('../../../../src/lib/database.js', () => ({ query: vi.fn(), withTransaction: vi.fn() }));
import { query } from '../../../../src/lib/database.js';
import { createApp } from '../../../../src/app.js';

const app = createApp();
const get = (params) => request(app).get('/api/ventas').set('Authorization', 'Bearer test-session').query(params);
beforeEach(() => { vi.clearAllMocks(); query.mockResolvedValue({ rows: [] }); });

describe('S13 sale list search filters', () => {
  test('DTO trims search terms and preserves existing defaults', () => {
    expect(listSalesQueryDto.parse({ comprobante: ' 84502147 ', cliente: ' Rosa Quispe ' }))
      .toEqual({ comprobante: '84502147', cliente: 'Rosa Quispe', pagina: 1, limite: 20 });
  });
  test.each(['comprobante', 'cliente'])('HTTP accepts %s length boundaries 1 and 120', async (field) => {
    for (const value of ['x', 'x'.repeat(120)]) {
      const response = await get({ [field]: value });
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ data: [], meta: { pagina: 1, limite: 20, total: 0 } });
      expect(query.mock.calls.at(-1)[1]).toContain(value);
    }
  });
  test.each(['comprobante', 'cliente'])('HTTP rejects empty and overlong %s before querying', async (field) => {
    for (const value of ['', '   ', 'x'.repeat(121)]) {
      const response = await get({ [field]: value });
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('BR001');
      expect(query).not.toHaveBeenCalled();
    }
  });
  test('HTTP combines parameterized partial filters with existing filters and pagination', async () => {
    const idCliente = '123e4567-e89b-42d3-a456-426614174000';
    const response = await get({ estado: 'CONFIRMADA', idCliente, pagina: 2, limite: 5, comprobante: ' 8450 ', cliente: ' Rosa ' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: [], meta: { pagina: 2, limite: 5, total: 0 } });
    const [sql, values] = query.mock.calls[0];
    expect(values).toEqual(['CONFIRMADA', idCliente, 5, 5, '8450', 'Rosa']);
    expect(sql).toContain("cp.numero ILIKE '%' || $5 || '%'");
    expect(sql).toContain("c.nombre ILIKE '%' || $6 || '%'");
    expect(sql).not.toContain('8450');
    expect(sql).not.toContain('Rosa');
  });
  test('preserves existing filters, pagination, ordering and list response without search terms', async () => {
    const idCliente = '123e4567-e89b-42d3-a456-426614174000';
    query.mockResolvedValue({ rows: [{ id_venta: 'sale', estado: 'BORRADOR', id_cliente: idCliente, cliente_nombre: 'Rosa', total: '7', total_venta: '25', cobrado: '5', numero_comprobante: null }] });
    const response = await get({ estado: 'BORRADOR', idCliente, pagina: 3, limite: 2 });
    expect(response.status).toBe(200);
    expect(response.body.meta).toEqual({ pagina: 3, limite: 2, total: 7 });
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({ idVenta: 'sale', estado: 'BORRADOR', idCliente, clienteNombre: 'Rosa', total: 25, cobrado: 5, saldo: 20, numeroComprobante: null });
    expect(query.mock.calls[0][1]).toEqual(['BORRADOR', idCliente, 2, 4]);
    expect(query.mock.calls[0][0]).toContain('ORDER BY v.fecha_hora DESC, v.id_venta DESC');
    expect(query.mock.calls[0][0]).not.toContain('ILIKE');
  });
});
