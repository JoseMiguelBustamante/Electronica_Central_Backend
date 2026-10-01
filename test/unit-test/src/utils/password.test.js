import { describe, expect, test } from 'vitest';
import { hashPassword, verifyPassword } from '../../../../src/utils/password.js';

describe('password', () => {
  test('hashes and verifies the original password only', async () => {
    const hash = await hashPassword('SeguraDePrueba123');
    expect(hash).not.toContain('SeguraDePrueba123');
    await expect(verifyPassword('SeguraDePrueba123', hash)).resolves.toBe(true);
    await expect(verifyPassword('incorrecta', hash)).resolves.toBe(false);
  });
});
