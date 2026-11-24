-- T8: configuración del modelo IA en caliente, sin reiniciar el backend.
BEGIN;

CREATE TABLE IF NOT EXISTS electronica_az.configuracion (
  clave varchar(120) PRIMARY KEY,
  valor text NOT NULL,
  actualizado_en timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_configuracion_no_vacia CHECK (btrim(clave) <> '' AND btrim(valor) <> '')
);

INSERT INTO electronica_az.configuracion (clave, valor)
VALUES ('modelo_ia', 'glm5.3-flash')
ON CONFLICT (clave) DO NOTHING;

COMMENT ON TABLE electronica_az.configuracion IS
  'Parámetros ajustables en tiempo de ejecución, leídos por request sin necesidad de reiniciar el backend';

COMMIT;
