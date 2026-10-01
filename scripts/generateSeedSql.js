/**
 * Genera backend/scripts/seed/seed_local_electronica_az.sql
 * para poblar catálogo + apertura desde docs/datos_Electronica_CentralAZ.sql
 *
 * Uso: node --env-file=.env scripts/generateSeedSql.js
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashPassword } from '../src/utils/password.js';
import { extractStockApertura } from './extractStockApertura.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../..');
const sqlPath = resolve(root, 'docs/datos_Electronica_CentralAZ.sql');
const outPath = join(__dirname, 'seed', 'seed_local_electronica_az.sql');
const COST_FACTOR = 0.65;

const rewriteSchema = (sql) => sql
  .replace(/\bINSERT INTO categoria\b/gi, 'INSERT INTO electronica_az.categoria')
  .replace(/\bINSERT INTO marca\b/gi, 'INSERT INTO electronica_az.marca')
  .replace(/\bINSERT INTO modelo\b/gi, 'INSERT INTO electronica_az.modelo')
  .replace(/\bINSERT INTO unidad_medida\b/gi, 'INSERT INTO electronica_az.unidad_medida')
  .replace(/\bINSERT INTO ubicacion\b/gi, 'INSERT INTO electronica_az.ubicacion')
  .replace(/\bINSERT INTO producto\b/gi, 'INSERT INTO electronica_az.producto')
  .replace(/\bINSERT INTO proveedor\b/gi, 'INSERT INTO electronica_az.proveedor')
  .replace(/\bINSERT INTO compatibilidad\b/gi, 'INSERT INTO electronica_az.compatibilidad');

const collectStatements = (sqlText, table) => {
  const lines = sqlText.split(/\r?\n/);
  const out = [];
  for (const line of lines) {
    if (new RegExp(`^INSERT INTO ${table}\\b`, 'i').test(line.trim())) {
      out.push(line.trim().replace(/;$/, '') + ';');
    }
  }
  return out;
};

const parseProductPrecios = (sqlText) => {
  const map = {};
  const re = /INSERT INTO producto[\s\S]*?VALUES\s*\(\s*'[^']+'\s*,\s*'([^']+)'\s*,\s*'[^']*'\s*,\s*(?:NULL|'[^']*')\s*,\s*([0-9]+(?:\.[0-9]+)?)/gi;
  for (const match of sqlText.matchAll(re)) {
    map[match[1]] = Number(match[2]);
  }
  return map;
};

const esc = (s) => String(s).replace(/'/g, "''");

const main = async () => {
  const raw = readFileSync(sqlPath, 'utf8');
  const precios = parseProductPrecios(raw);
  const stockRows = extractStockApertura(raw);

  const vendorEmail = process.env.SEED_VENDOR_EMAIL || 'vendedor@example.test';
  const vendorPassword = process.env.SEED_VENDOR_PASSWORD || 'ClaveVendedorSegura123';
  const vendorUsername = process.env.SEED_VENDOR_USERNAME || 'vendedor.demo';
  const vendorHash = await hashPassword(vendorPassword);

  const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL || 'admin@example.test';
  const adminUsername = process.env.BOOTSTRAP_ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD || 'change-this-admin-password';
  const adminHash = await hashPassword(adminPassword);

  const tables = [
    'categoria',
    'marca',
    'modelo',
    'unidad_medida',
    'ubicacion',
    'producto',
    'proveedor',
    'compatibilidad',
  ];

  const catalogBlocks = tables.map((t) => {
    const stmts = collectStatements(raw, t).map(rewriteSchema);
    return `-- ${t} (${stmts.length})\n${stmts.join('\n')}`;
  });

  const resolveAdminSql = `SELECT u.id_usuario INTO v_admin
  FROM electronica_az.usuario u
  JOIN electronica_az.usuario_rol ur ON ur.id_usuario = u.id_usuario
  JOIN electronica_az.rol r ON r.id_rol = ur.id_rol
  WHERE r.nombre = 'ADMINISTRADOR' AND u.activo = true
  ORDER BY CASE WHEN lower(u.correo) = lower('${esc(adminEmail)}') THEN 0 ELSE 1 END, u.correo
  LIMIT 1;
  IF v_admin IS NULL THEN
    SELECT id_usuario INTO v_admin FROM electronica_az.usuario WHERE lower(correo) = lower('${esc(adminEmail)}') LIMIT 1;
  END IF;
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'No hay ADMINISTRADOR. Re-ejecuta este SQL desde el inicio (bloque ensure admin) o corre: npm run bootstrap:security';
  END IF;`;

  const aperturaLines = [];
  for (const row of stockRows) {
    const precio = precios[row.codigo];
    if (precio == null) continue;
    const costo = Number((precio * COST_FACTOR).toFixed(4));
    aperturaLines.push(`-- ${row.codigo} qty=${row.cantidad}`);
    aperturaLines.push(`DO $$
DECLARE
  v_prod uuid;
  v_admin uuid;
  v_stock numeric(18,4);
  v_costo numeric(18,4);
BEGIN
  SELECT id_producto INTO v_prod FROM electronica_az.producto WHERE codigo = '${esc(row.codigo)}';
  IF v_prod IS NULL THEN
    RAISE NOTICE 'Producto no encontrado: ${esc(row.codigo)}';
    RETURN;
  END IF;
  ${resolveAdminSql}

  IF EXISTS (
    SELECT 1 FROM electronica_az.movimiento_inventario m
    WHERE m.id_producto = v_prod AND m.tipo = 'ENTRADA'
      AND m.motivo ILIKE 'Apertura stock demo%'
  ) THEN
    RAISE NOTICE 'Apertura ya aplicada: ${esc(row.codigo)}';
    RETURN;
  END IF;

  INSERT INTO electronica_az.existencia (id_producto, stock_actual, stock_minimo, costo_promedio)
  VALUES (v_prod, 0, 3, 0)
  ON CONFLICT (id_producto) DO NOTHING;

  SELECT stock_actual, costo_promedio INTO v_stock, v_costo
  FROM electronica_az.existencia WHERE id_producto = v_prod FOR UPDATE;

  INSERT INTO electronica_az.movimiento_inventario (
    id_producto, tipo, cantidad, costo_unitario, motivo, id_usuario, fecha_hora
  ) VALUES (
    v_prod, 'ENTRADA', ${row.cantidad}, ${costo},
    'Apertura stock demo (seed SQL)', v_admin, now()
  );

  UPDATE electronica_az.existencia
  SET stock_actual = v_stock + ${row.cantidad},
      costo_promedio = CASE
        WHEN v_stock + ${row.cantidad} = 0 THEN 0
        ELSE ((v_stock * v_costo) + (${row.cantidad} * ${costo}))
             / (v_stock + ${row.cantidad})
      END
  WHERE id_producto = v_prod;
END $$;`);
  }

  const ensureAdminBlock = `-- Asegura roles mínimos + admin bootstrap (si faltan)
INSERT INTO electronica_az.rol (nombre) VALUES
  ('CLIENTE'), ('VENDEDOR'), ('ADMINISTRADOR'), ('DESARROLLADOR')
ON CONFLICT DO NOTHING;

INSERT INTO electronica_az.usuario (nombre_usuario, correo, hash_contrasena)
SELECT '${esc(adminUsername)}', '${esc(adminEmail)}', '${esc(adminHash)}'
WHERE NOT EXISTS (
  SELECT 1 FROM electronica_az.usuario WHERE lower(correo) = lower('${esc(adminEmail)}')
);

INSERT INTO electronica_az.usuario_rol (id_usuario, id_rol)
SELECT u.id_usuario, r.id_rol
FROM electronica_az.usuario u
CROSS JOIN electronica_az.rol r
WHERE lower(u.correo) = lower('${esc(adminEmail)}')
  AND r.nombre = 'ADMINISTRADOR'
  AND NOT EXISTS (
    SELECT 1 FROM electronica_az.usuario_rol ur
    WHERE ur.id_usuario = u.id_usuario AND ur.id_rol = r.id_rol
  );`;

  const sql = `-- =============================================================================
-- Electrónica Central AZ — seed local (catálogo + apertura + vendedor/cliente)
-- =============================================================================
-- Origen: docs/datos_Electronica_CentralAZ.sql (solo catálogo / proveedores / stock)
-- NO incluye usuarios/roles/permisos del dump (incompatibles con la app).
--
-- Requisitos previos:
--   1. Migraciones aplicadas (001..010)
--   2. Este script crea el admin si falta (no hace falta bootstrap previo)
--
-- Cómo ejecutar (DBeaver / psql):
--   Ejecutar este archivo completo (Execute SQL Script)
--
-- Credenciales demo tras el seed:
--   Admin:    ${adminEmail} / ${adminPassword}
--   Vendedor: ${vendorEmail} / ${vendorPassword}
--
-- Alternativa Node:
--   npm run bootstrap:security
--   npm run seed:local
-- =============================================================================

BEGIN;

SET search_path TO electronica_az, public;

${ensureAdminBlock}

-- Catálogo: idempotente (ON CONFLICT DO NOTHING en el origen)
${catalogBlocks.join('\n\n')}

-- Existencias en 0 para todos los productos
INSERT INTO electronica_az.existencia (id_producto, stock_actual, stock_minimo, costo_promedio)
SELECT p.id_producto, 0, 3, 0
FROM electronica_az.producto p
WHERE NOT EXISTS (
  SELECT 1 FROM electronica_az.existencia e WHERE e.id_producto = p.id_producto
);

-- Cliente walk-in
INSERT INTO electronica_az.cliente (nombre, documento, telefono, correo)
SELECT 'Cliente Mostrador', 'N/A', NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM electronica_az.cliente WHERE nombre = 'Cliente Mostrador' AND documento = 'N/A'
);

-- Vendedor demo (scrypt, compatible con login API)
INSERT INTO electronica_az.usuario (nombre_usuario, correo, hash_contrasena)
SELECT '${esc(vendorUsername)}', '${esc(vendorEmail)}', '${esc(vendorHash)}'
WHERE NOT EXISTS (
  SELECT 1 FROM electronica_az.usuario WHERE lower(correo) = lower('${esc(vendorEmail)}')
);

INSERT INTO electronica_az.usuario_rol (id_usuario, id_rol)
SELECT u.id_usuario, r.id_rol
FROM electronica_az.usuario u
CROSS JOIN electronica_az.rol r
WHERE lower(u.correo) = lower('${esc(vendorEmail)}')
  AND r.nombre = 'VENDEDOR'
  AND NOT EXISTS (
    SELECT 1 FROM electronica_az.usuario_rol ur
    WHERE ur.id_usuario = u.id_usuario AND ur.id_rol = r.id_rol
  );

COMMIT;

-- =============================================================================
-- Apertura de stock (ENTRADA) — costo = PRECIO × ${COST_FACTOR}
-- Idempotente por producto (motivo ILIKE 'Apertura stock demo%')
-- =============================================================================
${aperturaLines.join('\n\n')}

-- Resumen
SELECT
  (SELECT count(*) FROM electronica_az.producto) AS productos,
  (SELECT count(*) FROM electronica_az.proveedor) AS proveedores,
  (SELECT coalesce(sum(stock_actual),0) FROM electronica_az.existencia) AS stock_total_unidades,
  (SELECT count(*) FROM electronica_az.movimiento_inventario WHERE motivo ILIKE 'Apertura stock demo%') AS movs_apertura;
`;

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, sql, 'utf8');
  console.log(JSON.stringify({
    outPath,
    catalogTables: tables.length,
    aperturaProducts: stockRows.filter((r) => precios[r.codigo] != null).length,
    vendorEmail,
  }, null, 2));
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
