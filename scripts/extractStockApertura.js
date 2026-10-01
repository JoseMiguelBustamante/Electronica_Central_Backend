import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultSqlPath = resolve(__dirname, '../../docs/datos_Electronica_CentralAZ.sql');

const MOVIMIENTO_RE = /INSERT INTO movimiento_inventario[\s\S]*?'(ENTRADA|SALIDA)',\s*([0-9]+(?:\.[0-9]+)?),\s*'[^']*',\s*[0-9]+(?:\.[0-9]+)?,\s*p\.id_producto[\s\S]*?p\.codigo\s*=\s*'([^']+)'/gi;

/**
 * Parse net stock quantities from docs/datos_Electronica_CentralAZ.sql.
 * Optional precio map: JSON `{ "CODIGO": precioExcel }` or CSV `codigo,precioExcel`.
 * Does NOT write to the database.
 */
export const extractStockApertura = (sqlText, precioByCodigo = {}) => {
  const balances = new Map();
  for (const match of sqlText.matchAll(MOVIMIENTO_RE)) {
    const tipo = match[1];
    const cantidad = Number(match[2]);
    const codigo = match[3];
    const current = balances.get(codigo) ?? 0;
    balances.set(codigo, tipo === 'ENTRADA' ? current + cantidad : current - cantidad);
  }

  const items = [];
  for (const [codigo, cantidad] of [...balances.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const key = Object.keys(precioByCodigo).find((k) => k.toLowerCase() === codigo.toLowerCase());
    const precioExcel = key !== undefined ? Number(precioByCodigo[key]) : undefined;
    const item = { codigo, cantidad: Number(cantidad.toFixed(4)) };
    if (precioExcel !== undefined && Number.isFinite(precioExcel)) item.precioExcel = precioExcel;
    items.push(item);
  }
  return items;
};

const parsePrecioMap = (raw) => {
  if (!raw) return {};
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) return JSON.parse(trimmed);
  const map = {};
  for (const line of trimmed.split(/\r?\n/)) {
    const [codigo, precio] = line.split(',').map((part) => part?.trim());
    if (!codigo || codigo.toLowerCase() === 'codigo') continue;
    map[codigo] = Number(precio);
  }
  return map;
};

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const sqlPath = resolve(process.argv[2] ?? defaultSqlPath);
  const precioPath = process.argv[3] ? resolve(process.argv[3]) : null;
  const outPath = process.argv[4] ? resolve(process.argv[4]) : join(__dirname, 'apertura-preview.json');
  const sqlText = readFileSync(sqlPath, 'utf8');
  const precioByCodigo = precioPath ? parsePrecioMap(readFileSync(precioPath, 'utf8')) : {};
  const items = extractStockApertura(sqlText, precioByCodigo);
  writeFileSync(outPath, `${JSON.stringify({ items }, null, 2)}\n`, 'utf8');
  process.stdout.write(`Wrote ${items.length} items to ${outPath}\n`);
}
