BEGIN;

INSERT INTO electronica_az.permiso(codigo, descripcion) VALUES
  ('COMPRAS_GESTIONAR', 'Gestionar proveedores, compras, recepción y cancelación')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO electronica_az.rol_permiso(id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso
FROM electronica_az.rol r
CROSS JOIN electronica_az.permiso p
WHERE r.nombre IN ('ADMINISTRADOR', 'DESARROLLADOR')
  AND p.codigo = 'COMPRAS_GESTIONAR'
ON CONFLICT DO NOTHING;

CREATE UNIQUE INDEX IF NOT EXISTS uq_proveedor_documento_normalizado
  ON electronica_az.proveedor (lower(btrim(documento)))
  WHERE documento IS NOT NULL AND btrim(documento) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_detalle_compra_producto
  ON electronica_az.detalle_compra (id_compra, id_producto);

COMMIT;
