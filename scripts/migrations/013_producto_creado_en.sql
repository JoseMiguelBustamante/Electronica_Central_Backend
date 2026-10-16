-- Persist product creation timestamp (date + time).
BEGIN;

ALTER TABLE electronica_az.producto
  ADD COLUMN IF NOT EXISTS creado_en timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS ix_producto_creado_en
  ON electronica_az.producto (creado_en DESC);

COMMIT;
