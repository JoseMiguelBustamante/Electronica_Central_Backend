/**
 * Concatena backend/scripts/migrations/001..010 en un solo SQL.
 * Salida: docs/db/electronica_az_all_migrations.sql
 *
 * Uso: node scripts/buildAllMigrationsSql.js
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, 'migrations');
const outDir = resolve(__dirname, '../db');
const outPath = join(outDir, 'electronica_az_all_migrations.sql');

const files = readdirSync(migrationsDir)
  .filter((f) => /^\d{3}_.+\.sql$/i.test(f))
  .sort((a, b) => a.localeCompare(b, 'en'));

if (files.length === 0) {
  throw new Error(`No migrations found in ${migrationsDir}`);
}

const header = `-- =============================================================================
-- Electrónica Central AZ — esquema completo (migraciones 001 → 010)
-- =============================================================================
-- Generado automáticamente. No editar a mano: regenerar con:
--   cd backend && npm run db:bundle
--
-- Origen: backend/scripts/migrations/${files[0]} … ${files[files.length - 1]}
--
-- Uso (BD vacía / nueva):
--   1. CREATE DATABASE … (si aplica; en Supabase no crear DB)
--   2. Ejecutar ESTE archivo completo en DBeaver / psql / SQL Editor
--   3. npm run bootstrap:security
--   4. (opcional) seed Excel: 01_cleanup + 02_seed_from_excel
--
-- NO incluye datos de negocio ni usuarios (salvo lo que cree bootstrap después).
-- NO ejecutar docs/datos_Electronica_CentralAZ.sql completo.
-- =============================================================================

`;

const body = files.map((file) => {
  const sql = readFileSync(join(migrationsDir, file), 'utf8').trimEnd();
  return `-- #############################################################################
-- >>> ${file}
-- #############################################################################

${sql}
`;
}).join('\n');

const footer = `
-- =============================================================================
-- Fin bundle. Verificar:
--   SELECT nspname FROM pg_namespace WHERE nspname = 'electronica_az';
--   SELECT count(*) FROM information_schema.tables WHERE table_schema = 'electronica_az';
-- Siguiente paso: npm run bootstrap:security
-- =============================================================================
`;

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, `${header}${body}${footer}`, 'utf8');

console.log(JSON.stringify({
  outPath,
  migrations: files,
  bytes: Buffer.byteLength(`${header}${body}${footer}`),
}, null, 2));
