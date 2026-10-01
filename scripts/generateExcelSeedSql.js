/**
 * Genera:
 *  - scripts/seed/01_cleanup_demo_data.sql  (borra seed/tests; conserva admin/soporte)
 *  - scripts/seed/02_seed_from_excel.sql    (catálogo desde Excel del negocio)
 *
 * Fuente: docs/2026 INTEGRADOS y ARDUINO.xlsx
 * Uso: node --env-file=.env scripts/generateExcelSeedSql.js
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const xlsxPath = resolve(root, 'docs/2026 INTEGRADOS y ARDUINO.xlsx');
const outDir = join(__dirname, 'seed');

const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL || 'admin@example.test';
const developerEmail = process.env.BOOTSTRAP_DEVELOPER_EMAIL || 'soporte@example.test';

const cellText = (cell) => {
  if (!cell) return null;
  let v = cell.value;
  if (v && typeof v === 'object') {
    if ('result' in v) v = v.result;
    else if ('text' in v) v = v.text;
    else if ('richText' in v) v = v.richText.map((t) => t.text).join('');
    else if ('formula' in v) v = v.result ?? null;
  }
  return v;
};

const esc = (s) => String(s).replace(/'/g, "''");
const clip = (s, n) => {
  const t = String(s ?? '').trim();
  return t.length <= n ? t : t.slice(0, n);
};

const uuidFrom = (namespace, key) => {
  const h = createHash('sha1').update(`${namespace}:${key}`).digest();
  const b = Buffer.from(h.subarray(0, 16));
  b[6] = (b[6] & 0x0f) | 0x50;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = b.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const isJunkItem = (raw) => {
  const s = String(raw ?? '').trim();
  if (!s) return true;
  if (/^item$/i.test(s)) return true;
  if (/^\d{1,2}$/.test(s)) return true; // filas basura tipo ITEM=1
  return false;
};

const readExcel = async () => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(xlsxPath);
  const items = [];

  const wsInt = workbook.getWorksheet('INTEGRADOS');
  for (let r = 2; r <= wsInt.rowCount; r += 1) {
    const row = wsInt.getRow(r);
    const raw = cellText(row.getCell(1));
    const precio = Number(cellText(row.getCell(4)));
    if (isJunkItem(raw) || !Number.isFinite(precio) || precio < 0) continue;
    items.push({
      sheet: 'INTEGRADOS',
      categoria: 'Integrados',
      codigo: clip(String(raw).trim(), 120),
      nombre: clip(String(raw).trim(), 120),
      descripcion: (() => {
        const d = cellText(row.getCell(3));
        return d == null || String(d).trim() === '' ? null : String(d).trim();
      })(),
      precio,
      caja: (() => {
        const c = cellText(row.getCell(2));
        if (c == null || String(c).trim() === '') return 'SIN-CAJA';
        return clip(String(c).trim(), 120);
      })(),
    });
  }

  const wsMod = workbook.getWorksheet('MODULOS ARDUINO');
  for (let r = 5; r <= wsMod.rowCount; r += 1) {
    const row = wsMod.getRow(r);
    const raw = cellText(row.getCell(2));
    const precio = Number(cellText(row.getCell(4)));
    if (isJunkItem(raw) || !Number.isFinite(precio) || precio < 0) continue;
    const desc = cellText(row.getCell(5));
    items.push({
      sheet: 'MODULOS ARDUINO',
      categoria: 'Modulos Arduino',
      codigo: clip(String(raw).trim(), 120),
      nombre: clip(String(raw).trim(), 120),
      descripcion: desc == null || String(desc).trim() === '' ? null : String(desc).trim(),
      precio,
      caja: (() => {
        const c = cellText(row.getCell(1));
        if (c == null || String(c).trim() === '') return 'SIN-CAJA';
        return clip(String(c).trim(), 120);
      })(),
    });
  }

  // Deduplicar por codigo (case-insensitive); primera aparición gana
  const byCode = new Map();
  const skippedDupes = [];
  for (const it of items) {
    const key = it.codigo.toLowerCase();
    if (byCode.has(key)) {
      skippedDupes.push(it.codigo);
      continue;
    }
    byCode.set(key, it);
  }
  return { products: [...byCode.values()], skippedDupes, totalRaw: items.length };
};

const buildCleanupSql = () => `-- =============================================================================
-- 01 — Limpieza de datos de prueba / seed demo
-- =============================================================================
-- Conserva: roles, permisos, admin y soporte bootstrap.
-- Borra: catálogo, inventario, compras, ventas, clientes de prueba, usuarios de test.
--
-- Ejecutar EN DBeaver ANTES de 02_seed_from_excel.sql
-- =============================================================================

BEGIN;

SET search_path TO electronica_az, public;

-- Operaciones y catálogo (CASCADE limpia FKs dependientes)
TRUNCATE TABLE
  electronica_az.pago,
  electronica_az.comprobante,
  electronica_az.detalle_venta,
  electronica_az.entrega,
  electronica_az.venta,
  electronica_az.detalle_compra,
  electronica_az.compra,
  electronica_az.movimiento_inventario,
  electronica_az.existencia,
  electronica_az.solicitud_producto,
  electronica_az.compatibilidad,
  electronica_az.producto,
  electronica_az.modelo,
  electronica_az.marca,
  electronica_az.categoria,
  electronica_az.unidad_medida,
  electronica_az.ubicacion,
  electronica_az.proveedor,
  electronica_az.idempotencia_operacion,
  electronica_az.registro_bitacora,
  electronica_az.restablecimiento_acceso,
  electronica_az.sesion_usuario
RESTART IDENTITY CASCADE;

-- Clientes (incl. walk-in de seed)
TRUNCATE TABLE electronica_az.cliente RESTART IDENTITY CASCADE;

-- Usuarios de prueba: todo excepto bootstrap admin/soporte
DELETE FROM electronica_az.usuario_rol ur
USING electronica_az.usuario u
WHERE ur.id_usuario = u.id_usuario
  AND lower(u.correo) NOT IN (lower('${esc(adminEmail)}'), lower('${esc(developerEmail)}'));

DELETE FROM electronica_az.usuario u
WHERE lower(u.correo) NOT IN (lower('${esc(adminEmail)}'), lower('${esc(developerEmail)}'));

COMMIT;

-- Verificación rápida
SELECT
  (SELECT count(*) FROM electronica_az.producto) AS productos,
  (SELECT count(*) FROM electronica_az.usuario) AS usuarios,
  (SELECT count(*) FROM electronica_az.venta) AS ventas;
`;

const buildSeedSql = ({ products, skippedDupes, totalRaw }) => {
  const catIntegrados = uuidFrom('cat', 'Integrados');
  const catModulos = uuidFrom('cat', 'Modulos Arduino');
  const idUnidad = uuidFrom('und', 'UND');

  const cajas = [...new Set(products.map((p) => p.caja))].sort((a, b) => a.localeCompare(b, 'es'));

  const categoriaSql = `-- Categorías (hojas del Excel)
INSERT INTO electronica_az.categoria (id_categoria, nombre, descripcion)
SELECT '${catIntegrados}', 'Integrados', 'Hoja INTEGRADOS del Excel de negocio'
WHERE NOT EXISTS (
  SELECT 1 FROM electronica_az.categoria WHERE lower(btrim(nombre)) = lower('Integrados')
);
INSERT INTO electronica_az.categoria (id_categoria, nombre, descripcion)
SELECT '${catModulos}', 'Modulos Arduino', 'Hoja MODULOS ARDUINO del Excel de negocio'
WHERE NOT EXISTS (
  SELECT 1 FROM electronica_az.categoria WHERE lower(btrim(nombre)) = lower('Modulos Arduino')
);`;

  const unidadSql = `INSERT INTO electronica_az.unidad_medida (id_unidad_medida, nombre, simbolo, permite_fraccion)
SELECT '${idUnidad}', 'Unidad', 'UND', false
WHERE NOT EXISTS (
  SELECT 1 FROM electronica_az.unidad_medida WHERE lower(btrim(simbolo)) = lower('UND')
);`;

  const ubicacionSql = [
    `-- Ubicaciones desde columna CAJA (${cajas.length}) — por codigo, no por UUID fijo`,
    ...cajas.map((c) => {
      const id = uuidFrom('ubic', c);
      return `INSERT INTO electronica_az.ubicacion (id_ubicacion, codigo, pasillo, estante)
SELECT '${id}', '${esc(c)}', 'GENERAL', '${esc(c)}'
WHERE NOT EXISTS (
  SELECT 1 FROM electronica_az.ubicacion WHERE lower(btrim(codigo)) = lower('${esc(c)}')
);`;
    }),
  ].join('\n');

  const productoSql = [
    `-- Productos desde Excel (${products.length}; raw=${totalRaw}; dupes omitidos=${skippedDupes.length})`,
    `-- FK por codigo/nombre (no UUID hardcodeado de ubicacion)`,
    ...products.map((p) => {
      const id = uuidFrom('prod', p.codigo.toLowerCase());
      const catName = p.categoria === 'Integrados' ? 'Integrados' : 'Modulos Arduino';
      const desc = p.descripcion == null ? 'NULL' : `'${esc(p.descripcion)}'`;
      return `INSERT INTO electronica_az.producto (
  id_producto, codigo, nombre, descripcion, precio_venta, activo,
  id_categoria, id_unidad_medida, id_ubicacion, id_marca, id_modelo
)
SELECT
  '${id}',
  '${esc(p.codigo)}',
  '${esc(p.nombre)}',
  ${desc},
  ${Number(p.precio.toFixed(4))},
  true,
  (SELECT id_categoria FROM electronica_az.categoria WHERE lower(btrim(nombre)) = lower('${esc(catName)}') LIMIT 1),
  (SELECT id_unidad_medida FROM electronica_az.unidad_medida WHERE lower(btrim(simbolo)) = lower('UND') LIMIT 1),
  (SELECT id_ubicacion FROM electronica_az.ubicacion WHERE lower(btrim(codigo)) = lower('${esc(p.caja)}') LIMIT 1),
  NULL,
  NULL
WHERE (SELECT id_ubicacion FROM electronica_az.ubicacion WHERE lower(btrim(codigo)) = lower('${esc(p.caja)}') LIMIT 1) IS NOT NULL
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio_venta = EXCLUDED.precio_venta,
  activo = true,
  id_categoria = EXCLUDED.id_categoria,
  id_ubicacion = EXCLUDED.id_ubicacion;`;
    }),
  ].join('\n');

  const existenciaSql = `INSERT INTO electronica_az.existencia (id_producto, stock_actual, stock_minimo, costo_promedio)
SELECT p.id_producto, 0, 0, 0
FROM electronica_az.producto p
WHERE NOT EXISTS (
  SELECT 1 FROM electronica_az.existencia e WHERE e.id_producto = p.id_producto
);`;

  const clienteSql = `INSERT INTO electronica_az.cliente (nombre, documento, telefono, correo)
SELECT 'Cliente Mostrador', 'N/A', NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM electronica_az.cliente WHERE nombre = 'Cliente Mostrador' AND documento = 'N/A'
);`;

  return `-- =============================================================================
-- 02 — Seed desde Excel de negocio
-- =============================================================================
-- Fuente: docs/2026 INTEGRADOS y ARDUINO.xlsx
-- Hojas: INTEGRADOS + MODULOS ARDUINO
-- Productos: ${products.length} (únicos por código)
-- Stock/costo: 0 (el Excel no trae existencias ni costo de compra; se cargan después)
-- Precio de venta: columna PRECIO del Excel
-- Ubicación: columna CAJA (FK resuelta por codigo, no por UUID hardcodeado)
--
-- Si DBeaver muestra 25P02 (transaction aborted):
--   1) Ejecuta: ROLLBACK;
--   2) Ejecuta 01_cleanup_demo_data.sql
--   3) Vuelve a ejecutar ESTE archivo completo
-- =============================================================================

BEGIN;

SET search_path TO electronica_az, public;

${categoriaSql}

${unidadSql}

${ubicacionSql}

${productoSql}

${existenciaSql}

${clienteSql}

COMMIT;

SELECT
  (SELECT count(*) FROM electronica_az.producto) AS productos,
  (SELECT count(*) FROM electronica_az.ubicacion) AS ubicaciones,
  (SELECT count(*) FROM electronica_az.categoria) AS categorias,
  (SELECT coalesce(sum(stock_actual),0) FROM electronica_az.existencia) AS stock_total;
`;
};

const main = async () => {
  const parsed = await readExcel();
  mkdirSync(outDir, { recursive: true });

  const cleanupPath = join(outDir, '01_cleanup_demo_data.sql');
  const seedPath = join(outDir, '02_seed_from_excel.sql');
  const metaPath = join(outDir, 'excel-seed-meta.json');

  writeFileSync(cleanupPath, buildCleanupSql(), 'utf8');
  writeFileSync(seedPath, buildSeedSql(parsed), 'utf8');
  writeFileSync(metaPath, `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    xlsxPath,
    totalRaw: parsed.totalRaw,
    products: parsed.products.length,
    skippedDupes: parsed.skippedDupes.length,
    bySheet: {
      INTEGRADOS: parsed.products.filter((p) => p.sheet === 'INTEGRADOS').length,
      'MODULOS ARDUINO': parsed.products.filter((p) => p.sheet === 'MODULOS ARDUINO').length,
    },
    sample: parsed.products.slice(0, 8).map((p) => ({
      codigo: p.codigo, precio: p.precio, caja: p.caja, categoria: p.categoria,
    })),
    note: 'Stock y costo quedan en 0; Excel solo aporta catálogo/precio/caja.',
  }, null, 2)}\n`, 'utf8');

  console.log(JSON.stringify({
    cleanupPath,
    seedPath,
    products: parsed.products.length,
    skippedDupes: parsed.skippedDupes.length,
    totalRaw: parsed.totalRaw,
  }, null, 2));
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
