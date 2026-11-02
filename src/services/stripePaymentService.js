import { errorCodes } from '../config/errorCodes.js';
import { getClienteByUsuarioId } from '../repositories/requestRepository.js';
import { confirmSale, getSaleById } from '../repositories/saleRepository.js';
import { AppError } from '../utils/AppError.js';
import { createOnlinePaymentService } from './paymentService.js';
import { createSaleService } from './saleService.js';

/** Carrito: crea venta CONFIRMADA y abre Checkout Stripe (mismo contrato EN_LINEA del compañero). */
export const createStripeCheckoutForCartService = async (body, usuario) => {
  const cliente = await getClienteByUsuarioId(usuario.id);
  if (!cliente) {
    throw new AppError(errorCodes.BUSINESS_RULE, 422, { reason: 'CLIENT_PROFILE_REQUIRED' });
  }

  const created = await createSaleService(
    {
      idCliente: cliente.id_cliente,
      detalles: body.items.map((item) => ({
        idProducto: item.idProducto,
        cantidad: item.cantidad,
      })),
    },
    usuario,
  );

  const confirmResult = await confirmSale(created.idVenta, usuario.id);
  if (confirmResult.status !== 'OK') {
    if (confirmResult.status === 'INSUFFICIENT_STOCK') {
      throw new AppError(errorCodes.BUSINESS_RULE, 422, {
        reason: 'INSUFFICIENT_STOCK',
        idProducto: confirmResult.idProducto,
      });
    }
    throw new AppError(errorCodes.BUSINESS_RULE, 422, {
      reason: confirmResult.status ?? 'SALE_CONFIRM_FAILED',
    });
  }

  const sale = await getSaleById(created.idVenta);
  if (!sale || sale.estado !== 'CONFIRMADA') {
    throw new AppError(errorCodes.BUSINESS_RULE, 422, { reason: 'SALE_CONFIRM_FAILED' });
  }

  const online = await createOnlinePaymentService(
    created.idVenta,
    {
      successUrl: body.successUrl,
      cancelUrl: body.cancelUrl,
    },
    usuario,
  );

  return {
    idVenta: created.idVenta,
    ...online,
    url: online.urlPago,
  };
};
