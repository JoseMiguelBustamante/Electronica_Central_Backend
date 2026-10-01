import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../../../src/repositories/purchaseRepository.js', () => ({
  OPERACION_RECIBIR: 'COMPRA_RECIBIR',
  cancelPurchase: vi.fn(),
  createPurchase: vi.fn(),
  getActiveSupplier: vi.fn(),
  getIdempotencyRecord: vi.fn(),
  getProductsForPurchase: vi.fn(),
  getPurchaseById: vi.fn(),
  listPurchases: vi.fn(),
  receivePurchase: vi.fn(),
  replacePurchase: vi.fn(),
  saveIdempotencyRecord: vi.fn(),
}));

import {
  cancelPurchase,
  getActiveSupplier,
  getIdempotencyRecord,
  getProductsForPurchase,
  receivePurchase,
  replacePurchase,
  saveIdempotencyRecord,
} from '../../../../src/repositories/purchaseRepository.js';
import {
  cancelPurchaseService,
  createPurchaseService,
  receivePurchaseService,
  updatePurchaseService,
} from '../../../../src/services/purchaseService.js';

describe('purchaseService', () => {
  beforeEach(() => vi.clearAllMocks());

  test('rejects create when supplier is inactive', async () => {
    getActiveSupplier.mockResolvedValue({ id_proveedor: 's1', activo: false });
    await expect(createPurchaseService({
      idProveedor: '11111111-1111-4111-8111-111111111111',
      detalles: [{
        idProducto: '22222222-2222-4222-8222-222222222222',
        cantidad: 1,
        costoUnitario: 2,
      }],
    }, { id: 'u1' })).rejects.toMatchObject({ code: 'UE001' });
  });

  test('rejects fractional quantity for indivisible product', async () => {
    getActiveSupplier.mockResolvedValue({ id_proveedor: 's1', activo: true });
    getProductsForPurchase.mockResolvedValue([{
      id_producto: '22222222-2222-4222-8222-222222222222',
      activo: true,
      permite_fraccion: false,
    }]);

    await expect(createPurchaseService({
      idProveedor: '11111111-1111-4111-8111-111111111111',
      detalles: [{
        idProducto: '22222222-2222-4222-8222-222222222222',
        cantidad: 1.5,
        costoUnitario: 2,
      }],
    }, { id: 'u1' })).rejects.toMatchObject({ code: 'BR001' });
  });

  test('rejects PATCH when purchase is not PENDIENTE', async () => {
    getActiveSupplier.mockResolvedValue({ id_proveedor: 's1', activo: true });
    getProductsForPurchase.mockResolvedValue([{
      id_producto: '22222222-2222-4222-8222-222222222222',
      activo: true,
      permite_fraccion: false,
    }]);
    replacePurchase.mockResolvedValue({ status: 'INVALID_STATE', estado: 'RECIBIDA' });

    await expect(updatePurchaseService('c1', {
      idProveedor: '11111111-1111-4111-8111-111111111111',
      detalles: [{
        idProducto: '22222222-2222-4222-8222-222222222222',
        cantidad: 1,
        costoUnitario: 2,
      }],
    })).rejects.toMatchObject({ code: 'UE001' });
  });

  test('returns cached receive on identical idempotency key', async () => {
    const cached = { compra: { estado: 'RECIBIDA' } };
    getIdempotencyRecord.mockImplementation(async () => {
      const crypto = await import('node:crypto');
      const hash = crypto.createHash('sha256').update(JSON.stringify({ idCompra: 'c1' })).digest('hex');
      return { hash_solicitud: hash, estado_http: 200, respuesta: cached };
    });

    const result = await receivePurchaseService('c1', { claveIdempotencia: 'k1' }, { id: 'u1' });
    expect(result.cached).toBe(true);
    expect(result.data).toEqual(cached);
    expect(receivePurchase).not.toHaveBeenCalled();
    expect(saveIdempotencyRecord).not.toHaveBeenCalled();
  });

  test('rejects cancel when not PENDIENTE', async () => {
    cancelPurchase.mockResolvedValue({ status: 'INVALID_STATE', estado: 'RECIBIDA' });
    await expect(cancelPurchaseService('c1')).rejects.toMatchObject({ code: 'UE001' });
  });
});
