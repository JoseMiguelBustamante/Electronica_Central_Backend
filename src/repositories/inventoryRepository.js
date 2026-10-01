import { query, withTransaction } from '../lib/database.js';

export const getInventoryList = async (buscar, limite, desplazamiento) => {
  const result = await query(`
    SELECT e.id_producto, e.stock_actual, e.stock_minimo, e.costo_promedio,
      p.codigo, p.nombre, p.activo,
      u.id_ubicacion, u.codigo AS ubicacion_codigo, u.pasillo, u.estante,
      count(*) OVER() AS total
    FROM electronica_az.existencia e
    JOIN electronica_az.producto p ON p.id_producto = e.id_producto
    JOIN electronica_az.ubicacion u ON u.id_ubicacion = p.id_ubicacion
    WHERE p.activo
      AND ($1::text IS NULL OR p.codigo ILIKE '%' || $1 || '%' OR p.nombre ILIKE '%' || $1 || '%')
    ORDER BY p.nombre, p.codigo
    LIMIT $2 OFFSET $3
  `, [buscar, limite, desplazamiento]);
  return result.rows;
};

export const getInventoryAlerts = async (limite, desplazamiento) => {
  const result = await query(`
    SELECT e.id_producto, e.stock_actual, e.stock_minimo, e.costo_promedio,
      p.codigo, p.nombre, p.activo,
      u.id_ubicacion, u.codigo AS ubicacion_codigo, u.pasillo, u.estante,
      count(*) OVER() AS total
    FROM electronica_az.existencia e
    JOIN electronica_az.producto p ON p.id_producto = e.id_producto
    JOIN electronica_az.ubicacion u ON u.id_ubicacion = p.id_ubicacion
    WHERE p.activo
      AND (e.stock_actual = 0 OR (e.stock_actual > 0 AND e.stock_actual <= e.stock_minimo))
    ORDER BY e.stock_actual ASC, p.nombre, p.codigo
    LIMIT $1 OFFSET $2
  `, [limite, desplazamiento]);
  return result.rows;
};

export const getProductExists = async (idProducto) => {
  const result = await query(
    'SELECT id_producto, codigo, nombre, activo FROM electronica_az.producto WHERE id_producto = $1',
    [idProducto],
  );
  return result.rows[0] ?? null;
};

export const getProductByCodigo = async (codigo) => {
  const result = await query(
    `SELECT p.id_producto, p.codigo, p.nombre, p.activo,
      um.permite_fraccion
     FROM electronica_az.producto p
     JOIN electronica_az.unidad_medida um ON um.id_unidad_medida = p.id_unidad_medida
     WHERE lower(btrim(p.codigo)) = lower(btrim($1))`,
    [codigo],
  );
  return result.rows[0] ?? null;
};

export const getProductsByIds = async (ids) => {
  if (!ids.length) return [];
  const result = await query(
    `SELECT p.id_producto, p.codigo, p.nombre, p.activo,
      um.permite_fraccion
     FROM electronica_az.producto p
     JOIN electronica_az.unidad_medida um ON um.id_unidad_medida = p.id_unidad_medida
     WHERE p.id_producto = ANY($1::uuid[])`,
    [ids],
  );
  return result.rows;
};

export const getInventoryMovements = async (idProducto, limite, desplazamiento) => {
  const result = await query(`
    SELECT m.id_movimiento, m.fecha_hora, m.tipo, m.cantidad, m.motivo, m.costo_unitario,
      m.id_producto, m.id_usuario,
      u.nombre_usuario,
      count(*) OVER() AS total
    FROM electronica_az.movimiento_inventario m
    JOIN electronica_az.usuario u ON u.id_usuario = m.id_usuario
    WHERE m.id_producto = $1
    ORDER BY m.fecha_hora ASC, m.id_movimiento ASC
    LIMIT $2 OFFSET $3
  `, [idProducto, limite, desplazamiento]);
  return result.rows;
};

export const updateStockMinimo = async (idProducto, stockMinimo) => {
  const result = await query(
    `UPDATE electronica_az.existencia
     SET stock_minimo = $2
     WHERE id_producto = $1
     RETURNING id_producto, stock_actual, stock_minimo, costo_promedio`,
    [idProducto, stockMinimo],
  );
  return result.rows[0] ?? null;
};

export const getIdempotencyRecord = async (idUsuario, operacion, clave) => {
  const result = await query(
    `SELECT id_idempotencia, hash_solicitud, estado_http, respuesta
     FROM electronica_az.idempotencia_operacion
     WHERE id_usuario = $1 AND operacion = $2 AND clave = $3`,
    [idUsuario, operacion, clave],
  );
  return result.rows[0] ?? null;
};

export const saveIdempotencyRecord = async (idUsuario, operacion, clave, hashSolicitud, estadoHttp, respuesta) => {
  const result = await query(
    `INSERT INTO electronica_az.idempotencia_operacion(
       id_usuario, operacion, clave, hash_solicitud, estado_http, respuesta
     ) VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     RETURNING id_idempotencia`,
    [idUsuario, operacion, clave, hashSolicitud, estadoHttp, JSON.stringify(respuesta)],
  );
  return result.rows[0];
};

