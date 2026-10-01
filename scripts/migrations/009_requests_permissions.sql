BEGIN;

INSERT INTO electronica_az.permiso(codigo, descripcion) VALUES
  ('SOLICITUDES_GESTIONAR', 'Registrar y consultar solicitudes de producto (personal)')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO electronica_az.rol_permiso(id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso
FROM electronica_az.rol r
CROSS JOIN electronica_az.permiso p
WHERE r.nombre IN ('ADMINISTRADOR', 'DESARROLLADOR', 'VENDEDOR')
  AND p.codigo = 'SOLICITUDES_GESTIONAR'
ON CONFLICT DO NOTHING;

COMMIT;
