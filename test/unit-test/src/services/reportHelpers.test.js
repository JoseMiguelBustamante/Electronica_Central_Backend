import { describe, expect, test } from 'vitest';
import {
  formatLaPazDate,
  laPazDayStartUtc,
  laPazRangeExclusive,
} from '../../../../src/services/reportHelpers.js';

describe('reportHelpers America/La_Paz', () => {
  test('laPazDayStartUtc maps calendar day to UTC-4 midnight', () => {
    const start = laPazDayStartUtc('2026-09-25');
    expect(start.toISOString()).toBe('2026-09-25T04:00:00.000Z');
  });

  test('laPazRangeExclusive is half-open [desde, hasta+1)', () => {
    const { start, endExclusive } = laPazRangeExclusive('2026-09-01', '2026-09-30');
    expect(start.toISOString()).toBe('2026-09-01T04:00:00.000Z');
    expect(endExclusive.toISOString()).toBe('2026-10-01T04:00:00.000Z');
  });

  test('formatLaPazDate formats instant in La Paz calendar', () => {
    expect(formatLaPazDate(new Date('2026-09-25T03:59:59.000Z'))).toBe('2026-09-24');
    expect(formatLaPazDate(new Date('2026-09-25T04:00:00.000Z'))).toBe('2026-09-25');
  });
});
