import { errorCodes } from '../config/errorCodes.js';
import {
  createRequest,
  getClienteById,
  getClienteByUsuarioId,
  getRequestById,
  listRequests,
  updateRequestEstado,
} from '../repositories/requestRepository.js';
import { AppError } from '../utils/AppError.js';

const isStaff = (usuario) => (usuario.roles ?? []).some(
  (role) => ['ADMINISTRADOR', 'DESARROLLADOR', 'VENDEDOR'].includes(role),
);

const isAdmin = (usuario) => (usuario.roles ?? []).some(
  (role) => ['ADMINISTRADOR', 'DESARROLLADOR'].includes(role),
);

const isClienteOnly = (usuario) => {
  const roles = usuario.roles ?? [];
  return roles.includes('CLIENTE') && !isStaff(usuario);
};

const mapRequest = (row) => ({
  idSolicitud: row.id_solicitud,
  fechaHora: row.fecha_hora,
  descripcionProducto: row.descripcion_producto,
  cantidad: Number(row.cantidad),
  estado: row.estado,
  observaciones: row.observaciones,
  idCliente: row.id_cliente,
  clienteNombre: row.cliente_nombre,
  idUsuario: row.id_usuario,
  idProducto: row.id_producto,
  idModelo: row.id_modelo,
});

export const listRequestsService = async (queryParams, usuario) => {
  let idClienteOwn = null;
  if (isClienteOnly(usuario)) {
    const cliente = await getClienteByUsuarioId(usuario.id);
    if (!cliente) throw new AppError(errorCodes.ACCESS_DENIED, 403, { reason: 'NO_CLIENT_PROFILE' });
    idClienteOwn = cliente.id_cliente;
  } else if (!usuario.permisos?.includes('SOLICITUDES_GESTIONAR')) {
    throw new AppError(errorCodes.ACCESS_DENIED);
  }

  const rows = await listRequests({
    estado: queryParams.estado,
    idClienteOwn,
    limite: queryParams.limite,
    desplazamiento: (queryParams.pagina - 1) * queryParams.limite,
  });
  return {
    items: rows.map(mapRequest),
    total: Number(rows[0]?.total ?? 0),
    pagina: queryParams.pagina,
    limite: queryParams.limite,
  };
};

export const getRequestService = async (id, usuario) => {
  const row = await getRequestById(id);
  if (!row) throw new AppError(errorCodes.NOT_FOUND);

  if (isClienteOnly(usuario)) {
    const cliente = await getClienteByUsuarioId(usuario.id);
    if (!cliente || cliente.id_cliente !== row.id_cliente) {
      throw new AppError(errorCodes.ACCESS_DENIED, 403, { reason: 'NOT_OWN_REQUEST' });
    }
  } else if (!usuario.permisos?.includes('SOLICITUDES_GESTIONAR')) {
    throw new AppError(errorCodes.ACCESS_DENIED);
  }

  return mapRequest(row);
};

export const createRequestService = async (body, usuario) => {
  let idCliente;
  if (isClienteOnly(usuario)) {
    const cliente = await getClienteByUsuarioId(usuario.id);
    if (!cliente) throw new AppError(errorCodes.ACCESS_DENIED, 403, { reason: 'NO_CLIENT_PROFILE' });
    idCliente = cliente.id_cliente;
  } else {
    if (!usuario.permisos?.includes('SOLICITUDES_GESTIONAR')) {
      throw new AppError(errorCodes.ACCESS_DENIED);
    }
    if (!body.idCliente) {
      throw new AppError(errorCodes.VALIDATION_ERROR, 400, { reason: 'ID_CLIENTE_REQUIRED' });
    }
    const cliente = await getClienteById(body.idCliente);
    if (!cliente) throw new AppError(errorCodes.NOT_FOUND, 404, { reason: 'CLIENT_NOT_FOUND' });
    idCliente = cliente.id_cliente;
  }

  const created = await createRequest({
    descripcionProducto: body.descripcionProducto,
    cantidad: body.cantidad,
    observaciones: body.observaciones,
    idCliente,
    idUsuario: usuario.id,
    idProducto: body.idProducto,
    idModelo: body.idModelo,
  });
  const full = await getRequestById(created.id_solicitud);
  return mapRequest(full);
};

export const updateRequestEstadoService = async (id, { estado }, usuario) => {
  if (!isAdmin(usuario)) {
    throw new AppError(errorCodes.ACCESS_DENIED, 403, { reason: 'ADMIN_ONLY_STATUS' });
  }
  const existing = await getRequestById(id);
  if (!existing) throw new AppError(errorCodes.NOT_FOUND);
  if (existing.estado !== 'PENDIENTE') {
    throw new AppError(errorCodes.BUSINESS_RULE, 422, {
      reason: 'REQUEST_NOT_PENDING',
      estado: existing.estado,
    });
  }

  const updated = await updateRequestEstado(id, estado);
  if (!updated) {
    throw new AppError(errorCodes.BUSINESS_RULE, 422, { reason: 'REQUEST_NOT_PENDING' });
  }
  const full = await getRequestById(id);
  return mapRequest(full);
};
