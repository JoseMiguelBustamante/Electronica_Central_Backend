BEGIN;

INSERT INTO electronica_az.permiso(codigo, descripcion) VALUES
  ('VENTAS_GESTIONAR', 'Gestionar ventas, pagos, comprobante y entrega')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO electronica_az.rol_permiso(id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso
FROM electronica_az.rol r
CROSS JOIN electronica_az.permiso p
WHERE r.nombre IN ('ADMINISTRADOR', 'DESARROLLADOR', 'VENDEDOR')
  AND p.codigo = 'VENTAS_GESTIONAR'
ON CONFLICT DO NOTHING;

CREATE UNIQUE INDEX IF NOT EXISTS uq_detalle_venta_producto
  ON electronica_az.detalle_venta (id_venta, id_producto);

COMMIT;
