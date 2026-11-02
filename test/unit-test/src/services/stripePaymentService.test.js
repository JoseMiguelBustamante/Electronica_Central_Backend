import { beforeEach, describe, expect, test, vi } from 'vitest';

const constructEvent = vi.fn();
const getPaymentByReference = vi.fn();
const confirmPayment = vi.fn();
const rejectPayment = vi.fn();
const markPaymentRefunded = vi.fn();

vi.mock('../../../../src/lib/stripe.js', () => ({
  getStripe: () => ({
    webhooks: { constructEvent },
    refunds: { create: vi.fn() },
    checkout: { sessions: { create: vi.fn(), expire: vi.fn() } },
  }),
}));

vi.mock('../../../../src/config/env.js', () => ({
  env: {
    STRIPE_SECRET_KEY: 'sk_test_x',
    STRIPE_WEBHOOK_SECRET: 'whsec_test',
    STRIPE_CURRENCY: 'bob',
    STRIPE_CHECKOUT_EXPIRES_MINUTES: 30,
    PAYMENT_SUCCESS_URL: 'http://localhost:5173/ok',
    PAYMENT_CANCEL_URL: 'http://localhost:5173/cancel',
    FRONTEND_ORIGIN: 'http://localhost:5173',
    FRONTEND_ORIGINS: ['http://localhost:5173'],
    stripeConfigured: true,
  },
}));

vi.mock('../../../../src/repositories/paymentRepository.js', () => ({
  OPERACION_PAGO_CONFIRMAR: 'PAGO_CONFIRMAR',
  getPaymentByReference,
  getPaymentById: vi.fn(),
  confirmPayment,
  rejectPayment,
  markPaymentRefunded,
  createPayment: vi.fn(),
  listPaymentsBySale: vi.fn(),
  getIdempotencyRecord: vi.fn(),
  saveIdempotencyRecord: vi.fn(),
}));

vi.mock('../../../../src/repositories/saleRepository.js', () => ({
  getSaleById: vi.fn(),
}));

vi.mock('../../../../src/repositories/securityRepository.js', () => ({
  addLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../../src/lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../../../../src/services/saleService.js', () => ({
  computeTotals: () => ({ total: 20.3, cobrado: 0, saldo: 20.3 }),
}));

const { handleStripeWebhookService } = await import(
  '../../../../src/services/paymentService.js'
);

describe('handleStripeWebhookService (contrato compañero)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('rechaza firma inválida', async () => {
    constructEvent.mockImplementation(() => {
      throw new Error('bad sig');
    });
    await expect(
      handleStripeWebhookService(Buffer.from('{}'), 'sig'),
    ).rejects.toMatchObject({ code: 'BR001' });
  });

  test('confirma pago EN_LINEA cuando session paid', async () => {
    constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_1',
          payment_status: 'paid',
          amount_total: 2030,
          payment_intent: 'pi_1',
        },
      },
    });
    getPaymentByReference.mockResolvedValue({
      id_pago: 'pg1',
      id_venta: 'v1',
      monto: '20.30',
      metodo: 'EN_LINEA',
      estado: 'PENDIENTE',
      referencia_externa: 'cs_1',
    });
    confirmPayment.mockResolvedValue({ status: 'OK' });

    const result = await handleStripeWebhookService(Buffer.from('{}'), 'sig');
    expect(result).toMatchObject({ resultado: 'CONFIRMADO' });
    expect(confirmPayment).toHaveBeenCalledOnce();
  });

  test('idempotente si ya CONFIRMADO', async () => {
    constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_1',
          payment_status: 'paid',
          amount_total: 2030,
        },
      },
    });
    getPaymentByReference.mockResolvedValue({
      id_pago: 'pg1',
      estado: 'CONFIRMADO',
      monto: '20.30',
      referencia_externa: 'cs_1',
    });

    const result = await handleStripeWebhookService(Buffer.from('{}'), 'sig');
    expect(result.resultado).toBe('YA_PROCESADO');
    expect(confirmPayment).not.toHaveBeenCalled();
  });
});
