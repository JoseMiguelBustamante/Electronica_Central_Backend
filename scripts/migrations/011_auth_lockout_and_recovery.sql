-- Login lockout counters and email recovery tokens.
BEGIN;

ALTER TABLE electronica_az.usuario
  ADD COLUMN IF NOT EXISTS intentos_fallidos integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bloqueado_hasta timestamptz;

ALTER TABLE electronica_az.usuario
  DROP CONSTRAINT IF EXISTS ck_usuario_intentos_fallidos;

ALTER TABLE electronica_az.usuario
  ADD CONSTRAINT ck_usuario_intentos_fallidos CHECK (intentos_fallidos >= 0);

CREATE TABLE IF NOT EXISTS electronica_az.token_recuperacion (
    id_token uuid NOT NULL DEFAULT gen_random_uuid(),
    token_hash text NOT NULL,
    creado_en timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expira_en timestamptz NOT NULL,
    usado_en timestamptz,
    id_usuario uuid NOT NULL,
    CONSTRAINT pk_token_recuperacion PRIMARY KEY (id_token),
    CONSTRAINT uq_token_recuperacion_hash UNIQUE (token_hash),
    CONSTRAINT fk_token_recuperacion_usuario FOREIGN KEY (id_usuario)
        REFERENCES electronica_az.usuario (id_usuario)
        ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS ix_token_recuperacion_usuario
  ON electronica_az.token_recuperacion (id_usuario, expira_en)
  WHERE usado_en IS NULL;

CREATE INDEX IF NOT EXISTS ix_usuario_bloqueado_hasta
  ON electronica_az.usuario (bloqueado_hasta)
  WHERE bloqueado_hasta IS NOT NULL;

COMMIT;
