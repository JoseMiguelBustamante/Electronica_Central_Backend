BEGIN;

CREATE UNIQUE INDEX uq_cliente_documento_normalizado
    ON electronica_az.cliente (lower(btrim(documento)))
    WHERE documento IS NOT NULL AND btrim(documento) <> '';

CREATE INDEX ix_registro_bitacora_fecha_usuario
    ON electronica_az.registro_bitacora (fecha_hora DESC, id_usuario);

COMMIT;
