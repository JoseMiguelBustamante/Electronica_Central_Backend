import { errorCodes } from '../config/errorCodes.js';
import { AppError } from '../utils/AppError.js';

export const OPENING_COST_FACTOR = 0.65;
export const MAX_FRACTION_DECIMALS = 4;

export const computeOpeningCost = (precioExcel) => {
  const precio = Number(precioExcel);
  if (!Number.isFinite(precio) || precio < 0) {
    throw new AppError(errorCodes.VALIDATION_ERROR, 400, { reason: 'INVALID_PRECIO_EXCEL' });
  }
  return Number((precio * OPENING_COST_FACTOR).toFixed(4));
};

export const computeWeightedAverageCost = (stockActual, costoPromedio, cantidadEntrada, costoUnitario) => {
  const stock = Number(stockActual);
  const avg = Number(costoPromedio);
  const qty = Number(cantidadEntrada);
  const cost = Number(costoUnitario);
  const nextStock = stock + qty;
  if (nextStock <= 0) return Number(cost.toFixed(4));
  return Number((((stock * avg) + (qty * cost)) / nextStock).toFixed(4));
};

export const assertQuantityFraction = (cantidad, permiteFraccion) => {
  const value = Number(cantidad);
  if (!Number.isFinite(value) || value <= 0) {
    throw new AppError(errorCodes.VALIDATION_ERROR, 400, { reason: 'INVALID_QUANTITY' });
  }

  const asText = String(value);
  const decimalPart = asText.includes('.') ? asText.split('.')[1].replace(/0+$/, '') : '';

  if (!permiteFraccion && decimalPart.length > 0) {
    throw new AppError(errorCodes.VALIDATION_ERROR, 400, { reason: 'FRACTION_NOT_ALLOWED' });
  }

  if (permiteFraccion && decimalPart.length > MAX_FRACTION_DECIMALS) {
    throw new AppError(errorCodes.VALIDATION_ERROR, 400, { reason: 'TOO_MANY_DECIMALS' });
  }

  return value;
};

export const projectInventoryRow = (row, includeCost) => {
  const stockActual = Number(row.stock_actual);
  const stockMinimo = Number(row.stock_minimo);
  let alerta = null;
  if (stockActual === 0) alerta = 'AGOTADO';
  else if (stockActual > 0 && stockActual <= stockMinimo) alerta = 'BAJO_MINIMO';

  const projected = {
    idProducto: row.id_producto,
    codigo: row.codigo,
    nombre: row.nombre,
    stockActual,
    stockMinimo,
    ubicacion: {
      idUbicacion: row.id_ubicacion,
      codigo: row.ubicacion_codigo,
      pasillo: row.pasillo,
      estante: row.estante,
    },
    alerta,
  };

  if (includeCost) {
    projected.costoPromedio = Number(row.costo_promedio);
  }

  return projected;
};

export const stripCostFields = (row) => {
  const copy = { ...row };
  delete copy.costoPromedio;
  delete copy.costo_promedio;
  return copy;
};
