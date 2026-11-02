import { createHash } from 'node:crypto';
import { env } from '../config/env.js';
import { errorCodes } from '../config/errorCodes.js';
import { logger } from '../lib/logger.js';
import { getStripe } from '../lib/stripe.js';
import {
  OPERACION_PAGO_CONFIRMAR,
  confirmPayment,
  createPayment,
  getIdempotencyRecord,
  getPaymentById,
  getPaymentByReference,
  listPaymentsBySale,
  markPaymentRefunded,
  rejectPayment,
  saveIdempotencyRecord,
} from '../repositories/paymentRepository.js';
import { confirmSale, getSaleById } from '../repositories/saleRepository.js';
import { addLog } from '../repositories/securityRepository.js';
import { AppError } from '../utils/AppError.js';
import { ceilToHalfStep, roundHalfUp2 } from './saleHelpers.js';
import {
  computeTotals,
  describeSaleForAudit,
  describeSaleStockOut,
  getSaleService,
} from './saleService.js';

export const ONLINE_METHOD = 'EN_LINEA';
export const PAYABLE_SALE_STATES = ['BORRADOR', 'CONFIRMADA'];

/**
 * En mostrador la venta nace BORRADOR; se confirma (baja stock) al cobrar.
 * Stripe: tras webhook. Efectivo: al registrar el pago (strict → error si falla stock).
 */
const auditSaleConfirmation = async (idVenta, idUsuario) => {
  try {
    const mapped = await getSaleService(idVenta, {
      id: idUsuario,
      roles: ['ADMINISTRADOR'],
    });
    await addLog('VENTA_CONFIRMADA', describeSaleForAudit(mapped), 'OK', idUsuario, { tabla: 'venta' });
    await addLog(
      'MOVIMIENTO_SALIDA_VENTA',
      describeSaleStockOut(mapped),
      'OK',
      idUsuario,
      { tabla: 'movimiento_inventario' },
    );
  } catch (error) {
    logger.warn('audit_venta_confirmada_fallo', { idVenta, message: error.message });
  }
};

const ensureSaleConfirmedOnPayment = async (idVenta, idUsuario, { strict = false } = {}) => {
  const sale = await getSaleById(idVenta);
  if (!sale) {
    if (strict) throw new AppError(errorCodes.NOT_FOUND);
    return { confirmed: false };
  }
  if (sale.estado === 'CONFIRMADA') return { confirmed: false };
  if (sale.estado !== 'BORRADOR') {
    if (strict) {
      throw new AppError(errorCodes.BUSINESS_RULE, 422, {
        reason: 'SALE_NOT_PAYABLE',
        estado: sale.estado,
      });
    }
    return { confirmed: false, status: 'INVALID_STATE' };
  }
  const result = await confirmSale(idVenta, idUsuario);
  if (result.status === 'OK') {
    logger.info('venta_confirmada_por_pago', { idVenta });
    await auditSaleConfirmation(idVenta, idUsuario);
    return { confirmed: true };
  }
  logger.warn('venta_confirm_tras_pago_fallo', { idVenta, status: result.status });
  if (strict) {
    throw new AppError(errorCodes.BUSINESS_RULE, 422, {
      reason: result.status,
      idProducto: result.idProducto,
      stockActual: result.stockActual,
    });
  }
  return { confirmed: false, status: result.status };
};

const hashPayload = (payload) => createHash('sha256')
  .update(JSON.stringify(payload))
  .digest('hex');

const mapPayment = (row) => ({
  idPago: row.id_pago,
  fechaHora: row.fecha_hora,
  monto: Number(row.monto),
  metodo: row.metodo,
  estado: row.estado,
  referenciaExterna: row.referencia_externa,
  idVenta: row.id_venta,
});

const resolveIdempotency = async (idUsuario, operacion, clave, payload) => {
  const hash = hashPayload(payload);
  const existing = await getIdempotencyRecord(idUsuario, operacion, clave);
  if (!existing) return { hash, hit: false };
  if (existing.hash_solicitud !== hash) {
    throw new AppError(errorCodes.CONFLICT, 409, { reason: 'IDEMPOTENCY_PAYLOAD_MISMATCH' });
  }
  return {
    hash,
    hit: true,
    statusHttp: existing.estado_http,
    respuesta: existing.respuesta,
  };
};

