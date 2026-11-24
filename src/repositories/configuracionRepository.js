import { query } from '../lib/database.js';

export const obtenerValor = (clave) => query(
  'SELECT valor FROM electronica_az.configuracion WHERE clave = $1',
  [clave],
);

export const guardarValor = (clave, valor) => query(
  `INSERT INTO electronica_az.configuracion (clave, valor)
   VALUES ($1, $2)
   ON CONFLICT (clave) DO UPDATE SET valor = $2, actualizado_en = CURRENT_TIMESTAMP
   RETURNING valor`,
  [clave, valor],
);
