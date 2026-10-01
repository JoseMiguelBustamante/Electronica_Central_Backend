import { describe, expect, test } from 'vitest';
import { createPurchaseDto } from '../../../../src/dto/purchase.dto.js';
import { computeWeightedAverageCost } from '../../../../src/services/inventoryHelpers.js';
import { assertUniqueProductLines } from '../../../../src/services/purchaseService.js';
import { AppError } from '../../../../src/utils/AppError.js';

describe('purchase helpers and DTO rules', () => {
  test('rejects duplicate idProducto in createPurchaseDto', () => {
    const parsed = createPurchaseDto.safeParse({
      idProveedor: '11111111-1111-4111-8111-111111111111',
      detalles: [
        { idProducto: '22222222-2222-4222-8222-222222222222', cantidad: 1, costoUnitario: 2 },
        { idProducto: '22222222-2222-4222-8222-222222222222', cantidad: 3, costoUnitario: 4 },
      ],
    });
    expect(parsed.success).toBe(false);
  });

  test('assertUniqueProductLines throws BR001 on duplicates', () => {
    expect(() => assertUniqueProductLines([
      { idProducto: 'a' },
      { idProducto: 'a' },
    ])).toThrow(AppError);
    try {
      assertUniqueProductLines([{ idProducto: 'a' }, { idProducto: 'a' }]);
    } catch (error) {
      expect(error.code).toBe('BR001');
    }
  });

  test('weighted average cost matches inventory formula on receive', () => {
    expect(computeWeightedAverageCost(10, 4, 10, 6)).toBe(5);
  });
});
