-- =============================================================================
-- 01 — Limpieza de datos de prueba / seed demo
-- =============================================================================
-- Conserva: roles, permisos, admin y soporte bootstrap.
-- Borra: catálogo, inventario, compras, ventas, clientes de prueba, usuarios de test.
--
-- Ejecutar EN DBeaver ANTES de 02_seed_from_excel.sql
-- =============================================================================

BEGIN;

SET search_path TO electronica_az, public;

-- Operaciones y catálogo (CASCADE limpia FKs dependientes)
TRUNCATE TABLE
  electronica_az.pago,
  electronica_az.comprobante,
  electronica_az.detalle_venta,
  electronica_az.entrega,
  electronica_az.venta,
  electronica_az.detalle_compra,
  electronica_az.compra,
  electronica_az.movimiento_inventario,
  electronica_az.existencia,
  electronica_az.solicitud_producto,
  electronica_az.compatibilidad,
  electronica_az.producto,
  electronica_az.modelo,
  electronica_az.marca,
  electronica_az.categoria,
  electronica_az.unidad_medida,
  electronica_az.ubicacion,
  electronica_az.proveedor,
  electronica_az.idempotencia_operacion,
  electronica_az.registro_bitacora,
  electronica_az.restablecimiento_acceso,
  electronica_az.sesion_usuario
RESTART IDENTITY CASCADE;

-- Clientes (incl. walk-in de seed)
TRUNCATE TABLE electronica_az.cliente RESTART IDENTITY CASCADE;

-- Usuarios de prueba: todo excepto bootstrap admin/soporte
DELETE FROM electronica_az.usuario_rol ur
USING electronica_az.usuario u
WHERE ur.id_usuario = u.id_usuario
  AND lower(u.correo) NOT IN (lower('admin@example.test'), lower('soporte@example.test'));

DELETE FROM electronica_az.usuario u
WHERE lower(u.correo) NOT IN (lower('admin@example.test'), lower('soporte@example.test'));

COMMIT;

-- Verificación rápida
SELECT
  (SELECT count(*) FROM electronica_az.producto) AS productos,
  (SELECT count(*) FROM electronica_az.usuario) AS usuarios,
  (SELECT count(*) FROM electronica_az.venta) AS ventas;
