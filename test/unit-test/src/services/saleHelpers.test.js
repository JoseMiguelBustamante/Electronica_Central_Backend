import { describe, expect, test } from 'vitest';
import {
  assertAtMostOneDecimal,
  ceilToHalfStep,
  roundHalfUp2,
} from '../../../../src/services/saleHelpers.js';

describe('saleHelpers rounding', () => {
  test('roundHalfUp2 rounds to two decimals', () => {
    expect(roundHalfUp2(10.004)).toBe(10);
    expect(roundHalfUp2(10.005)).toBe(10.01);
    expect(roundHalfUp2(1.255)).toBe(1.26);
  });

  test('ceilToHalfStep matches Excel half-unit ceiling', () => {
    expect(ceilToHalfStep(5.2)).toBe(5.5);
    expect(ceilToHalfStep(4.6)).toBe(5);
    expect(ceilToHalfStep(5)).toBe(5);
    expect(ceilToHalfStep(5.5)).toBe(5.5);
  });

  test('assertAtMostOneDecimal rejects two decimals', () => {
    expect(() => assertAtMostOneDecimal(5.25)).toThrow();
    expect(assertAtMostOneDecimal(5.2)).toBe(5.2);
  });
});
