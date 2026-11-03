import { beforeEach, describe, expect, test, vi } from 'vitest';

const sendMailMock = vi.fn().mockResolvedValue({ messageId: 'msg-1' });
const createTransport = vi.fn(() => ({ sendMail: sendMailMock }));

vi.mock('nodemailer', () => ({
  default: { createTransport },
}));

vi.mock('../../../../src/config/env.js', () => ({
  env: {
    SMTP_URL: 'smtp://user:pass@smtp.test:587',
    MAIL_FROM: 'Electrónica Central AZ <noreply@test.local>',
    smtpConfigured: true,
  },
}));

vi.mock('../../../../src/lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { sendMail, resetMailerForTests } = await import('../../../../src/lib/mailer.js');

describe('mailer (SMTP)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMailerForTests();
  });

  test('envía correo con from/to/subject vía nodemailer', async () => {
    const result = await sendMail({
      to: 'cliente@example.com',
      subject: 'Prueba',
      text: 'Hola',
      html: '<p>Hola</p>',
    });

    expect(createTransport).toHaveBeenCalledWith('smtp://user:pass@smtp.test:587');
    expect(sendMailMock).toHaveBeenCalledWith({
      from: 'Electrónica Central AZ <noreply@test.local>',
      to: 'cliente@example.com',
      subject: 'Prueba',
      text: 'Hola',
      html: '<p>Hola</p>',
    });
    expect(result).toEqual({ sent: true, messageId: 'msg-1' });
  });
});
