import { query, withTransaction } from '../lib/database.js';

export const createClient = async (data) => (
  await query(
    `INSERT INTO electronica_az.cliente(nombre, documento, telefono, correo)
     VALUES ($1, $2, $3, $4)
     RETURNING id_cliente, nombre, documento, telefono, correo`,
    [data.nombre, data.documento, data.telefono, data.correo],
  )
).rows[0];

export const listClients = async () => (
  await query(
    `SELECT id_cliente, nombre, documento, telefono, correo, id_usuario
     FROM electronica_az.cliente
     ORDER BY nombre`,
  )
).rows;

export const listUsers = async () => (
  await query(`
    SELECT u.id_usuario, u.nombre_usuario, u.correo, u.activo,
      COALESCE(array_agg(r.nombre) FILTER (WHERE r.nombre IS NOT NULL), '{}') AS roles
    FROM electronica_az.usuario u
    LEFT JOIN electronica_az.usuario_rol ur ON ur.id_usuario = u.id_usuario
    LEFT JOIN electronica_az.rol r ON r.id_rol = ur.id_rol
    GROUP BY u.id_usuario
    ORDER BY u.nombre_usuario
  `)
).rows;

export const createUser = async (username, email, passwordHash, roles) => {
  const user = (
    await query(
      `INSERT INTO electronica_az.usuario(nombre_usuario, correo, hash_contrasena)
       VALUES ($1, $2, $3)
       RETURNING id_usuario, nombre_usuario, correo`,
      [username, email, passwordHash],
    )
  ).rows[0];

  await query(
    `INSERT INTO electronica_az.usuario_rol(id_usuario, id_rol)
     SELECT $1, id_rol FROM electronica_az.rol WHERE nombre = ANY($2)`,
    [user.id_usuario, roles],
  );
  return user;
};

export const userById = async (id) => (
  await query(`
    SELECT u.id_usuario, u.nombre_usuario, u.correo, u.hash_contrasena, u.activo,
      COALESCE(array_agg(r.nombre) FILTER (WHERE r.nombre IS NOT NULL), '{}') AS roles
    FROM electronica_az.usuario u
    LEFT JOIN electronica_az.usuario_rol ur ON ur.id_usuario = u.id_usuario
    LEFT JOIN electronica_az.rol r ON r.id_rol = ur.id_rol
    WHERE u.id_usuario = $1
    GROUP BY u.id_usuario
  `, [id])
).rows[0];

export const setUserPassword = async (id, hash) => query(
  'UPDATE electronica_az.usuario SET hash_contrasena = $1 WHERE id_usuario = $2',
  [hash, id],
);

export const revokeUserSessions = async (id) => query(
  `UPDATE electronica_az.sesion_usuario
   SET revocada_en = CURRENT_TIMESTAMP
   WHERE id_usuario = $1 AND revocada_en IS NULL`,
  [id],
);

export const addLog = async (action, object, result, userId, { ip = null, tabla = null } = {}) => query(
  `INSERT INTO electronica_az.registro_bitacora(accion, objeto_afectado, resultado, id_usuario, direccion_ip, tabla_afectada)
   VALUES ($1, $2, $3, $4, $5::inet, $6)`,
  [action, object, result, userId, ip, tabla],
);

export const updateUser = async (id, { nombreUsuario, correo, activo, roles }) => withTransaction(async (client) => {
  const user = (
    await client.query(
      `UPDATE electronica_az.usuario
       SET nombre_usuario = COALESCE($2, nombre_usuario),
           correo = COALESCE($3, correo),
           activo = COALESCE($4, activo)
       WHERE id_usuario = $1
       RETURNING id_usuario, nombre_usuario, correo, activo`,
      [id, nombreUsuario ?? null, correo ?? null, activo ?? null],
    )
  ).rows[0];
  if (user && roles) {
    await client.query('DELETE FROM electronica_az.usuario_rol WHERE id_usuario = $1', [id]);
    await client.query(
      `INSERT INTO electronica_az.usuario_rol(id_usuario, id_rol)
       SELECT $1, id_rol FROM electronica_az.rol WHERE nombre = ANY($2)`,
      [id, roles],
    );
  }
  return user;
});

export const listLogs = async ({ desde, hasta, usuario, accion, tabla, limite }) => (
  await query(
    `SELECT
       b.id_registro,
       b.fecha_hora,
       b.accion,
       b.objeto_afectado,
       b.resultado,
       b.id_usuario,
       host(b.direccion_ip) AS direccion_ip,
       b.tabla_afectada,
       COALESCE(
         NULLIF(btrim(actor.nombre_usuario), ''),
         NULLIF(btrim(actor.correo), ''),
         'Sin usuario'
       ) AS usuario,
       COALESCE(
         NULLIF(btrim(cliente.nombre), ''),
         NULLIF(btrim(cliente.correo), ''),
         NULLIF(btrim(afectado.nombre_usuario), ''),
         NULLIF(btrim(afectado.correo), ''),
         b.objeto_afectado
       ) AS objeto
     FROM electronica_az.registro_bitacora b
     LEFT JOIN electronica_az.usuario actor ON actor.id_usuario = b.id_usuario
     LEFT JOIN electronica_az.cliente cliente ON cliente.id_cliente::text = b.objeto_afectado
     LEFT JOIN electronica_az.usuario afectado ON afectado.id_usuario::text = b.objeto_afectado
     WHERE ($1::date IS NULL OR b.fecha_hora >= ($1::date::timestamp AT TIME ZONE 'America/La_Paz'))
       AND ($2::date IS NULL OR b.fecha_hora < (($2::date + 1)::timestamp AT TIME ZONE 'America/La_Paz'))
       AND ($3::text IS NULL OR actor.nombre_usuario ILIKE '%' || $3 || '%' OR actor.correo ILIKE '%' || $3 || '%')
       AND ($4::text IS NULL OR b.accion = $4)
       AND ($5::text IS NULL OR b.tabla_afectada = $5)
     ORDER BY b.fecha_hora DESC
     LIMIT $6`,
    [desde ?? null, hasta ?? null, usuario ?? null, accion ?? null, tabla ?? null, limite],
  )
).rows;
