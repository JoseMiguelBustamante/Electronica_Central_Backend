import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../../../src/repositories/inventoryRepository.js', () => ({
  applyInventoryAdjustment: vi.fn(),
  confirmOpeningBatch: vi.fn(),
  getExistenceWithUnit: vi.fn(),
  getIdempotencyRecord: vi.fn(),
  getInventoryAlerts: vi.fn(),
  getInventoryList: vi.fn(),
  getInventoryMovements: vi.fn(),
  getProductByCodigo: vi.fn(),
  getProductExists: vi.fn(),
  getProductsByIds: vi.fn(),
  saveIdempotencyRecord: vi.fn(),
  updateStockMinimo: vi.fn(),
}));

import {
  applyInventoryAdjustment,
  getExistenceWithUnit,
  getIdempotencyRecord,
  getInventoryList,
  saveIdempotencyRecord,
} from '../../../../src/repositories/inventoryRepository.js';
import {
  createInventoryAdjustmentService,
  getInventoryListService,
} from '../../../../src/services/inventoryService.js';

describe('inventoryService mutations', () => {
  beforeEach(() => vi.clearAllMocks());

  test('hides costoPromedio when actor lacks INVENTARIO_GESTIONAR', async () => {
    getInventoryList.mockResolvedValue([{
      id_producto: 'p1',
      codigo: 'SKU',
      nombre: 'Prod',
      stock_actual: '3',
      stock_minimo: '1',
      costo_promedio: '12.5',
      id_ubicacion: 'u1',
      ubicacion_codigo: 'A',
      pasillo: '1',
      estante: '2',
      total: '1',
    }]);

    const result = await getInventoryListService(
      { pagina: 1, limite: 20 },
      ['INVENTARIO_CONSULTAR'],
    );

    expect(result.items[0]).not.toHaveProperty('costoPromedio');
    expect(result.items[0].stockActual).toBe(3);
  });

  test('rejects SALIDA that would leave negative stock with UE001', async () => {
    getIdempotencyRecord.mockResolvedValue(null);
    getExistenceWithUnit.mockResolvedValue({
      id_producto: 'p1',
      stock_actual: '2',
      stock_minimo: '0',
      costo_promedio: '1',
      activo: true,
      permite_fraccion: false,
    });
    applyInventoryAdjustment.mockResolvedValue({ status: 'INSUFFICIENT_STOCK' });

    await expect(createInventoryAdjustmentService({
      idProducto: '11111111-1111-1111-1111-111111111111',
      tipo: 'SALIDA',
      cantidad: 5,
      motivo: 'Ajuste',
      claveIdempotencia: 'k1',
    }, { id: 'user-1' })).rejects.toMatchObject({ code: 'UE001' });
  });

  test('returns cached response on identical idempotent adjustment', async () => {
    const cached = { movimiento: { idMovimiento: 'm1' } };
    getIdempotencyRecord.mockResolvedValue({
      hash_solicitud: '80e0a7f3e0c7b1c0c7d8f1e5b0c1a2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9'.slice(0, 64),
      estado_http: 201,
      respuesta: cached,
    });

    // Force mismatch path to be avoided by computing the real hash through a first call that seeds nothing —
    // instead stub hash equality by making resolve use a real save path. Prefer hit via matching hash:
    getIdempotencyRecord.mockImplementation(async () => {
      const crypto = await import('node:crypto');
      const hash = crypto.createHash('sha256').update(JSON.stringify({
        idProducto: '11111111-1111-1111-1111-111111111111',
        tipo: 'ENTRADA',
        cantidad: 2,
        motivo: 'Ajuste',
        costoUnitario: 5,
      })).digest('hex');
      return { hash_solicitud: hash, estado_http: 201, respuesta: cached };
    });

    const result = await createInventoryAdjustmentService({
      idProducto: '11111111-1111-1111-1111-111111111111',
      tipo: 'ENTRADA',
      cantidad: 2,
      motivo: 'Ajuste',
      costoUnitario: 5,
      claveIdempotencia: 'same-key',
    }, { id: 'user-1' });

    expect(result.cached).toBe(true);
    expect(result.data).toEqual(cached);
    expect(applyInventoryAdjustment).not.toHaveBeenCalled();
    expect(saveIdempotencyRecord).not.toHaveBeenCalled();
  });

  test('rejects fractional quantity for indivisible units with BR001', async () => {
    getIdempotencyRecord.mockResolvedValue(null);
    getExistenceWithUnit.mockResolvedValue({
      id_producto: 'p1',
      stock_actual: '10',
      costo_promedio: '1',
      activo: true,
      permite_fraccion: false,
    });

    await expect(createInventoryAdjustmentService({
      idProducto: '11111111-1111-1111-1111-111111111111',
      tipo: 'ENTRADA',
      cantidad: 1.5,
      motivo: 'Ajuste',
      costoUnitario: 2,
      claveIdempotencia: 'frac',
    }, { id: 'user-1' })).rejects.toMatchObject({ code: 'BR001' });
  });
});
