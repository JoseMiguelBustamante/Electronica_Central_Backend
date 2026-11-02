-- Alineado con rama conectar-productoymas-frontend (015_online_payments + ANULADO).
-- metodo EN_LINEA = Stripe Checkout; estado ANULADO = cobrado y reembolsado por la pasarela.
BEGIN;

ALTER TABLE electronica_az.pago DROP CONSTRAINT IF EXISTS ck_pago_estado;
ALTER TABLE electronica_az.pago
  ADD CONSTRAINT ck_pago_estado
  CHECK (estado IN ('PENDIENTE', 'CONFIRMADO', 'RECHAZADO', 'ANULADO'));

ALTER TABLE electronica_az.pago DROP CONSTRAINT IF EXISTS ck_pago_metodo;
ALTER TABLE electronica_az.pago
  ADD CONSTRAINT ck_pago_metodo
  CHECK (metodo IN ('EFECTIVO', 'QR', 'EN_LINEA', 'STRIPE'));

-- Si quedó metodo STRIPE de una migración intermedia, unificar a EN_LINEA.
UPDATE electronica_az.pago SET metodo = 'EN_LINEA' WHERE metodo = 'STRIPE';

ALTER TABLE electronica_az.pago DROP CONSTRAINT IF EXISTS ck_pago_metodo;
ALTER TABLE electronica_az.pago
  ADD CONSTRAINT ck_pago_metodo
  CHECK (metodo IN ('EFECTIVO', 'QR', 'EN_LINEA'));

COMMENT ON COLUMN electronica_az.pago.referencia_externa IS
  'Identificador del pago en el medio de cobro: comprobante QR o id de sesion Stripe Checkout';

COMMIT;
