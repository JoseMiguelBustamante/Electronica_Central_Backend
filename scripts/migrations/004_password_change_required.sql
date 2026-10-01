BEGIN;
ALTER TABLE electronica_az.usuario
  ADD COLUMN cambio_contrasena_obligatorio boolean NOT NULL DEFAULT false;
COMMIT;
