import { query, withTransaction } from '../lib/database.js';

export const createCategory = (nombre, descripcion) => query(
  'INSERT INTO electronica_az.categoria(nombre, descripcion) VALUES($1, $2) RETURNING *',
  [nombre, descripcion],
);

export const createBrand = (nombre) => query(
  'INSERT INTO electronica_az.marca(nombre) VALUES($1) RETURNING *',
  [nombre],
);

export const createUnit = (nombre, simbolo, permiteFraccion) => query(
  `INSERT INTO electronica_az.unidad_medida(nombre, simbolo, permite_fraccion)
   VALUES($1, $2, $3) RETURNING *`,
  [nombre, simbolo, permiteFraccion],
);

export const createLocation = (codigo, pasillo, estante) => query(
  `INSERT INTO electronica_az.ubicacion(codigo, pasillo, estante)
   VALUES($1, $2, $3) RETURNING *`,
  [codigo, pasillo, estante],
);

export const createModel = (nombre, descripcion, idMarca) => query(
  `INSERT INTO electronica_az.modelo(nombre, descripcion, id_marca)
   VALUES($1, $2, $3) RETURNING *`,
  [nombre, descripcion, idMarca],
);

export const getCatalogFilters = async () => {
  const result = await query(`
    SELECT 'CATEGORIA' AS tipo, c.id_categoria AS id, c.nombre
    FROM electronica_az.categoria c
    WHERE EXISTS (SELECT 1 FROM electronica_az.producto p WHERE p.activo AND p.id_categoria = c.id_categoria)
    UNION ALL
    SELECT 'MARCA' AS tipo, m.id_marca AS id, m.nombre
    FROM electronica_az.marca m
    WHERE EXISTS (SELECT 1 FROM electronica_az.producto p WHERE p.activo AND p.id_marca = m.id_marca)
    UNION ALL
    SELECT 'MODELO' AS tipo, mo.id_modelo AS id, mo.nombre
    FROM electronica_az.modelo mo
    WHERE EXISTS (SELECT 1 FROM electronica_az.producto p WHERE p.activo AND p.id_modelo = mo.id_modelo)
    ORDER BY tipo, nombre
  `);
  return result.rows;
};

export const createProduct = async (
  codigo, nombre, descripcion, precioVenta, idCategoria, idUnidadMedida,
  idUbicacion, idMarca, idModelo, stockMinimo,
) => withTransaction(async (client) => {
  if (idModelo) {
    const model = await client.query(
      'SELECT id_marca FROM electronica_az.modelo WHERE id_modelo = $1',
      [idModelo],
    );
    if (!model.rows[0] || model.rows[0].id_marca !== idMarca) {
      const error = new Error('MODEL_BRAND_MISMATCH');
      error.code = 'MODEL_BRAND_MISMATCH';
      error.details = {
        idModelo,
        idMarcaEnviado: idMarca,
        idMarcaDelModelo: model.rows[0]?.id_marca ?? null,
        hint: 'El idModelo debe pertenecer a idMarca, o omite idModelo. Crea el modelo con POST /api/modelos usando la misma marca.',
      };
      throw error;
    }
  }

  const product = await client.query(`
    INSERT INTO electronica_az.producto(
      codigo, nombre, descripcion, precio_venta, id_categoria,
      id_unidad_medida, id_ubicacion, id_marca, id_modelo
    ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `, [codigo, nombre, descripcion, precioVenta, idCategoria, idUnidadMedida, idUbicacion, idMarca, idModelo]);

  await client.query(
    'INSERT INTO electronica_az.existencia(id_producto, stock_minimo) VALUES($1, $2)',
    [product.rows[0].id_producto, stockMinimo],
  );
  return product.rows[0];
});

export const deactivateProduct = (idProducto) => query(
  'UPDATE electronica_az.producto SET activo = false WHERE id_producto = $1 AND activo RETURNING *',
  [idProducto],
);

export const createCompatibility = (idProducto, idModelo, observaciones) => query(
  `INSERT INTO electronica_az.compatibilidad(id_producto, id_modelo, observaciones)
   VALUES($1, $2, $3) RETURNING *`,
  [idProducto, idModelo, observaciones],
);

export const deleteCompatibility = (idProducto, idModelo) => query(
  `DELETE FROM electronica_az.compatibilidad
   WHERE id_producto = $1 AND id_modelo = $2 RETURNING *`,
  [idProducto, idModelo],
);

export const getPublicProducts = async (buscar, idCategoria, idMarca, idModelo, limite, desplazamiento) => {
  const result = await query(`
    SELECT p.id_producto, p.codigo, p.nombre, p.descripcion, p.precio_venta,
      c.nombre AS categoria, m.nombre AS marca, mo.nombre AS modelo,
      CASE WHEN e.stock_actual > 0 THEN 'DISPONIBLE' ELSE 'NO_DISPONIBLE' END AS disponibilidad,
      count(*) OVER() AS total
    FROM electronica_az.producto p
    JOIN electronica_az.categoria c ON c.id_categoria = p.id_categoria
    LEFT JOIN electronica_az.marca m ON m.id_marca = p.id_marca
    LEFT JOIN electronica_az.modelo mo ON mo.id_modelo = p.id_modelo
    JOIN electronica_az.existencia e ON e.id_producto = p.id_producto
    WHERE p.activo
      AND ($1::text IS NULL OR p.codigo ILIKE '%' || $1 || '%' OR p.nombre ILIKE '%' || $1 || '%')
      AND ($2::uuid IS NULL OR p.id_categoria = $2)
      AND ($3::uuid IS NULL OR p.id_marca = $3)
      AND ($4::uuid IS NULL OR p.id_modelo = $4)
    ORDER BY p.nombre, p.codigo
    LIMIT $5 OFFSET $6
  `, [buscar, idCategoria, idMarca, idModelo, limite, desplazamiento]);
  return result.rows;
};

export const getPublicProductById = async (idProducto) => {
  const result = await query(`
    SELECT p.id_producto, p.codigo, p.nombre, p.descripcion, p.precio_venta,
      c.nombre AS categoria, m.nombre AS marca, mo.nombre AS modelo,
      CASE WHEN e.stock_actual > 0 THEN 'DISPONIBLE' ELSE 'NO_DISPONIBLE' END AS disponibilidad
    FROM electronica_az.producto p
    JOIN electronica_az.categoria c ON c.id_categoria = p.id_categoria
    LEFT JOIN electronica_az.marca m ON m.id_marca = p.id_marca
    LEFT JOIN electronica_az.modelo mo ON mo.id_modelo = p.id_modelo
    JOIN electronica_az.existencia e ON e.id_producto = p.id_producto
    WHERE p.activo AND p.id_producto = $1
  `, [idProducto]);
  return result.rows;
};
