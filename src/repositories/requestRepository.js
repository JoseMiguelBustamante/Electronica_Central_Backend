import { query } from '../lib/database.js';

export const getClienteByUsuarioId = async (idUsuario) => {
  const result = await query(
    `SELECT id_cliente, nombre, documento, id_usuario
     FROM electronica_az.cliente WHERE id_usuario = $1`,
    [idUsuario],
  );
  return result.rows[0] ?? null;
};

export const getClienteById = async (idCliente) => {
  const result = await query(
    `SELECT id_cliente, nombre, documento, id_usuario
     FROM electronica_az.cliente WHERE id_cliente = $1`,
    [idCliente],
  );
  return result.rows[0] ?? null;
};

export const listRequests = async ({ estado, idClienteOwn, limite, desplazamiento }) => {
  const result = await query(`
    SELECT s.id_solicitud, s.fecha_hora, s.descripcion_producto, s.cantidad, s.estado,
      s.observaciones, s.id_cliente, s.id_usuario, s.id_producto, s.id_modelo,
      c.nombre AS cliente_nombre,
      count(*) OVER() AS total
    FROM electronica_az.solicitud_producto s
    JOIN electronica_az.cliente c ON c.id_cliente = s.id_cliente
    WHERE ($1::text IS NULL OR s.estado = $1)
      AND ($2::uuid IS NULL OR s.id_cliente = $2)
    ORDER BY s.fecha_hora DESC, s.id_solicitud DESC
    LIMIT $3 OFFSET $4
  `, [estado ?? null, idClienteOwn ?? null, limite, desplazamiento]);
  return result.rows;
};

export const getRequestById = async (idSolicitud) => {
  const result = await query(`
    SELECT s.id_solicitud, s.fecha_hora, s.descripcion_producto, s.cantidad, s.estado,
      s.observaciones, s.id_cliente, s.id_usuario, s.id_producto, s.id_modelo,
      c.nombre AS cliente_nombre
    FROM electronica_az.solicitud_producto s
    JOIN electronica_az.cliente c ON c.id_cliente = s.id_cliente
    WHERE s.id_solicitud = $1
  `, [idSolicitud]);
  return result.rows[0] ?? null;
};

export const createRequest = async ({
  descripcionProducto, cantidad, observaciones, idCliente, idUsuario, idProducto, idModelo,
}) => {
  const result = await query(
    `INSERT INTO electronica_az.solicitud_producto(
       descripcion_producto, cantidad, observaciones, id_cliente, id_usuario, id_producto, id_modelo
     ) VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id_solicitud, fecha_hora, descripcion_producto, cantidad, estado,
       observaciones, id_cliente, id_usuario, id_producto, id_modelo`,
    [
      descripcionProducto,
      cantidad,
      observaciones ?? null,
      idCliente,
      idUsuario,
      idProducto ?? null,
      idModelo ?? null,
    ],
  );
  return result.rows[0];
};

export const updateRequestEstado = async (idSolicitud, estado) => {
  const result = await query(
    `UPDATE electronica_az.solicitud_producto
     SET estado = $2
     WHERE id_solicitud = $1 AND estado = 'PENDIENTE'
     RETURNING id_solicitud, fecha_hora, descripcion_producto, cantidad, estado,
       observaciones, id_cliente, id_usuario, id_producto, id_modelo`,
    [idSolicitud, estado],
  );
  return result.rows[0] ?? null;
};
