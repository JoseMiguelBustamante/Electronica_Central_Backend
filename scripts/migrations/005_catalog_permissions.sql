BEGIN;

INSERT INTO electronica_az.permiso(codigo, descripcion) VALUES
  ('CATALOGO_GESTIONAR', 'Gestionar catálogos, productos y compatibilidades')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO electronica_az.rol_permiso(id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso
FROM electronica_az.rol r CROSS JOIN electronica_az.permiso p
WHERE r.nombre = 'ADMINISTRADOR' AND p.codigo = 'CATALOGO_GESTIONAR'
ON CONFLICT DO NOTHING;

CREATE UNIQUE INDEX uq_categoria_nombre_normalizado ON electronica_az.categoria(lower(btrim(nombre)));
CREATE UNIQUE INDEX uq_marca_nombre_normalizado ON electronica_az.marca(lower(btrim(nombre)));
CREATE UNIQUE INDEX uq_unidad_simbolo_normalizado ON electronica_az.unidad_medida(lower(btrim(simbolo)));
CREATE UNIQUE INDEX uq_ubicacion_codigo_normalizado ON electronica_az.ubicacion(lower(btrim(codigo)));
CREATE UNIQUE INDEX uq_modelo_marca_nombre_normalizado ON electronica_az.modelo(id_marca, lower(btrim(nombre)));
CREATE INDEX ix_producto_busqueda_publica ON electronica_az.producto(activo, codigo, nombre);

COMMIT;
