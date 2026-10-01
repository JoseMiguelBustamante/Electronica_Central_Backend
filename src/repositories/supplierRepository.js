import { query } from '../lib/database.js';

export const listSuppliers = async (buscar, activo, limite, desplazamiento) => {
  const result = await query(`
    SELECT id_proveedor, razon_social, documento, telefono, correo, direccion, activo,
      count(*) OVER() AS total
    FROM electronica_az.proveedor
    WHERE ($1::text IS NULL
        OR razon_social ILIKE '%' || $1 || '%'
        OR coalesce(documento, '') ILIKE '%' || $1 || '%')
      AND ($2::boolean IS NULL OR activo = $2)
    ORDER BY razon_social, id_proveedor
    LIMIT $3 OFFSET $4
  `, [buscar ?? null, activo ?? null, limite, desplazamiento]);
  return result.rows;
};

export const getSupplierById = async (idProveedor) => {
  const result = await query(
    `SELECT id_proveedor, razon_social, documento, telefono, correo, direccion, activo
     FROM electronica_az.proveedor WHERE id_proveedor = $1`,
    [idProveedor],
  );
  return result.rows[0] ?? null;
};

export const createSupplier = async ({
  razonSocial, documento, telefono, correo, direccion,
}) => {
  const result = await query(
    `INSERT INTO electronica_az.proveedor(
       razon_social, documento, telefono, correo, direccion
     ) VALUES ($1, $2, $3, $4, $5)
     RETURNING id_proveedor, razon_social, documento, telefono, correo, direccion, activo`,
    [razonSocial, documento ?? null, telefono ?? null, correo ?? null, direccion ?? null],
  );
  return result.rows[0];
};

export const updateSupplier = async (idProveedor, fields) => {
  const result = await query(
    `UPDATE electronica_az.proveedor SET
       razon_social = COALESCE($2, razon_social),
       documento = CASE WHEN $3::boolean THEN $4 ELSE documento END,
       telefono = CASE WHEN $5::boolean THEN $6 ELSE telefono END,
       correo = CASE WHEN $7::boolean THEN $8 ELSE correo END,
       direccion = CASE WHEN $9::boolean THEN $10 ELSE direccion END,
       activo = COALESCE($11, activo)
     WHERE id_proveedor = $1
     RETURNING id_proveedor, razon_social, documento, telefono, correo, direccion, activo`,
    [
      idProveedor,
      fields.razonSocial ?? null,
      fields.hasDocumento,
      fields.documento ?? null,
      fields.hasTelefono,
      fields.telefono ?? null,
      fields.hasCorreo,
      fields.correo ?? null,
      fields.hasDireccion,
      fields.direccion ?? null,
      fields.activo ?? null,
    ],
  );
  return result.rows[0] ?? null;
};
