-- CU-23: devolución por producto defectuoso (canje si hay stock; reembolso si no).
BEGIN;

ALTER TABLE electronica_az.existencia
  ADD COLUMN IF NOT EXISTS stock_defectuoso numeric(18,4) NOT NULL DEFAULT 0;

ALTER TABLE electronica_az.existencia
  DROP CONSTRAINT IF EXISTS ck_existencia_stock_defectuoso,
  ADD CONSTRAINT ck_existencia_stock_defectuoso
    CHECK (stock_defectuoso >= 0 AND stock_defectuoso <> 'NaN'::numeric);

CREATE TABLE IF NOT EXISTS electronica_az.devolucion (
  id_devolucion uuid NOT NULL DEFAULT gen_random_uuid(),
  fecha_hora timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  motivo text NOT NULL DEFAULT 'COMPONENTE_DEFECTUOSO',
  observacion text,
  id_venta uuid NOT NULL,
  id_usuario uuid NOT NULL,
  CONSTRAINT pk_devolucion PRIMARY KEY (id_devolucion)
);

CREATE TABLE IF NOT EXISTS electronica_az.detalle_devolucion (
  id_detalle_devolucion uuid NOT NULL DEFAULT gen_random_uuid(),
  id_devolucion uuid NOT NULL,
  id_detalle_venta uuid NOT NULL,
  id_producto uuid NOT NULL,
  cantidad numeric(18,4) NOT NULL,
  resolucion varchar(120) NOT NULL,
  monto_reembolso numeric(18,2) NOT NULL DEFAULT 0,
  CONSTRAINT pk_detalle_devolucion PRIMARY KEY (id_detalle_devolucion),
  CONSTRAINT ck_detalle_devolucion_cantidad CHECK (cantidad > 0 AND cantidad <> 'NaN'::numeric),
  CONSTRAINT ck_detalle_devolucion_resolucion CHECK (resolucion IN ('CANJE', 'REEMBOLSO')),
  CONSTRAINT ck_detalle_devolucion_monto CHECK (monto_reembolso >= 0 AND monto_reembolso <> 'NaN'::numeric)
);

ALTER TABLE electronica_az.devolucion
  DROP CONSTRAINT IF EXISTS fk_devolucion_id_venta,
  ADD CONSTRAINT fk_devolucion_id_venta
    FOREIGN KEY (id_venta) REFERENCES electronica_az.venta (id_venta),
  DROP CONSTRAINT IF EXISTS fk_devolucion_id_usuario,
  ADD CONSTRAINT fk_devolucion_id_usuario
    FOREIGN KEY (id_usuario) REFERENCES electronica_az.usuario (id_usuario);

ALTER TABLE electronica_az.detalle_devolucion
  DROP CONSTRAINT IF EXISTS fk_detalle_devolucion_id_devolucion,
  ADD CONSTRAINT fk_detalle_devolucion_id_devolucion
    FOREIGN KEY (id_devolucion) REFERENCES electronica_az.devolucion (id_devolucion) ON DELETE CASCADE,
  DROP CONSTRAINT IF EXISTS fk_detalle_devolucion_id_detalle_venta,
  ADD CONSTRAINT fk_detalle_devolucion_id_detalle_venta
    FOREIGN KEY (id_detalle_venta) REFERENCES electronica_az.detalle_venta (id_detalle_venta),
  DROP CONSTRAINT IF EXISTS fk_detalle_devolucion_id_producto,
  ADD CONSTRAINT fk_detalle_devolucion_id_producto
    FOREIGN KEY (id_producto) REFERENCES electronica_az.producto (id_producto);

CREATE INDEX IF NOT EXISTS ix_devolucion_id_venta ON electronica_az.devolucion (id_venta);
CREATE INDEX IF NOT EXISTS ix_detalle_devolucion_id_detalle_venta
  ON electronica_az.detalle_devolucion (id_detalle_venta);

-- Permitir ANULADA tras devolución total de venta pagada (sin usar el flujo clásico de anulación).
-- (estado ya incluye ANULADA)

COMMIT;
