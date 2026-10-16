-- Ciclo 1 / Ciclo 2 gaps vs perfil (Grupo 14):
--   CU-4  precio de compra + margen de ganancia del producto
--   CU-13 número de comprobante único por compra
--   CU-3  tabla afectada en la bitácora (la IP ya existía en direccion_ip)
-- Solo agrega columnas e índices; no modifica datos existentes.
BEGIN;

ALTER TABLE electronica_az.producto
  ADD COLUMN IF NOT EXISTS precio_compra numeric(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS margen_ganancia numeric(9,4) NOT NULL DEFAULT 0;

ALTER TABLE electronica_az.producto
  DROP CONSTRAINT IF EXISTS ck_producto_precio_compra,
  ADD CONSTRAINT ck_producto_precio_compra CHECK (precio_compra >= 0 AND precio_compra <> 'NaN'::numeric),
  DROP CONSTRAINT IF EXISTS ck_producto_margen_ganancia,
  ADD CONSTRAINT ck_producto_margen_ganancia CHECK (margen_ganancia >= 0 AND margen_ganancia <> 'NaN'::numeric);

-- Nullable para no romper compras previas; la API lo exige en altas nuevas.
ALTER TABLE electronica_az.compra
  ADD COLUMN IF NOT EXISTS numero_comprobante varchar(120);

CREATE UNIQUE INDEX IF NOT EXISTS uq_compra_numero_comprobante
  ON electronica_az.compra (lower(btrim(numero_comprobante)))
  WHERE numero_comprobante IS NOT NULL;

ALTER TABLE electronica_az.registro_bitacora
  ADD COLUMN IF NOT EXISTS tabla_afectada varchar(120);

CREATE INDEX IF NOT EXISTS ix_registro_bitacora_fecha_hora
  ON electronica_az.registro_bitacora (fecha_hora DESC);

COMMIT;
