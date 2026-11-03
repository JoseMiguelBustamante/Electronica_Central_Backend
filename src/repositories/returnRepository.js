import { query, withTransaction } from '../lib/database.js';

const MOTIVO_CANJE = 'CANJE_COMPONENTE_DEFECTUOSO';

export const listReturns = (idVenta, limite, offset) => query(
  `SELECT d.id_devolucion, d.fecha_hora, d.motivo, d.observacion, d.id_venta, d.id_usuario,
          v.estado AS venta_estado, c.nombre AS cliente_nombre,
          u.nombre_usuario,
          coalesce((
            SELECT sum(dd.monto_reembolso) FROM electronica_az.detalle_devolucion dd
            WHERE dd.id_devolucion = d.id_devolucion
          ), 0)::numeric AS monto_reembolso_total,
          count(*) OVER()::int AS total
   FROM electronica_az.devolucion d
   JOIN electronica_az.venta v ON v.id_venta = d.id_venta
   JOIN electronica_az.cliente c ON c.id_cliente = v.id_cliente
   JOIN electronica_az.usuario u ON u.id_usuario = d.id_usuario
   WHERE ($1::uuid IS NULL OR d.id_venta = $1)
   ORDER BY d.fecha_hora DESC
   LIMIT $2 OFFSET $3`,
  [idVenta ?? null, limite, offset],
);

export const getReturnById = async (id) => {
  const header = await query(
    `SELECT d.id_devolucion, d.fecha_hora, d.motivo, d.observacion, d.id_venta, d.id_usuario,
            v.estado AS venta_estado, c.nombre AS cliente_nombre, u.nombre_usuario
     FROM electronica_az.devolucion d
     JOIN electronica_az.venta v ON v.id_venta = d.id_venta
     JOIN electronica_az.cliente c ON c.id_cliente = v.id_cliente
     JOIN electronica_az.usuario u ON u.id_usuario = d.id_usuario
     WHERE d.id_devolucion = $1`,
    [id],
  );
  if (!header.rows[0]) return null;
  const details = await query(
    `SELECT dd.id_detalle_devolucion, dd.id_detalle_venta, dd.id_producto, dd.cantidad,
            dd.resolucion, dd.monto_reembolso,
            p.codigo, p.nombre
     FROM electronica_az.detalle_devolucion dd
     JOIN electronica_az.producto p ON p.id_producto = dd.id_producto
     WHERE dd.id_devolucion = $1
     ORDER BY p.codigo`,
    [id],
  );
  return { ...header.rows[0], detalles: details.rows };
};

export const sumReturnedBySaleDetail = (idDetalleVenta, client = { query }) => client.query(
  `SELECT coalesce(sum(cantidad), 0)::numeric AS total
   FROM electronica_az.detalle_devolucion
   WHERE id_detalle_venta = $1`,
  [idDetalleVenta],
);

/**
 * Creates a defective-product return.
 * Always increases stock_defectuoso. CANJE if sellable stock covers qty; else REEMBOLSO.
 */
