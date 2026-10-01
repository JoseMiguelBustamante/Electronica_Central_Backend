BEGIN;

INSERT INTO electronica_az.permiso(codigo, descripcion) VALUES
  ('INVENTARIO_CONSULTAR', 'Consultar existencias, alertas y movimientos de inventario'),
  ('INVENTARIO_GESTIONAR', 'Ajustar stock, mínimos y aperturas de inventario')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO electronica_az.rol_permiso(id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso
FROM electronica_az.rol r
CROSS JOIN electronica_az.permiso p
WHERE r.nombre IN ('ADMINISTRADOR', 'DESARROLLADOR')
  AND p.codigo IN ('INVENTARIO_CONSULTAR', 'INVENTARIO_GESTIONAR')
ON CONFLICT DO NOTHING;

INSERT INTO electronica_az.rol_permiso(id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso
FROM electronica_az.rol r
JOIN electronica_az.permiso p ON p.codigo = 'INVENTARIO_CONSULTAR'
WHERE r.nombre = 'VENDEDOR'
ON CONFLICT DO NOTHING;

COMMIT;
