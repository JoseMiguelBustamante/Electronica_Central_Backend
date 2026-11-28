-- 019: backfill de costo_unitario_historico en detalle_venta.
-- Contexto: las ventas registradas antes de la carga de compras quedaron con
-- costo 0 (el costo se congela al crear la venta desde existencia.costo_promedio,
-- que todavía era 0). Esto hacía que el reporte de ganancias mostrara
-- ganancia = precio de venta.
--
-- Criterio del backfill (solo filas con costo 0, dentro de una transacción):
--   1. costo unitario de la compra RECIBIDA más reciente ANTERIOR a la venta
--   2. si no hubo compra previa, la primera compra RECIBIDA conocida del producto
--   3. si el producto nunca se compró, existencia.costo_promedio actual
--   4. si no hay ningún costo conocido, se deja 0 (no se inventan costos)
--
-- La tabla de respaldo conserva los valores originales para poder revertir.

BEGIN;

CREATE TABLE IF NOT EXISTS electronica_az.backup_costo_historico_019 (
  id_detalle_venta uuid PRIMARY KEY,
  costo_original numeric(18,4) NOT NULL,
  respaldado_en timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO electronica_az.backup_costo_historico_019 (id_detalle_venta, costo_original)
SELECT d.id_detalle_venta, d.costo_unitario_historico
FROM electronica_az.detalle_venta d
WHERE d.costo_unitario_historico = 0
ON CONFLICT (id_detalle_venta) DO NOTHING;

UPDATE electronica_az.detalle_venta d
SET costo_unitario_historico = coalesce(
  (
    SELECT dc.costo_unitario
    FROM electronica_az.detalle_compra dc
    JOIN electronica_az.compra c ON c.id_compra = dc.id_compra
    WHERE dc.id_producto = d.id_producto
      AND c.estado = 'RECIBIDA'
      AND c.fecha <= (SELECT v.fecha_hora FROM electronica_az.venta v WHERE v.id_venta = d.id_venta)
    ORDER BY c.fecha DESC, dc.id_detalle_compra DESC
    LIMIT 1
  ),
  (
    SELECT dc.costo_unitario
    FROM electronica_az.detalle_compra dc
    JOIN electronica_az.compra c ON c.id_compra = dc.id_compra
    WHERE dc.id_producto = d.id_producto
      AND c.estado = 'RECIBIDA'
    ORDER BY c.fecha ASC, dc.id_detalle_compra ASC
    LIMIT 1
  ),
  (SELECT x.costo_promedio FROM electronica_az.existencia x WHERE x.id_producto = d.id_producto),
  0
)
WHERE d.costo_unitario_historico = 0;

COMMIT;
