import { describe, expect, test } from 'vitest';
import { AppError } from '../../../../src/utils/AppError.js';
import {
  assertQuantityFraction,
  computeOpeningCost,
  computeWeightedAverageCost,
  projectInventoryRow,
  stripCostFields,
} from '../../../../src/services/inventoryHelpers.js';

describe('inventoryHelpers', () => {
  test('computes opening cost as PRECIO × 0.65', () => {
    expect(computeOpeningCost(100)).toBe(65);
    expect(computeOpeningCost(10)).toBe(6.5);
  });

  test('computes weighted average cost on ENTRADA', () => {
    expect(computeWeightedAverageCost(10, 2, 10, 4)).toBe(3);
    expect(computeWeightedAverageCost(0, 0, 5, 8)).toBe(8);
  });

  test('rejects fractional quantity when unit does not allow fractions', () => {
    expect(() => assertQuantityFraction(1.5, false)).toThrow(AppError);
    expect(() => assertQuantityFraction(1.5, false)).toThrowError(/Invalid request data/);
  });

  test('accepts up to four decimals when fractions are allowed', () => {
    expect(assertQuantityFraction(1.1234, true)).toBe(1.1234);
  });

  test('rejects more than four decimals when fractions are allowed', () => {
    expect(() => assertQuantityFraction(1.12345, true)).toThrow(AppError);
  });

  test('strips cost from inventory projection without GESTIONAR', () => {
    const row = {
      id_producto: 'p1',
      codigo: 'SKU',
      nombre: 'Producto',
      stock_actual: '0',
      stock_minimo: '2',
      costo_promedio: '9.5',
      id_ubicacion: 'u1',
      ubicacion_codigo: 'A-1',
      pasillo: 'A',
      estante: '1',
    };
    const withCost = projectInventoryRow(row, true);
    expect(withCost.costoPromedio).toBe(9.5);
    expect(withCost.alerta).toBe('AGOTADO');

    const withoutCost = projectInventoryRow(row, false);
    expect(withoutCost).not.toHaveProperty('costoPromedio');
    expect(stripCostFields(withCost)).not.toHaveProperty('costoPromedio');
  });

  test('classifies low-min alert when 0 < stock <= minimo', () => {
    const projected = projectInventoryRow({
      id_producto: 'p1',
      codigo: 'SKU',
      nombre: 'Producto',
      stock_actual: '2',
      stock_minimo: '5',
      costo_promedio: '1',
      id_ubicacion: 'u1',
      ubicacion_codigo: 'A-1',
      pasillo: 'A',
      estante: '1',
    }, false);
    expect(projected.alerta).toBe('BAJO_MINIMO');
  });
});