export const createDefectiveReturn = async ({
  idVenta,
  idUsuario,
  observacion,
  lineas,
}) => withTransaction(async (client) => {
  const lockedSale = await client.query(
    `SELECT id_venta, estado FROM electronica_az.venta WHERE id_venta = $1 FOR UPDATE`,
    [idVenta],
  );
  const venta = lockedSale.rows[0];
  if (!venta) return { status: 'NOT_FOUND' };
  if (venta.estado !== 'CONFIRMADA') return { status: 'INVALID_STATE', estado: venta.estado };

  const pagos = await client.query(
    `SELECT coalesce(sum(monto), 0)::numeric AS cobrado
     FROM electronica_az.pago
     WHERE id_venta = $1 AND estado = 'CONFIRMADO'`,
    [idVenta],
  );
  const detallesVenta = await client.query(
    `SELECT id_detalle_venta, id_producto, cantidad, precio_unitario, costo_unitario_historico
     FROM electronica_az.detalle_venta
     WHERE id_venta = $1
     FOR UPDATE`,
    [idVenta],
  );
  const totalVenta = detallesVenta.rows.reduce(
    (acc, row) => acc + Number(row.cantidad) * Number(row.precio_unitario),
    0,
  );
  const cobrado = Number(pagos.rows[0].cobrado);
  const saldo = Number((Math.round((totalVenta - cobrado) * 100) / 100).toFixed(2));
  if (saldo > 0) return { status: 'BALANCE_NOT_ZERO', saldo };

  const byDetail = new Map(detallesVenta.rows.map((row) => [row.id_detalle_venta, row]));
  for (const linea of lineas) {
    if (!byDetail.has(linea.idDetalleVenta)) return { status: 'DETAIL_NOT_IN_SALE' };
  }
  const productIds = [...new Set(lineas.map((l) => byDetail.get(l.idDetalleVenta).id_producto))];

  const existences = await client.query(
    `SELECT id_producto, stock_actual, stock_defectuoso, costo_promedio
     FROM electronica_az.existencia
     WHERE id_producto = ANY($1::uuid[])
     ORDER BY id_producto
     FOR UPDATE`,
    [productIds],
  );
  const existenceById = new Map(existences.rows.map((row) => [row.id_producto, row]));

  const resolved = [];
  for (const linea of lineas) {
    const detail = byDetail.get(linea.idDetalleVenta);
    const existence = existenceById.get(detail.id_producto);
    if (!existence) return { status: 'MISSING_EXISTENCE', idProducto: detail.id_producto };

    const already = await sumReturnedBySaleDetail(detail.id_detalle_venta, client);
    const yaDevuelto = Number(already.rows[0].total);
    const maxQty = Number(detail.cantidad) - yaDevuelto;
    if (linea.cantidad > maxQty) {
      return {
        status: 'QTY_EXCEEDED',
        idDetalleVenta: detail.id_detalle_venta,
        maxQty,
      };
    }

    const stockActual = Number(existence.stock_actual);
    const stockDefectuoso = Number(existence.stock_defectuoso);
    const qty = Number(linea.cantidad);
    const precio = Number(detail.precio_unitario);
    const costo = Number(detail.costo_unitario_historico);
    const canje = stockActual >= qty;
    const resolucion = canje ? 'CANJE' : 'REEMBOLSO';
    const montoReembolso = canje ? 0 : Number((Math.round(qty * precio * 100) / 100).toFixed(2));

    resolved.push({
      detail,
      existence,
      qty,
      resolucion,
      montoReembolso,
      costo,
      nextDefectuoso: stockDefectuoso + qty,
      nextStock: canje ? stockActual - qty : stockActual,
    });
  }

  const inserted = await client.query(
    `INSERT INTO electronica_az.devolucion (motivo, observacion, id_venta, id_usuario)
     VALUES ('COMPONENTE_DEFECTUOSO', $1, $2, $3)
     RETURNING id_devolucion, fecha_hora, motivo, observacion, id_venta, id_usuario`,
    [observacion ?? null, idVenta, idUsuario],
  );
  const header = inserted.rows[0];
  const outDetails = [];

  for (const item of resolved) {
    const row = await client.query(
      `INSERT INTO electronica_az.detalle_devolucion (
         id_devolucion, id_detalle_venta, id_producto, cantidad, resolucion, monto_reembolso
       ) VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        header.id_devolucion,
        item.detail.id_detalle_venta,
        item.detail.id_producto,
        item.qty,
        item.resolucion,
        item.montoReembolso,
      ],
    );

    await client.query(
      `UPDATE electronica_az.existencia
       SET stock_defectuoso = $2, stock_actual = $3
       WHERE id_producto = $1`,
      [item.detail.id_producto, item.nextDefectuoso, item.nextStock],
    );
    item.existence.stock_defectuoso = item.nextDefectuoso;
    item.existence.stock_actual = item.nextStock;

    if (item.resolucion === 'CANJE') {
      await client.query(
        `INSERT INTO electronica_az.movimiento_inventario (
           tipo, cantidad, motivo, costo_unitario, id_producto, id_usuario, id_detalle_venta
         ) VALUES ('SALIDA', $1, $2, $3, $4, $5, $6)`,
        [
          item.qty,
          MOTIVO_CANJE,
          item.costo,
          item.detail.id_producto,
          idUsuario,
          item.detail.id_detalle_venta,
        ],
      );
    }

    outDetails.push(row.rows[0]);
  }

  // Si todas las líneas de la venta están totalmente devueltas → ANULADA (sin reingresar a vendible).
  let fullyReturned = true;
  for (const detail of detallesVenta.rows) {
    const already = await sumReturnedBySaleDetail(detail.id_detalle_venta, client);
    if (Number(already.rows[0].total) < Number(detail.cantidad)) {
      fullyReturned = false;
      break;
    }
  }
  if (fullyReturned) {
    await client.query(
      `UPDATE electronica_az.venta SET estado = 'ANULADA' WHERE id_venta = $1`,
      [idVenta],
    );
  }

  return {
    status: 'OK',
    devolucion: { ...header, detalles: outDetails, ventaAnulada: fullyReturned },
  };
});