export const getExistenceWithUnit = async (idProducto) => {
  const result = await query(
    `SELECT e.id_producto, e.stock_actual, e.stock_minimo, e.costo_promedio,
      p.codigo, p.nombre, p.activo, um.permite_fraccion
     FROM electronica_az.existencia e
     JOIN electronica_az.producto p ON p.id_producto = e.id_producto
     JOIN electronica_az.unidad_medida um ON um.id_unidad_medida = p.id_unidad_medida
     WHERE e.id_producto = $1`,
    [idProducto],
  );
  return result.rows[0] ?? null;
};

export const applyInventoryAdjustment = async (
  idProducto, tipo, cantidad, motivo, costoUnitario, idUsuario,
) => withTransaction(async (client) => {
  const locked = await client.query(
    `SELECT e.id_producto, e.stock_actual, e.stock_minimo, e.costo_promedio,
      p.activo, um.permite_fraccion
     FROM electronica_az.existencia e
     JOIN electronica_az.producto p ON p.id_producto = e.id_producto
     JOIN electronica_az.unidad_medida um ON um.id_unidad_medida = p.id_unidad_medida
     WHERE e.id_producto = $1
     FOR UPDATE OF e`,
    [idProducto],
  );
  const existence = locked.rows[0];
  if (!existence) return { status: 'NOT_FOUND' };
  if (!existence.activo) return { status: 'NOT_FOUND' };

  const stockActual = Number(existence.stock_actual);
  const costoPromedio = Number(existence.costo_promedio);
  const qty = Number(cantidad);
  const cost = Number(costoUnitario);
  const nextStock = tipo === 'ENTRADA' ? stockActual + qty : stockActual - qty;

  if (nextStock < 0) {
    return { status: 'INSUFFICIENT_STOCK', existence };
  }

  const nextCostoPromedio = tipo === 'ENTRADA' && nextStock > 0
    ? Number((((stockActual * costoPromedio) + (qty * cost)) / nextStock).toFixed(4))
    : costoPromedio;

  const movimiento = await client.query(
    `INSERT INTO electronica_az.movimiento_inventario(
       tipo, cantidad, motivo, costo_unitario, id_producto, id_usuario
     ) VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [tipo, qty, motivo, cost, idProducto, idUsuario],
  );

  const updated = await client.query(
    `UPDATE electronica_az.existencia
     SET stock_actual = $2, costo_promedio = $3
     WHERE id_producto = $1
     RETURNING id_producto, stock_actual, stock_minimo, costo_promedio`,
    [idProducto, nextStock, nextCostoPromedio],
  );

  return {
    status: 'OK',
    existence,
    movimiento: movimiento.rows[0],
    existencia: updated.rows[0],
  };
});
export const confirmOpeningBatch = async (items, idUsuario, motivo) => withTransaction(async (client) => {
  const abiertos = [];
  const omitidos = [];

  for (const item of items) {
    if (Number(item.cantidad) === 0) {
      omitidos.push({ idProducto: item.idProducto, reason: 'ZERO_QUANTITY' });
      continue;
    }

    const locked = await client.query(
      `SELECT e.id_producto, e.stock_actual, e.stock_minimo, e.costo_promedio,
        p.activo, um.permite_fraccion
       FROM electronica_az.existencia e
       JOIN electronica_az.producto p ON p.id_producto = e.id_producto
       JOIN electronica_az.unidad_medida um ON um.id_unidad_medida = p.id_unidad_medida
       WHERE e.id_producto = $1
       FOR UPDATE OF e`,
      [item.idProducto],
    );
    const existence = locked.rows[0];
    if (!existence || !existence.activo) {
      omitidos.push({ idProducto: item.idProducto, reason: 'NOT_FOUND_OR_INACTIVE' });
      continue;
    }

    const stockActual = Number(existence.stock_actual);
    const costoPromedio = Number(existence.costo_promedio);
    const cantidad = Number(item.cantidad);
    const costoUnitario = Number(item.costoUnitario);
    const nextStock = stockActual + cantidad;
    const nextAvg = nextStock > 0
      ? Number((((stockActual * costoPromedio) + (cantidad * costoUnitario)) / nextStock).toFixed(4))
      : costoUnitario;

    const movimiento = await client.query(
      `INSERT INTO electronica_az.movimiento_inventario(
         tipo, cantidad, motivo, costo_unitario, id_producto, id_usuario
       ) VALUES ('ENTRADA', $1, $2, $3, $4, $5)
       RETURNING id_movimiento, cantidad, costo_unitario`,
      [cantidad, motivo, costoUnitario, item.idProducto, idUsuario],
    );

    await client.query(
      `UPDATE electronica_az.existencia
       SET stock_actual = $2, costo_promedio = $3
       WHERE id_producto = $1`,
      [item.idProducto, nextStock, nextAvg],
    );

    abiertos.push({
      idProducto: item.idProducto,
      cantidad,
      costoUnitario,
      idMovimiento: movimiento.rows[0].id_movimiento,
      stockActual: nextStock,
      costoPromedio: nextAvg,
    });
  }

  return { abiertos, omitidos };
});
