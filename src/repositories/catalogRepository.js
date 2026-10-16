import { query, withTransaction } from '../lib/database.js';

export const listCategories = () => query(
  `SELECT id_categoria, nombre, descripcion
   FROM electronica_az.categoria
   ORDER BY nombre`,
);

export const listBrands = () => query(
  `SELECT id_marca, nombre
   FROM electronica_az.marca
   ORDER BY nombre`,
);

export const listUnits = () => query(
  `SELECT id_unidad_medida, nombre, simbolo, permite_fraccion
   FROM electronica_az.unidad_medida
   ORDER BY nombre`,
);

export const listLocations = () => query(
  `SELECT id_ubicacion, codigo, pasillo, estante
   FROM electronica_az.ubicacion
   ORDER BY codigo`,
);

export const listModels = () => query(
  `SELECT id_modelo, nombre, descripcion, id_marca
   FROM electronica_az.modelo
   ORDER BY nombre`,
);

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

/**
 * UPDATE … SET only for the keys present in `data` (camelCase → column).
 * `null` is a real value (clears the column); `undefined` leaves it untouched.
 */
const updateColumns = (client, table, idColumn, id, columns, data) => {
  const sets = [];
  const values = [id];
  for (const [key, column] of Object.entries(columns)) {
    if (data[key] === undefined) continue;
    values.push(data[key]);
    sets.push(`${column} = $${values.length}`);
  }
  if (!sets.length) {
    return client.query(`SELECT * FROM electronica_az.${table} WHERE ${idColumn} = $1`, [id]);
  }
  return client.query(
    `UPDATE electronica_az.${table} SET ${sets.join(', ')} WHERE ${idColumn} = $1 RETURNING *`,
    values,
  );
};

const plainClient = { query };

export const updateCategory = (id, data) => updateColumns(
  plainClient, 'categoria', 'id_categoria', id, { nombre: 'nombre', descripcion: 'descripcion' }, data,
);

export const updateBrand = (id, data) => updateColumns(
  plainClient, 'marca', 'id_marca', id, { nombre: 'nombre' }, data,
);

export const updateUnit = (id, data) => updateColumns(
  plainClient, 'unidad_medida', 'id_unidad_medida', id,
  { nombre: 'nombre', simbolo: 'simbolo', permiteFraccion: 'permite_fraccion' }, data,
);

/** Changing a model's brand would break products that point to (marca, modelo); refuse it while in use. */
export const updateModel = (id, data) => withTransaction(async (client) => {
  if (data.idMarca) {
    const used = await client.query(
      `SELECT 1 FROM electronica_az.producto
       WHERE id_modelo = $1 AND id_marca IS DISTINCT FROM $2 LIMIT 1`,
      [id, data.idMarca],
    );
    if (used.rows[0]) {
      const error = new Error('MODEL_IN_USE_BY_OTHER_BRAND');
      error.code = 'MODEL_IN_USE_BY_OTHER_BRAND';
      throw error;
    }
  }
  return updateColumns(
    client, 'modelo', 'id_modelo', id,
    { nombre: 'nombre', descripcion: 'descripcion', idMarca: 'id_marca' }, data,
  );
});

export const deleteCategory = (id) => query(
  'DELETE FROM electronica_az.categoria WHERE id_categoria = $1 RETURNING *',
  [id],
);

export const deleteBrand = (id) => query(
  'DELETE FROM electronica_az.marca WHERE id_marca = $1 RETURNING *',
  [id],
);

export const deleteUnit = (id) => query(
  'DELETE FROM electronica_az.unidad_medida WHERE id_unidad_medida = $1 RETURNING *',
  [id],
);

