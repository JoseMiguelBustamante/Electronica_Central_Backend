import { createHash } from 'node:crypto';
import { errorCodes } from '../config/errorCodes.js';
import {
  OPERACION_RECIBIR,
  cancelPurchase,
  createPurchase,
  getActiveSupplier,
  getIdempotencyRecord,
  getProductsForPurchase,
  getPurchaseById,
  listPurchases,
  receivePurchase,
  replacePurchase,
  saveIdempotencyRecord,
} from '../repositories/purchaseRepository.js';
import { AppError } from '../utils/AppError.js';
import { assertQuantityFraction } from './inventoryHelpers.js';

const hashPayload = (payload) => createHash('sha256')
  .update(JSON.stringify(payload))
  .digest('hex');

const mapDetail = (row) => ({
  idDetalleCompra: row.id_detalle_compra,
  idProducto: row.id_producto,
  cantidad: Number(row.cantidad),
  costoUnitario: Number(row.costo_unitario),
  codigo: row.codigo,
  nombre: row.nombre,
});

const mapPurchase = (row) => ({
  idCompra: row.id_compra,
  fecha: row.fecha,
  estado: row.estado,
  idProveedor: row.id_proveedor,
  proveedorRazonSocial: row.proveedor_razon_social,
  idUsuario: row.id_usuario,
  detalles: (row.detalles ?? []).map(mapDetail),
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

const assertUniqueProductLines = (detalles) => {
  const seen = new Set();
  for (const detail of detalles) {
    if (seen.has(detail.idProducto)) {
      throw new AppError(errorCodes.VALIDATION_ERROR, 400, { reason: 'DUPLICATE_PRODUCT_LINE' });
    }
    seen.add(detail.idProducto);
  }
};

const validatePurchaseLines = async (idProveedor, detalles) => {
  assertUniqueProductLines(detalles);

  const supplier = await getActiveSupplier(idProveedor);
  if (!supplier) throw new AppError(errorCodes.NOT_FOUND, 404, { reason: 'SUPPLIER_NOT_FOUND' });
  if (!supplier.activo) {
    throw new AppError(errorCodes.BUSINESS_RULE, 422, { reason: 'SUPPLIER_INACTIVE' });
  }

  const products = await getProductsForPurchase(detalles.map((d) => d.idProducto));
  const byId = new Map(products.map((row) => [row.id_producto, row]));

  for (const detail of detalles) {
    const product = byId.get(detail.idProducto);
    if (!product) throw new AppError(errorCodes.NOT_FOUND, 404, { idProducto: detail.idProducto });
    if (!product.activo) {
      throw new AppError(errorCodes.BUSINESS_RULE, 422, { reason: 'PRODUCT_INACTIVE', idProducto: detail.idProducto });
    }
    assertQuantityFraction(detail.cantidad, product.permite_fraccion);
  }
};

export const listPurchasesService = async ({ estado, idProveedor, pagina, limite }) => {
  const rows = await listPurchases(estado, idProveedor, limite, (pagina - 1) * limite);
  const total = Number(rows[0]?.total ?? 0);
  return {
    items: rows.map((row) => ({
      idCompra: row.id_compra,
      fecha: row.fecha,
      estado: row.estado,
      idProveedor: row.id_proveedor,
      proveedorRazonSocial: row.proveedor_razon_social,
      idUsuario: row.id_usuario,
    })),
    total,
    pagina,
    limite,
  };
};

export const getPurchaseService = async (id) => {
  const row = await getPurchaseById(id);
  if (!row) throw new AppError(errorCodes.NOT_FOUND);
  return mapPurchase(row);
};

export const createPurchaseService = async (body, usuario) => {
  await validatePurchaseLines(body.idProveedor, body.detalles);
  const created = await createPurchase(
    body.idProveedor,
    usuario.id,
    body.fecha ?? null,
    body.detalles,
  );
  return mapPurchase({
    ...created,
    proveedor_razon_social: undefined,
    detalles: created.detalles,
  });
};

export const updatePurchaseService = async (id, body) => {
  await validatePurchaseLines(body.idProveedor, body.detalles);
  const result = await replacePurchase(id, body.idProveedor, body.fecha ?? null, body.detalles);
  if (result.status === 'NOT_FOUND') throw new AppError(errorCodes.NOT_FOUND);
  if (result.status === 'INVALID_STATE') {
    throw new AppError(errorCodes.BUSINESS_RULE, 422, {
      reason: 'PURCHASE_NOT_PENDING',
      estado: result.estado,
    });
  }
  return mapPurchase(result.compra);
};

export const receivePurchaseService = async (id, body, usuario) => {
  const payload = { idCompra: id };
  const idem = await resolveIdempotency(
    usuario.id,
    OPERACION_RECIBIR,
    body.claveIdempotencia,
    payload,
  );
  if (idem.hit) return { cached: true, statusHttp: idem.statusHttp, data: idem.respuesta };

  const result = await receivePurchase(id, usuario.id);
  if (result.status === 'NOT_FOUND') throw new AppError(errorCodes.NOT_FOUND);
  if (result.status === 'INVALID_STATE') {
    throw new AppError(errorCodes.BUSINESS_RULE, 422, {
      reason: 'PURCHASE_NOT_PENDING',
      estado: result.estado,
    });
  }
  if (result.status === 'NO_DETAILS') {
    throw new AppError(errorCodes.BUSINESS_RULE, 422, { reason: 'PURCHASE_WITHOUT_DETAILS' });
  }
  if (result.status === 'INACTIVE_PRODUCT' || result.status === 'MISSING_EXISTENCE') {
    throw new AppError(errorCodes.BUSINESS_RULE, 422, {
      reason: result.status,
      idProducto: result.idProducto,
    });
  }

  const data = {
    compra: {
      idCompra: result.compra.id_compra,
      estado: result.compra.estado,
      idProveedor: result.compra.id_proveedor,
      fecha: result.compra.fecha,
    },
    movimientos: result.movimientos.map((row) => ({
      idMovimiento: row.id_movimiento,
      idDetalleCompra: row.id_detalle_compra,
      idProducto: row.id_producto,
      cantidad: Number(row.cantidad),
      costoUnitario: Number(row.costo_unitario),
      stockActual: Number(row.stockActual),
      costoPromedio: Number(row.costoPromedio),
    })),
  };

  const raced = await persistIdempotency(
    usuario.id, OPERACION_RECIBIR, body.claveIdempotencia, idem.hash, 200, data,
  );
  if (raced) return raced;

  return { cached: false, statusHttp: 200, data };
};

export const cancelPurchaseService = async (id) => {
  const result = await cancelPurchase(id);
  if (result.status === 'NOT_FOUND') throw new AppError(errorCodes.NOT_FOUND);
  if (result.status === 'INVALID_STATE') {
    throw new AppError(errorCodes.BUSINESS_RULE, 422, {
      reason: 'PURCHASE_NOT_PENDING',
      estado: result.estado,
    });
  }
  return {
    idCompra: result.compra.id_compra,
    estado: result.compra.estado,
    idProveedor: result.compra.id_proveedor,
    fecha: result.compra.fecha,
  };
};

export { assertUniqueProductLines };
