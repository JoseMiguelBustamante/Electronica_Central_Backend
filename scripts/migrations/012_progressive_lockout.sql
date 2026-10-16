-- Progressive login lockout level (duration doubles per lock cycle).
BEGIN;

ALTER TABLE electronica_az.usuario
  ADD COLUMN IF NOT EXISTS nivel_bloqueo integer NOT NULL DEFAULT 0;

ALTER TABLE electronica_az.usuario
  DROP CONSTRAINT IF EXISTS ck_usuario_nivel_bloqueo;

ALTER TABLE electronica_az.usuario
  ADD CONSTRAINT ck_usuario_nivel_bloqueo CHECK (nivel_bloqueo >= 0);

COMMIT;
