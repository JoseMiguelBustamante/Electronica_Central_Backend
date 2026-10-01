BEGIN;

INSERT INTO electronica_az.permiso(codigo, descripcion) VALUES
  ('REPORTES_CONSULTAR', 'Consultar y exportar reportes de ventas, ganancias, inventario y rotación')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO electronica_az.rol_permiso(id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso
FROM electronica_az.rol r
CROSS JOIN electronica_az.permiso p
WHERE r.nombre IN ('ADMINISTRADOR', 'DESARROLLADOR')
  AND p.codigo = 'REPORTES_CONSULTAR'
ON CONFLICT DO NOTHING;

COMMIT;