export const deleteModel = (id) => query(
  'DELETE FROM electronica_az.modelo WHERE id_modelo = $1 RETURNING *',
  [id],
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
       OR EXISTS (
         SELECT 1 FROM electronica_az.compatibilidad co
         JOIN electronica_az.modelo mo ON mo.id_modelo = co.id_modelo
         JOIN electronica_az.producto p ON p.id_producto = co.id_producto
         WHERE p.activo AND mo.id_marca = m.id_marca
       )
    UNION ALL
    SELECT 'MODELO' AS tipo, mo.id_modelo AS id, mo.nombre
    FROM electronica_az.modelo mo
    WHERE EXISTS (SELECT 1 FROM electronica_az.producto p WHERE p.activo AND p.id_modelo = mo.id_modelo)
       OR EXISTS (
         SELECT 1 FROM electronica_az.compatibilidad co
         JOIN electronica_az.producto p ON p.id_producto = co.id_producto
         WHERE p.activo AND co.id_modelo = mo.id_modelo
       )
    ORDER BY tipo, nombre
  `);
  return result.rows;
};

const assertModelBelongsToBrand = async (client, idModelo, idMarca) => {
  if (!idModelo) return;
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
};

export const createProduct = async (
  codigo, nombre, descripcion, precioVenta, idCategoria, idUnidadMedida,
  idUbicacion, idMarca, idModelo, stockMinimo, precioCompra = 0, margenGanancia = 0,
) => withTransaction(async (client) => {
  await assertModelBelongsToBrand(client, idModelo, idMarca);

  const product = await client.query(`
    INSERT INTO electronica_az.producto(
      codigo, nombre, descripcion, precio_venta, id_categoria,
      id_unidad_medida, id_ubicacion, id_marca, id_modelo, precio_compra, margen_ganancia
    ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `, [
    codigo, nombre, descripcion, precioVenta, idCategoria, idUnidadMedida,
    idUbicacion, idMarca, idModelo, precioCompra, margenGanancia,
  ]);

  await client.query(
    'INSERT INTO electronica_az.existencia(id_producto, stock_minimo) VALUES($1, $2)',
    [product.rows[0].id_producto, stockMinimo],
  );
  return product.rows[0];
});

const productColumns = {
  codigo: 'codigo',
  nombre: 'nombre',
  descripcion: 'descripcion',
  precioVenta: 'precio_venta',
  precioCompra: 'precio_compra',
  margenGanancia: 'margen_ganancia',
  idCategoria: 'id_categoria',
  idUnidadMedida: 'id_unidad_medida',
  idUbicacion: 'id_ubicacion',
  idMarca: 'id_marca',
  idModelo: 'id_modelo',
  activo: 'activo',
};

/** Returns null when the product does not exist. */
export const updateProduct = (idProducto, data) => withTransaction(async (client) => {
  const current = await client.query(
    'SELECT id_marca, id_modelo FROM electronica_az.producto WHERE id_producto = $1 FOR UPDATE',
    [idProducto],
  );
  if (!current.rows[0]) return null;

  const idMarca = data.idMarca !== undefined ? data.idMarca : current.rows[0].id_marca;
  // Clearing the brand also clears the model (a model always belongs to one brand).
  const idModelo = data.idModelo !== undefined
    ? data.idModelo
    : (data.idMarca === null ? null : current.rows[0].id_modelo);
  await assertModelBelongsToBrand(client, idModelo, idMarca);

  const product = await updateColumns(
    client, 'producto', 'id_producto', idProducto, productColumns,
    { ...data, idModelo: data.idModelo !== undefined || data.idMarca === null ? idModelo : undefined },
  );
  if (data.stockMinimo !== undefined) {
    await client.query(
      'UPDATE electronica_az.existencia SET stock_minimo = $2 WHERE id_producto = $1',
      [idProducto, data.stockMinimo],
    );
  }
  return product.rows[0];
});

export const listAdminProducts = async ({ buscar, idCategoria, estado, limite, desplazamiento }) => {
  const result = await query(`
    SELECT p.id_producto, p.codigo, p.nombre, p.descripcion, p.precio_venta, p.precio_compra,
      p.margen_ganancia, p.activo, p.creado_en,
      p.id_categoria, c.nombre AS categoria,
      p.id_unidad_medida, um.simbolo AS unidad,
      p.id_ubicacion, ub.codigo AS ubicacion,
      p.id_marca, m.nombre AS marca,
      p.id_modelo, mo.nombre AS modelo,
      e.stock_actual, e.stock_minimo,
      count(*) OVER() AS total
    FROM electronica_az.producto p
    JOIN electronica_az.categoria c ON c.id_categoria = p.id_categoria
    JOIN electronica_az.unidad_medida um ON um.id_unidad_medida = p.id_unidad_medida
    JOIN electronica_az.ubicacion ub ON ub.id_ubicacion = p.id_ubicacion
    LEFT JOIN electronica_az.marca m ON m.id_marca = p.id_marca
    LEFT JOIN electronica_az.modelo mo ON mo.id_modelo = p.id_modelo
    LEFT JOIN electronica_az.existencia e ON e.id_producto = p.id_producto
    WHERE ($1::text IS NULL OR p.codigo ILIKE '%' || $1 || '%' OR p.nombre ILIKE '%' || $1 || '%')
      AND ($2::uuid IS NULL OR p.id_categoria = $2)
      AND ($3 = 'todos' OR p.activo = ($3 = 'activos'))
    ORDER BY p.nombre, p.codigo
    LIMIT $4 OFFSET $5
  `, [buscar ?? null, idCategoria ?? null, estado, limite, desplazamiento]);
  return result.rows;
};

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

export const listCompatibilities = async (idProducto) => (
  await query(
    `SELECT co.id_modelo, mo.nombre AS modelo, mo.id_marca, m.nombre AS marca, co.observaciones
     FROM electronica_az.compatibilidad co
     JOIN electronica_az.modelo mo ON mo.id_modelo = co.id_modelo
     JOIN electronica_az.marca m ON m.id_marca = mo.id_marca
     WHERE co.id_producto = $1
     ORDER BY m.nombre, mo.nombre`,
    [idProducto],
  )
).rows;

export const productExists = async (idProducto) => (
  await query('SELECT 1 FROM electronica_az.producto WHERE id_producto = $1', [idProducto])
).rows.length > 0;

/** Public projection: availability only, never exact stock, cost or physical location. */
export const getPublicProducts = async (buscar, idCategoria, idMarca, idModelo, limite, desplazamiento) => {
  const result = await query(`
    SELECT p.id_producto, p.codigo, p.nombre, p.descripcion, p.precio_venta, p.creado_en,
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
      AND ($3::uuid IS NULL OR p.id_marca = $3 OR EXISTS (
        SELECT 1 FROM electronica_az.compatibilidad co
        JOIN electronica_az.modelo cm ON cm.id_modelo = co.id_modelo
        WHERE co.id_producto = p.id_producto AND cm.id_marca = $3
      ))
      AND ($4::uuid IS NULL OR p.id_modelo = $4 OR EXISTS (
        SELECT 1 FROM electronica_az.compatibilidad co
        WHERE co.id_producto = p.id_producto AND co.id_modelo = $4
      ))
    ORDER BY p.nombre, p.codigo
    LIMIT $5 OFFSET $6
  `, [buscar, idCategoria, idMarca, idModelo, limite, desplazamiento]);
  return result.rows;
};

export const getPublicProductById = async (idProducto) => {
  const result = await query(`
    SELECT p.id_producto, p.codigo, p.nombre, p.descripcion, p.precio_venta, p.creado_en,
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