const persistIdempotency = async (idUsuario, operacion, clave, hash, statusHttp, data) => {
  try {
    await saveIdempotencyRecord(idUsuario, operacion, clave, hash, statusHttp, data);
  } catch (error) {
    if (error.code === '23505') {
      const existing = await getIdempotencyRecord(idUsuario, operacion, clave);
      if (existing && existing.hash_solicitud === hash) {
        return { cached: true, statusHttp: existing.estado_http, data: existing.respuesta };
      }
      throw new AppError(errorCodes.CONFLICT, 409, { reason: 'IDEMPOTENCY_PAYLOAD_MISMATCH' });
    }
    throw error;
  }
  return null;
};

const requireStripe = () => {
  const stripe = getStripe();
  if (!stripe) {
    throw new AppError(errorCodes.SERVICE_UNAVAILABLE, 503, {
      reason: 'PAYMENT_GATEWAY_NOT_CONFIGURED',
      mensaje: 'El cobro en línea no está habilitado en el servidor.',
    });
  }
  return stripe;
};

const toMinorUnits = (monto) => Math.round(roundHalfUp2(monto) * 100);

const logGatewayEvent = (accion, objeto, resultado, idUsuario = null) => (
  addLog(accion, objeto, resultado, idUsuario, {}).catch(() => undefined)
);

export const listPaymentsService = async (idVenta) => {
  const sale = await getSaleById(idVenta);
  if (!sale) throw new AppError(errorCodes.NOT_FOUND);
  const rows = await listPaymentsBySale(idVenta);
  return rows.map(mapPayment);
};

export const createPaymentService = async (idVenta, body, usuario) => {
  const sale = await getSaleById(idVenta);
  if (!sale) throw new AppError(errorCodes.NOT_FOUND);
  if (!PAYABLE_SALE_STATES.includes(sale.estado)) {
    throw new AppError(errorCodes.BUSINESS_RULE, 422, { reason: 'SALE_NOT_PAYABLE', estado: sale.estado });
  }
  if (body.metodo === ONLINE_METHOD || body.metodo === 'STRIPE') {
    throw new AppError(errorCodes.BUSINESS_RULE, 422, {
      reason: 'USE_ONLINE_CHECKOUT_ENDPOINT',
    });
  }

  const totals = computeTotals(sale.detalles, sale.pagos);
  let monto = ceilToHalfStep(body.monto);
  const saldoRedondeado = Number((Math.ceil(roundHalfUp2(totals.saldo) / 0.5) * 0.5).toFixed(2));
  if (totals.saldo > 0 && monto > totals.saldo && monto <= saldoRedondeado) monto = totals.saldo;
  if (roundHalfUp2(totals.cobrado + monto) > totals.total) {
    throw new AppError(errorCodes.BUSINESS_RULE, 422, {
      reason: 'PAYMENT_EXCEEDS_BALANCE',
      total: totals.total,
      cobrado: totals.cobrado,
      monto,
    });
  }

  // Efectivo: primero confirma venta (stock), luego registra y confirma el pago.
  if (body.metodo === 'EFECTIVO') {
    await ensureSaleConfirmedOnPayment(idVenta, usuario.id, { strict: true });
  }

  let row;
  try {
    row = await createPayment(
      idVenta,
      usuario.id,
      monto,
      body.metodo,
      body.referenciaExterna,
    );
  } catch (error) {
    if (error.code === '23505') throw new AppError(errorCodes.CONFLICT, 409, { reason: 'DUPLICATE_REFERENCE' });
    throw error;
  }

  if (body.metodo === 'EFECTIVO') {
    const confirmed = await confirmPayment(row.id_pago, PAYABLE_SALE_STATES);
    if (confirmed.status !== 'OK') {
      throw new AppError(errorCodes.BUSINESS_RULE, 422, {
        reason: confirmed.status,
        estado: confirmed.estado,
      });
    }
    return mapPayment(confirmed.pago);
  }

  return mapPayment(row);
};

