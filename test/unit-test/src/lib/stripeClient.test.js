import { describe, expect, test, vi } from 'vitest';

vi.mock('../../../../src/config/env.js', () => ({
  env: { STRIPE_SECRET_KEY: '' },
}));

const { getStripe } = await import('../../../../src/lib/stripe.js');

describe('getStripe', () => {
  test('returns null when secret key missing', () => {
    expect(getStripe()).toBeNull();
  });
});
