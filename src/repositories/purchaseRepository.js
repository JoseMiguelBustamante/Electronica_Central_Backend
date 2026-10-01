import { query, withTransaction } from '../lib/database.js';

const MOTIVO_RECEPCION = 'RECEPCION_COMPRA';
const OPERACION_RECIBIR = 'COMPRA_RECIBIR';

export const listPurchases = async (estado, idProveedor, limite, desplazamiento) => {
  const result = await query(`
    SELECT c.id_compra, c.fecha, c.estado, c.id_proveedor, c.id_usuario,
      p.razon_social AS proveedor_razon_social,
      count(*) OVER() AS total
    FROM electronica_az.compra c
    JOIN electronica_az.proveedor p ON p.id_proveedor = c.id_proveedor
    WHERE ($1::text IS NULL OR c.estado = $1)
      AND ($2::uuid IS NULL OR c.id_proveedor = $2)
    ORDER BY c.fecha DESC, c.id_compra DESC
    LIMIT $3 OFFSET $4
  `, [estado ?? null, idProveedor ?? null, limite, desplazamiento]);
  return result.rows;
};

export const getPurchaseById = async (idCompra) => {
  const header = await query(
    `SELECT c.id_compra, c.fecha, c.estado, c.id_proveedor, c.id_usuario,
       p.razon_social AS proveedor_razon_social, p.activo AS proveedor_activo
     FROM electronica_az.compra c
     JOIN electronica_az.proveedor p ON p.id_proveedor = c.id_proveedor
     WHERE c.id_compra = $1`,
    [idCompra],
  );
  if (!header.rows[0]) return null;

  const details = await query(
    `SELECT d.id_detalle_compra, d.id_producto, d.cantidad, d.costo_unitario,
       pr.codigo, pr.nombre, um.permite_fraccion, pr.activo AS producto_activo
     FROM electronica_az.detalle_compra d
     JOIN electronica_az.producto pr ON pr.id_producto = d.id_producto
     JOIN electronica_az.unidad_medida um ON um.id_unidad_medida = pr.id_unidad_medida
     WHERE d.id_compra = $1
     ORDER BY d.id_producto`,
    [idCompra],
  );

  return { ...header.rows[0], detalles: details.rows };
};

export const getActiveSupplier = async (idProveedor) => {
  const result = await query(
    `SELECT id_proveedor, razon_social, activo
     FROM electronica_az.proveedor WHERE id_proveedor = $1`,
    [idProveedor],
  );
  return result.rows[0] ?? null;
};

export const getProductsForPurchase = async (ids) => {
  if (!ids.length) return [];
  const result = await query(
    `SELECT p.id_producto, p.codigo, p.nombre, p.activo, um.permite_fraccion
     FROM electronica_az.producto p
     JOIN electronica_az.unidad_medida um ON um.id_unidad_medida = p.id_unidad_medida
     WHERE p.id_producto = ANY($1::uuid[])`,
    [ids],
  );
  return result.rows;
};

export const createPurchase = async (idProveedor, idUsuario, fecha, detalles) => (
  withTransaction(async (client) => {
    const compra = await client.query(
      `INSERT INTO electronica_az.compra(id_proveedor, id_usuario, fecha, estado)
       VALUES ($1, $2, COALESCE($3::timestamptz, CURRENT_TIMESTAMP), 'PENDIENTE')
       RETURNING id_compra, fecha, estado, id_proveedor, id_usuario`,
      [idProveedor, idUsuario, fecha ?? null],
    );

    const inserted = [];
    for (const detail of detalles) {
      const row = await client.query(
        `INSERT INTO electronica_az.detalle_compra(
           id_compra, id_producto, cantidad, costo_unitario
         ) VALUES ($1, $2, $3, $4)
         RETURNING id_detalle_compra, id_producto, cantidad, costo_unitario`,
        [compra.rows[0].id_compra, detail.idProducto, detail.cantidad, detail.costoUnitario],
      );
      inserted.push(row.rows[0]);
    }

    return { ...compra.rows[0], detalles: inserted };
  })
);

export const replacePurchase = async (idCompra, idProveedor, fecha, detalles) => (
  withTransaction(async (client) => {
    const locked = await client.query(
      `SELECT id_compra, estado FROM electronica_az.compra
       WHERE id_compra = $1 FOR UPDATE`,
      [idCompra],
    );
    const compra = locked.rows[0];
    if (!compra) return { status: 'NOT_FOUND' };
    if (compra.estado !== 'PENDIENTE') return { status: 'INVALID_STATE', estado: compra.estado };

    await client.query(
      `UPDATE electronica_az.compra
       SET id_proveedor = $2,
           fecha = COALESCE($3::timestamptz, fecha)
       WHERE id_compra = $1`,
      [idCompra, idProveedor, fecha ?? null],
    );
    await client.query(
      'DELETE FROM electronica_az.detalle_compra WHERE id_compra = $1',
      [idCompra],
    );

    const inserted = [];
    for (const detail of detalles) {
      const row = await client.query(
        `INSERT INTO electronica_az.detalle_compra(
           id_compra, id_producto, cantidad, costo_unitario
         ) VALUES ($1, $2, $3, $4)
         RETURNING id_detalle_compra, id_producto, cantidad, costo_unitario`,
        [idCompra, detail.idProducto, detail.cantidad, detail.costoUnitario],
      );
      inserted.push(row.rows[0]);
    }

    const updated = await client.query(
      `SELECT id_compra, fecha, estado, id_proveedor, id_usuario
       FROM electronica_az.compra WHERE id_compra = $1`,
      [idCompra],
    );
    return { status: 'OK', compra: { ...updated.rows[0], detalles: inserted } };
  })
);

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

