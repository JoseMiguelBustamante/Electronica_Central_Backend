import ExcelJS from 'exceljs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { query, closeDatabase } from '../src/lib/database.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const xlsxPath = resolve(__dirname, '../../docs/2026 INTEGRADOS y ARDUINO.xlsx');
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(xlsxPath);

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

const normalize = (s) => String(s ?? '')
  .trim()
  .toUpperCase()
  .replace(/,/g, '.')
  .replace(/\s+/g, ' ');

const excelItems = [];

// INTEGRADOS: A=ITEM, B=CAJA, C=DESC, D=PRECIO, F=AJUST
{
  const ws = workbook.getWorksheet('INTEGRADOS');
  for (let r = 2; r <= ws.rowCount; r += 1) {
    const row = ws.getRow(r);
    const item = cellText(row.getCell(1));
    const precio = Number(cellText(row.getCell(4)));
    if (item == null || String(item).trim() === '' || !Number.isFinite(precio)) continue;
    if (String(item).toLowerCase() === 'item') continue;
    excelItems.push({
      sheet: 'INTEGRADOS',
      codigo: normalize(item),
      raw: String(item).trim(),
      caja: cellText(row.getCell(2)),
      desc: cellText(row.getCell(3)),
      precio,
      ajust: Number(cellText(row.getCell(6))),
    });
  }
}

// MODULOS: A=CAJA, B=ITEM, D=PRECIO, E=DESC
{
  const ws = workbook.getWorksheet('MODULOS ARDUINO');
  for (let r = 5; r <= ws.rowCount; r += 1) {
    const row = ws.getRow(r);
    const item = cellText(row.getCell(2));
    const precio = Number(cellText(row.getCell(4)));
    if (item == null || String(item).trim() === '' || !Number.isFinite(precio)) continue;
    excelItems.push({
      sheet: 'MODULOS ARDUINO',
      codigo: normalize(item),
      raw: String(item).trim(),
      caja: cellText(row.getCell(1)),
      desc: cellText(row.getCell(5)),
      precio,
      ajust: null,
    });
  }
}

const db = await query(`
  SELECT p.codigo, p.nombre, p.precio_venta::float8 AS precio_venta,
         e.stock_actual::float8 AS stock_actual, e.costo_promedio::float8 AS costo_promedio
  FROM electronica_az.producto p
  LEFT JOIN electronica_az.existencia e ON e.id_producto = p.id_producto
  ORDER BY p.codigo
`);

const excelByCode = new Map();
for (const it of excelItems) {
  if (!excelByCode.has(it.codigo)) excelByCode.set(it.codigo, it);
}

const overlaps = [];
for (const row of db.rows) {
  const code = normalize(row.codigo);
  const name = normalize(row.nombre);
  let hit = excelByCode.get(code);
  if (!hit) {
    hit = [...excelByCode.values()].find((e) => e.codigo === name
      || e.codigo.includes(code)
      || code.includes(e.codigo)
      || normalize(e.desc || '') === name);
  }
  overlaps.push({
    dbCodigo: row.codigo,
    dbPrecio: row.precio_venta,
    dbStock: row.stock_actual,
    dbCosto: row.costo_promedio,
    excel: hit ? { sheet: hit.sheet, raw: hit.raw, precio: hit.precio, ajust: hit.ajust } : null,
    precioMatch: hit ? Math.abs(hit.precio - row.precio_venta) < 0.001 : false,
  });
}

console.log(JSON.stringify({
  excelTotal: excelItems.length,
  excelUniqueCodes: excelByCode.size,
  dbProducts: db.rows.length,
  dbFoundInExcel: overlaps.filter((o) => o.excel).length,
  dbMissingInExcel: overlaps.filter((o) => !o.excel).map((o) => o.dbCodigo),
  priceMatches: overlaps.filter((o) => o.precioMatch).length,
  priceMismatches: overlaps.filter((o) => o.excel && !o.precioMatch).map((o) => ({
    db: o.dbCodigo,
    dbPrecio: o.dbPrecio,
    excelRaw: o.excel.raw,
    excelPrecio: o.excel.precio,
  })),
  sampleExcel: excelItems.slice(0, 5),
  sampleModulos: excelItems.filter((e) => e.sheet === 'MODULOS ARDUINO').slice(0, 5),
}, null, 2));

await closeDatabase();
