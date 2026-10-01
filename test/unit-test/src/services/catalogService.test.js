import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../../../src/repositories/catalogRepository.js', () => ({
  createBrand: vi.fn(),
  createCategory: vi.fn(),
  createCompatibility: vi.fn(),
  createLocation: vi.fn(),
  createModel: vi.fn(),
  createProduct: vi.fn(),
  createUnit: vi.fn(),
  deactivateProduct: vi.fn(),
  deleteCompatibility: vi.fn(),
  getCatalogFilters: vi.fn(),
  getPublicProductById: vi.fn(),
  getPublicProducts: vi.fn(),
}));

import { getPublicProducts } from '../../../../src/repositories/catalogRepository.js';
import { getPublicProductsService } from '../../../../src/services/catalogService.js';

describe('catalogService', () => {
  beforeEach(() => vi.clearAllMocks());

  test('calculates the database offset and omits internal pagination helper fields', async () => {
    getPublicProducts.mockResolvedValue([{
      id_producto: 'product-id',
      nombre: 'Cable HDMI',
      disponibilidad: 'DISPONIBLE',
      total: '1',
    }]);

    const result = await getPublicProductsService({ pagina: 2, limite: 10 });

    expect(getPublicProducts).toHaveBeenCalledWith(undefined, undefined, undefined, undefined, 10, 10);
    expect(result).toEqual({
      products: [{ id_producto: 'product-id', nombre: 'Cable HDMI', disponibilidad: 'DISPONIBLE' }],
      total: 1,
      pagina: 2,
      limite: 10,
    });
  });
});