export const receivePurchase = async (idCompra, idUsuario) => withTransaction(async (client) => {
  const locked = await client.query(
    `SELECT id_compra, estado, id_proveedor, id_usuario, fecha
     FROM electronica_az.compra
     WHERE id_compra = $1
     FOR UPDATE`,
    [idCompra],
  );
  const compra = locked.rows[0];
  if (!compra) return { status: 'NOT_FOUND' };
  if (compra.estado !== 'PENDIENTE') return { status: 'INVALID_STATE', estado: compra.estado };

  const details = await client.query(
    `SELECT d.id_detalle_compra, d.id_producto, d.cantidad, d.costo_unitario,
       p.activo AS producto_activo, um.permite_fraccion
     FROM electronica_az.detalle_compra d
     JOIN electronica_az.producto p ON p.id_producto = d.id_producto
     JOIN electronica_az.unidad_medida um ON um.id_unidad_medida = p.id_unidad_medida
     WHERE d.id_compra = $1
     ORDER BY d.id_producto`,
    [idCompra],
  );
  if (!details.rows.length) return { status: 'NO_DETAILS' };

  const productIds = details.rows.map((row) => row.id_producto);
  const existences = await client.query(
    `SELECT e.id_producto, e.stock_actual, e.stock_minimo, e.costo_promedio
     FROM electronica_az.existencia e
     WHERE e.id_producto = ANY($1::uuid[])
     ORDER BY e.id_producto
     FOR UPDATE OF e`,
    [productIds],
  );
  const existenceById = new Map(existences.rows.map((row) => [row.id_producto, row]));

  const movimientos = [];
  for (const detail of details.rows) {
    if (!detail.producto_activo) {
      return { status: 'INACTIVE_PRODUCT', idProducto: detail.id_producto };
    }
    const existence = existenceById.get(detail.id_producto);
    if (!existence) return { status: 'MISSING_EXISTENCE', idProducto: detail.id_producto };

    const stockActual = Number(existence.stock_actual);
    const costoPromedio = Number(existence.costo_promedio);
    const cantidad = Number(detail.cantidad);
    const costoUnitario = Number(detail.costo_unitario);
    const nextStock = stockActual + cantidad;
    const nextAvg = nextStock > 0
      ? Number((((stockActual * costoPromedio) + (cantidad * costoUnitario)) / nextStock).toFixed(4))
      : costoUnitario;

    const movimiento = await client.query(
      `INSERT INTO electronica_az.movimiento_inventario(
         tipo, cantidad, motivo, costo_unitario, id_producto, id_usuario, id_detalle_compra
       ) VALUES ('ENTRADA', $1, $2, $3, $4, $5, $6)
       RETURNING id_movimiento, id_detalle_compra, id_producto, cantidad, costo_unitario`,
      [
        cantidad,
        MOTIVO_RECEPCION,
        costoUnitario,
        detail.id_producto,
        idUsuario,
        detail.id_detalle_compra,
      ],
    );

    await client.query(
      `UPDATE electronica_az.existencia
       SET stock_actual = $2, costo_promedio = $3
       WHERE id_producto = $1`,
      [detail.id_producto, nextStock, nextAvg],
    );

    existence.stock_actual = nextStock;
    existence.costo_promedio = nextAvg;
    movimientos.push({
      ...movimiento.rows[0],
      stockActual: nextStock,
      costoPromedio: nextAvg,
    });
  }

  await client.query(
    `UPDATE electronica_az.compra SET estado = 'RECIBIDA' WHERE id_compra = $1`,
    [idCompra],
  );

  return {
    status: 'OK',
    compra: { ...compra, estado: 'RECIBIDA' },
    movimientos,
  };
});

export const cancelPurchase = async (idCompra) => withTransaction(async (client) => {
  const locked = await client.query(
    `SELECT id_compra, estado, id_proveedor, id_usuario, fecha
     FROM electronica_az.compra
     WHERE id_compra = $1
     FOR UPDATE`,
    [idCompra],
  );
  const compra = locked.rows[0];
  if (!compra) return { status: 'NOT_FOUND' };
  if (compra.estado !== 'PENDIENTE') return { status: 'INVALID_STATE', estado: compra.estado };

  await client.query(
    `UPDATE electronica_az.compra SET estado = 'CANCELADA' WHERE id_compra = $1`,
    [idCompra],
  );
  return { status: 'OK', compra: { ...compra, estado: 'CANCELADA' } };
});

export { OPERACION_RECIBIR, MOTIVO_RECEPCION };
