import { errorCodes } from '../config/errorCodes.js';
import {
  createDefectiveReturn,
  getReturnById,
  listReturns,
} from '../repositories/returnRepository.js';
import { AppError } from '../utils/AppError.js';
import { roundHalfUp2 } from './saleHelpers.js';

const mapDetail = (row) => ({
  idDetalleDevolucion: row.id_detalle_devolucion,
  idDetalleVenta: row.id_detalle_venta,
  idProducto: row.id_producto,
  codigo: row.codigo ?? null,
  nombre: row.nombre ?? null,
  cantidad: Number(row.cantidad),
  resolucion: row.resolucion,
  montoReembolso: roundHalfUp2(Number(row.monto_reembolso ?? 0)),
});

const mapReturn = (row) => ({
  idDevolucion: row.id_devolucion,
  fechaHora: row.fecha_hora,
  motivo: row.motivo,
  observacion: row.observacion,
  idVenta: row.id_venta,
  ventaEstado: row.venta_estado ?? null,
  clienteNombre: row.cliente_nombre ?? null,
  idUsuario: row.id_usuario,
  nombreUsuario: row.nombre_usuario ?? null,
  montoReembolsoTotal: roundHalfUp2(Number(row.monto_reembolso_total ?? 0)),
  ventaAnulada: Boolean(row.ventaAnulada),
  detalles: (row.detalles ?? []).map(mapDetail),
});

export const listReturnsService = async (queryParams) => {
  const result = await listReturns(
    queryParams.idVenta,
    queryParams.limite,
    (queryParams.pagina - 1) * queryParams.limite,
  );
  const total = Number(result.rows[0]?.total ?? 0);
  return {
    items: result.rows.map((row) => mapReturn(row)),
    meta: { pagina: queryParams.pagina, limite: queryParams.limite, total },
  };
};

export const getReturnService = async (id) => {
  const row = await getReturnById(id);
  if (!row) throw new AppError(errorCodes.NOT_FOUND);
  const monto = (row.detalles ?? []).reduce((acc, d) => acc + Number(d.monto_reembolso ?? 0), 0);
  return mapReturn({ ...row, monto_reembolso_total: monto });
};

export const createReturnService = async (body, usuario) => {
  const seen = new Set();
  for (const line of body.detalles) {
    if (seen.has(line.idDetalleVenta)) {
      throw new AppError(errorCodes.VALIDATION_ERROR, 400, { reason: 'DUPLICATE_SALE_LINE' });
    }
    seen.add(line.idDetalleVenta);
  }

  const result = await createDefectiveReturn({
    idVenta: body.idVenta,
    idUsuario: usuario.id,
    observacion: body.observacion,
    lineas: body.detalles.map((d) => ({
      idDetalleVenta: d.idDetalleVenta,
      cantidad: d.cantidad,
    })),
  });

  if (result.status === 'NOT_FOUND') throw new AppError(errorCodes.NOT_FOUND);
  if (result.status === 'INVALID_STATE') {
    throw new AppError(errorCodes.BUSINESS_RULE, 422, {
      reason: 'SALE_NOT_CONFIRMED',
      estado: result.estado,
      message: 'Solo se pueden devolver ventas confirmadas y pagadas.',
    });
  }
  if (result.status === 'BALANCE_NOT_ZERO') {
    throw new AppError(errorCodes.BUSINESS_RULE, 422, {
      reason: 'SALE_BALANCE_NOT_ZERO',
      saldo: result.saldo,
      message: 'La venta debe estar totalmente pagada (saldo 0).',
    });
  }
  if (result.status === 'DETAIL_NOT_IN_SALE') {
    throw new AppError(errorCodes.BUSINESS_RULE, 422, {
      reason: 'DETAIL_NOT_IN_SALE',
      message: 'Una línea no pertenece a la venta.',
    });
  }
  if (result.status === 'MISSING_EXISTENCE') {
    throw new AppError(errorCodes.NOT_FOUND, 404, { idProducto: result.idProducto });
  }
  if (result.status === 'QTY_EXCEEDED') {
    throw new AppError(errorCodes.BUSINESS_RULE, 422, {
      reason: 'RETURN_QTY_EXCEEDED',
      idDetalleVenta: result.idDetalleVenta,
      maxQty: result.maxQty,
      message: 'La cantidad supera lo vendido menos lo ya devuelto.',
    });
  }

  const full = await getReturnById(result.devolucion.id_devolucion);
  return mapReturn({
    ...full,
    ventaAnulada: result.devolucion.ventaAnulada,
    monto_reembolso_total: (full.detalles ?? []).reduce(
      (acc, d) => acc + Number(d.monto_reembolso ?? 0),
      0,
    ),
  });
};
