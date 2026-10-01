import { createHash } from 'node:crypto';
import { errorCodes } from '../config/errorCodes.js';
import {
  OPERACION_PAGO_CONFIRMAR,
  confirmPayment,
  createPayment,
  getIdempotencyRecord,
  getPaymentById,
  listPaymentsBySale,
  rejectPayment,
  saveIdempotencyRecord,
} from '../repositories/paymentRepository.js';
import { getSaleById } from '../repositories/saleRepository.js';
import { AppError } from '../utils/AppError.js';
import { ceilToHalfStep, roundHalfUp2 } from './saleHelpers.js';
import { computeTotals } from './saleService.js';

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

export const listPaymentsService = async (idVenta) => {
  const sale = await getSaleById(idVenta);
  if (!sale) throw new AppError(errorCodes.NOT_FOUND);
  const rows = await listPaymentsBySale(idVenta);
  return rows.map(mapPayment);
};

export const createPaymentService = async (idVenta, body, usuario) => {
  const sale = await getSaleById(idVenta);
  if (!sale) throw new AppError(errorCodes.NOT_FOUND);
  if (sale.estado !== 'CONFIRMADA') {
    throw new AppError(errorCodes.BUSINESS_RULE, 422, { reason: 'SALE_NOT_CONFIRMADA' });
  }

  const monto = ceilToHalfStep(body.monto);
  const totals = computeTotals(sale.detalles, sale.pagos);
  if (roundHalfUp2(totals.cobrado + monto) > totals.total) {
    throw new AppError(errorCodes.BUSINESS_RULE, 422, {
      reason: 'PAYMENT_EXCEEDS_BALANCE',
      total: totals.total,
      cobrado: totals.cobrado,
      monto,
    });
  }

  try {
    const row = await createPayment(
      idVenta,
      usuario.id,
      monto,
      body.metodo,
      body.referenciaExterna,
    );
    return mapPayment(row);
  } catch (error) {
    if (error.code === '23505') throw new AppError(errorCodes.CONFLICT, 409, { reason: 'DUPLICATE_REFERENCE' });
    throw error;
  }
};

export const confirmPaymentService = async (idPago, body, usuario) => {
  const payload = { idPago };
  const idem = await resolveIdempotency(
    usuario.id, OPERACION_PAGO_CONFIRMAR, body.claveIdempotencia, payload,
  );
  if (idem.hit) return { cached: true, statusHttp: idem.statusHttp, data: idem.respuesta };

  const existing = await getPaymentById(idPago);
  if (!existing) throw new AppError(errorCodes.NOT_FOUND);

  const sale = await getSaleById(existing.id_venta);
  if (!sale) throw new AppError(errorCodes.NOT_FOUND);
  const totals = computeTotals(sale.detalles, sale.pagos);

  const result = await confirmPayment(idPago, totals.total);
  if (result.status === 'NOT_FOUND') throw new AppError(errorCodes.NOT_FOUND);
  if (result.status === 'INVALID_STATE') {
    throw new AppError(errorCodes.BUSINESS_RULE, 422, {
      reason: 'PAYMENT_NOT_PENDING',
      estado: result.estado,
    });
  }
  if (result.status === 'SALE_NOT_CONFIRMADA') {
    throw new AppError(errorCodes.BUSINESS_RULE, 422, { reason: 'SALE_NOT_CONFIRMADA' });
  }
  if (result.status === 'OVERPAY') {
    throw new AppError(errorCodes.BUSINESS_RULE, 422, {
      reason: 'PAYMENT_EXCEEDS_BALANCE',
      total: result.saleTotal,
      cobrado: result.confirmedBefore,
    });
  }

  const data = mapPayment(result.pago);
  const raced = await persistIdempotency(
    usuario.id, OPERACION_PAGO_CONFIRMAR, body.claveIdempotencia, idem.hash, 200, data,
  );
  if (raced) return raced;
  return { cached: false, statusHttp: 200, data };
};

export const rejectPaymentService = async (idPago) => {
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