export const confirmPaymentService = async (idPago, body, usuario) => {
  const payload = { idPago };
  const idem = await resolveIdempotency(
    usuario.id, OPERACION_PAGO_CONFIRMAR, body.claveIdempotencia, payload,
  );
  if (idem.hit) return { cached: true, statusHttp: idem.statusHttp, data: idem.respuesta };

  const existing = await getPaymentById(idPago);
  if (!existing) throw new AppError(errorCodes.NOT_FOUND);
  if (existing.metodo === ONLINE_METHOD) {
    throw new AppError(errorCodes.BUSINESS_RULE, 422, {
      reason: 'PAYMENT_CONFIRMED_BY_GATEWAY',
      mensaje: 'Los pagos en línea los confirma la pasarela automáticamente.',
    });
  }

  const result = await confirmPayment(idPago, PAYABLE_SALE_STATES);
  if (result.status === 'NOT_FOUND') throw new AppError(errorCodes.NOT_FOUND);
  if (result.status === 'INVALID_STATE') {
    throw new AppError(errorCodes.BUSINESS_RULE, 422, {
      reason: 'PAYMENT_NOT_PENDING',
      estado: result.estado,
    });
  }
  if (result.status === 'SALE_NOT_PAYABLE') {
    throw new AppError(errorCodes.BUSINESS_RULE, 422, { reason: 'SALE_NOT_PAYABLE', estado: result.estado });
  }
  if (result.status === 'OVERPAY') {
    throw new AppError(errorCodes.BUSINESS_RULE, 422, {
      reason: 'PAYMENT_EXCEEDS_BALANCE',
      total: result.saleTotal,
      cobrado: result.confirmedBefore,
    });
  }

  await ensureSaleConfirmedOnPayment(existing.id_venta, usuario.id);

  const data = mapPayment(result.pago);
  const raced = await persistIdempotency(
    usuario.id, OPERACION_PAGO_CONFIRMAR, body.claveIdempotencia, idem.hash, 200, data,
  );
  if (raced) return raced;
  return { cached: false, statusHttp: 200, data };
};

export const rejectPaymentService = async (idPago) => {
  const existing = await getPaymentById(idPago);
  if (!existing) throw new AppError(errorCodes.NOT_FOUND);
  if (existing.metodo === ONLINE_METHOD && existing.estado === 'PENDIENTE') {
    const stripe = requireStripe();
    try {
      await stripe.checkout.sessions.expire(existing.referencia_externa);
    } catch (error) {
      throw new AppError(errorCodes.CONFLICT, 409, {
        reason: 'PAYMENT_ALREADY_PROCESSED_BY_GATEWAY',
        mensaje: 'La pasarela ya procesó este cobro; espere su confirmación.',
        detalle: error.message,
      });
    }
  }

  const result = await rejectPayment(idPago);
  if (result.status === 'NOT_FOUND') throw new AppError(errorCodes.NOT_FOUND);
  if (result.status === 'INVALID_STATE') {
    throw new AppError(errorCodes.BUSINESS_RULE, 422, {
      reason: 'PAYMENT_NOT_PENDING',
      estado: result.estado,
    });
  }
  return mapPayment(result.pago);
};

export const createOnlinePaymentService = async (idVenta, body, usuario) => {
  const stripe = requireStripe();
  const sale = await getSaleById(idVenta);
  if (!sale) throw new AppError(errorCodes.NOT_FOUND);
  if (!PAYABLE_SALE_STATES.includes(sale.estado)) {
    throw new AppError(errorCodes.BUSINESS_RULE, 422, { reason: 'SALE_NOT_PAYABLE', estado: sale.estado });
  }

  const totals = computeTotals(sale.detalles, sale.pagos);
  if (totals.saldo <= 0) {
    throw new AppError(errorCodes.BUSINESS_RULE, 422, { reason: 'SALE_ALREADY_PAID' });
  }
  const monto = roundHalfUp2(body.monto ?? totals.saldo);
  if (monto > totals.saldo) {
    throw new AppError(errorCodes.BUSINESS_RULE, 422, {
      reason: 'PAYMENT_EXCEEDS_BALANCE',
      total: totals.total,
      cobrado: totals.cobrado,
      monto,
    });
  }

  const successUrl = body.successUrl ?? env.PAYMENT_SUCCESS_URL;
  const cancelUrl = body.cancelUrl ?? env.PAYMENT_CANCEL_URL;
  const expiresAt = Math.floor(Date.now() / 1000) + env.STRIPE_CHECKOUT_EXPIRES_MINUTES * 60;

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        quantity: 1,
        price_data: {
          currency: env.STRIPE_CURRENCY,
          unit_amount: toMinorUnits(monto),
          product_data: { name: `Electrónica Central AZ - venta a ${sale.cliente_nombre}` },
        },
      }],
      metadata: { idVenta },
      success_url: successUrl,
      cancel_url: cancelUrl,
      expires_at: expiresAt,
    });
  } catch (error) {
    logger.error('stripe.checkout_create_failed', { idVenta, message: error.message });
    throw new AppError(errorCodes.BUSINESS_RULE, 422, {
      reason: 'PAYMENT_GATEWAY_ERROR',
      mensaje: 'La pasarela de pago rechazó la solicitud de cobro.',
      detalle: error.message,
    });
  }

  let row;
  try {
    row = await createPayment(idVenta, usuario.id, monto, ONLINE_METHOD, session.id);
  } catch (error) {
    await stripe.checkout.sessions.expire(session.id).catch(() => undefined);
    if (error.code === '23505') throw new AppError(errorCodes.CONFLICT, 409, { reason: 'DUPLICATE_REFERENCE' });
    throw error;
  }

  await logGatewayEvent('PAGO_EN_LINEA_GENERADO', `Venta ${idVenta}: ${monto} (${session.id})`, 'OK', usuario.id);
  return {
    ...mapPayment(row),
    urlPago: session.url,
    expiraEn: new Date(expiresAt * 1000).toISOString(),
  };
};

