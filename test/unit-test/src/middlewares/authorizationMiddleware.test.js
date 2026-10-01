import { describe, expect, test } from 'vitest';
import { requireRoles } from '../../../../src/middlewares/authorizationMiddleware.js';

describe('requireRoles', () => {
  test('continues for an allowed role', () => {
    const next = () => {};
    expect(() => requireRoles('ADMINISTRADOR')({ auth: { usuario: { roles: ['ADMINISTRADOR'] } } }, {}, next)).not.toThrow();
  });
  test('passes an access error for an unauthorized role', () => {
    let error;
    requireRoles('ADMINISTRADOR')({ auth: { usuario: { roles: ['CLIENTE'] } } }, {}, (value) => { error = value; });
    expect(error.code).toBe('FB001');
  });
});
