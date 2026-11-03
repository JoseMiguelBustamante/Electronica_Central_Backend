import { beforeEach, describe, expect, test, vi } from 'vitest';

const findUserByEmail = vi.fn();
const createRecoveryToken = vi.fn();
const addLog = vi.fn();
const sendMail = vi.fn();

vi.mock('../../../../src/config/env.js', () => ({
  env: {
    FRONTEND_ORIGIN: 'https://electronica.example.test',
    FRONTEND_ORIGINS: ['https://electronica.example.test'],
    NODE_ENV: 'test',
    smtpConfigured: true,
    SMTP_URL: 'smtp://user:pass@smtp.test:587',
    MAIL_FROM: 'noreply@test.local',
  },
}));

vi.mock('../../../../src/repositories/authRepository.js', () => ({
  findUserByEmail,
  createRecoveryToken,
  createSession: vi.fn(),
  findSession: vi.fn(),
  findUserById: vi.fn(),
  findUserForLogin: vi.fn(),
  findValidRecoveryToken: vi.fn(),
  markRecoveryTokenUsed: vi.fn(),
  registerLoginFailure: vi.fn(),
  resetAttemptsAfterLockExpired: vi.fn(),
  revokeAllUserSessions: vi.fn(),
  revokeSession: vi.fn(),
  setPasswordChangeRequired: vi.fn(),
  touchSession: vi.fn(),
  updatePassword: vi.fn(),
  clearLoginFailures: vi.fn(),
  createClientAccount: vi.fn(),
}));

vi.mock('../../../../src/repositories/securityRepository.js', () => ({
  addLog,
}));

vi.mock('../../../../src/lib/mailer.js', () => ({
  sendMail,
}));

vi.mock('../../../../src/lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../../../../src/utils/password.js', () => ({
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
}));

vi.mock('../../../../src/utils/token.js', () => ({
  createSessionToken: () => 'token-plano-test',
  hashToken: (t) => `hash:${t}`,
}));

const { requestPasswordRecoveryService } = await import(
  '../../../../src/services/authService.js'
);

describe('requestPasswordRecoveryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendMail.mockResolvedValue({ sent: true, messageId: 'm1' });
    createRecoveryToken.mockResolvedValue(undefined);
    addLog.mockResolvedValue(undefined);
  });

  test('envía correo SMTP con link de restablecimiento', async () => {
    findUserByEmail.mockResolvedValue({
      id_usuario: 'u1',
      nombre_usuario: 'jose',
      correo: 'jose@example.com',
      activo: true,
    });

    const result = await requestPasswordRecoveryService({ correo: 'jose@example.com' });

    expect(createRecoveryToken).toHaveBeenCalledWith(
      'u1',
      'hash:token-plano-test',
      expect.any(Date),
    );
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'jose@example.com',
        subject: expect.stringContaining('Restablecer'),
        text: expect.stringContaining(
          'https://electronica.example.test/restablecer?token=token-plano-test',
        ),
      }),
    );
    expect(result.enviado).toBe(true);
    expect(result.debugLink).toContain('/restablecer?token=');
  });

  test('no enumera usuarios inexistentes y no envía mail', async () => {
    findUserByEmail.mockResolvedValue(null);
    const result = await requestPasswordRecoveryService({ correo: 'nadie@example.com' });
    expect(result.enviado).toBe(true);
    expect(sendMail).not.toHaveBeenCalled();
    expect(createRecoveryToken).not.toHaveBeenCalled();
  });
});
