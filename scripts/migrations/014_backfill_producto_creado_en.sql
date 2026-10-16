-- Prefer first inventory movement as product creation time when available.
BEGIN;

UPDATE electronica_az.producto p
SET creado_en = s.primer_mov
FROM (
  SELECT id_producto, MIN(fecha_hora) AS primer_mov
  FROM electronica_az.movimiento_inventario
  GROUP BY id_producto
) s
WHERE p.id_producto = s.id_producto
  AND s.primer_mov IS NOT NULL
  AND p.creado_en > s.primer_mov;

COMMIT;