const refundUnapplicablePayment = async (stripe, pago, session, motivo) => {
  if (session.payment_intent) {
    await stripe.refunds.create(
      { payment_intent: session.payment_intent },
      { idempotencyKey: `refund-${session.id}` },
    );
  }
  await markPaymentRefunded(pago.id_pago);
  await logGatewayEvent('PAGO_EN_LINEA_DEVUELTO', `Pago ${pago.id_pago}: ${motivo}`, 'DEVUELTO');
  return { pago: pago.id_pago, resultado: 'DEVUELTO', motivo };
};

const settleCompletedSession = async (stripe, session) => {
  const pago = await getPaymentByReference(session.id);
  if (!pago) {
    logger.warn('stripe.unknown_session', { sessionId: session.id });
    return { resultado: 'IGNORADO', motivo: 'SESION_DESCONOCIDA' };
  }
  if (pago.estado === 'CONFIRMADO' || pago.estado === 'ANULADO') {
    return { pago: pago.id_pago, resultado: 'YA_PROCESADO' };
  }
  if (session.amount_total !== toMinorUnits(pago.monto)) {
    return refundUnapplicablePayment(stripe, pago, session, 'MONTO_DISTINTO');
  }
  if (pago.estado === 'RECHAZADO') {
    return refundUnapplicablePayment(stripe, pago, session, 'PAGO_RECHAZADO_ANTES');
  }

  // Stripe cobrado → confirma venta (stock) y luego el pago; si no hay stock, reembolsa.
  const saleBefore = await getSaleById(pago.id_venta);
  if (saleBefore?.estado === 'BORRADOR') {
    const saleResult = await confirmSale(pago.id_venta, pago.id_usuario);
    if (saleResult.status !== 'OK') {
      return refundUnapplicablePayment(stripe, pago, session, saleResult.status);
    }
    logger.info('venta_confirmada_por_pago', { idVenta: pago.id_venta });
    await auditSaleConfirmation(pago.id_venta, pago.id_usuario);
  }

  const result = await confirmPayment(pago.id_pago, PAYABLE_SALE_STATES);
  if (result.status === 'OK') {
    await logGatewayEvent('PAGO_EN_LINEA_CONFIRMADO', `Pago ${pago.id_pago} de venta ${pago.id_venta}`, 'OK');
    return { pago: pago.id_pago, resultado: 'CONFIRMADO' };
  }
  if (result.status === 'OVERPAY' || result.status === 'SALE_NOT_PAYABLE') {
    return refundUnapplicablePayment(stripe, pago, session, result.status);
  }
  return { pago: pago.id_pago, resultado: 'IGNORADO', motivo: result.status };
};

const rejectExpiredSession = async (session) => {
  const pago = await getPaymentByReference(session.id);
  if (!pago || pago.estado !== 'PENDIENTE') return { resultado: 'IGNORADO' };
  await rejectPayment(pago.id_pago);
  await logGatewayEvent('PAGO_EN_LINEA_RECHAZADO', `Pago ${pago.id_pago} de venta ${pago.id_venta}`, 'RECHAZADO');
  return { pago: pago.id_pago, resultado: 'RECHAZADO' };
};

export const handleStripeWebhookService = async (rawBody, signature) => {
  const stripe = requireStripe();
  if (!env.STRIPE_WEBHOOK_SECRET) {
    throw new AppError(errorCodes.SERVICE_UNAVAILABLE, 503, { reason: 'PAYMENT_WEBHOOK_NOT_CONFIGURED' });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    logger.warn('stripe.invalid_signature', { message: error.message });
    throw new AppError(errorCodes.VALIDATION_ERROR, 400, { reason: 'INVALID_WEBHOOK_SIGNATURE' });
  }

  const session = event.data.object;
  switch (event.type) {
    case 'checkout.session.completed':
      return session.payment_status === 'paid'
        ? settleCompletedSession(stripe, session)
        : { resultado: 'EN_ESPERA' };
    case 'checkout.session.async_payment_succeeded':
      return settleCompletedSession(stripe, session);
    case 'checkout.session.expired':
    case 'checkout.session.async_payment_failed':
      return rejectExpiredSession(session);
    default:
      return { resultado: 'IGNORADO', tipo: event.type };
  }
};
