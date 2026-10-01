import ExcelJS from 'exceljs';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { query, closeDatabase } from '../src/lib/database.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const xlsxPath = resolve(__dirname, '../../docs/2026 INTEGRADOS y ARDUINO.xlsx');
const outPath = join(__dirname, 'seed', 'excel-vs-db-report.json');

const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(xlsxPath);

const sheets = [];
for (const ws of workbook.worksheets) {
  const rows = [];
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const values = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      let v = cell.value;
      if (v && typeof v === 'object') {
        if ('result' in v) v = v.result;
        else if ('text' in v) v = v.text;
        else if ('richText' in v) v = v.richText.map((t) => t.text).join('');
        else if ('sharedFormula' in v) v = v.result ?? v.formula;
      }
      values[colNumber - 1] = v;
    });
    rows.push({ rowNumber, values });
  });
  sheets.push({
    name: ws.name,
    rowCount: rows.length,
    header: rows[0]?.values ?? [],
    sample: rows.slice(0, 8).map((r) => r.values),
    allRows: rows,
  });
}

// Heuristic: find sheet with product codes matching catalog
const db = await query(`
  SELECT p.codigo, p.nombre, p.precio_venta,
         e.stock_actual, e.costo_promedio
  FROM electronica_az.producto p
  LEFT JOIN electronica_az.existencia e ON e.id_producto = p.id_producto
  ORDER BY p.codigo
`);
const byCodigo = new Map(db.rows.map((r) => [String(r.codigo).toUpperCase(), r]));

const report = {
  xlsxPath,
  sheets: sheets.map((s) => ({
    name: s.name,
    rowCount: s.rowCount,
    header: s.header,
    sample: s.sample,
  })),
  dbProductCount: db.rows.length,
  comparisons: [],
};

for (const sheet of sheets) {
  const header = (sheet.header || []).map((h) => String(h ?? '').toLowerCase());
  const idxCodigo = header.findIndex((h) => /codigo|código|sku|code/.test(h));
  const idxNombre = header.findIndex((h) => /nombre|descrip|producto|item/.test(h));
  const idxPrecio = header.findIndex((h) => /precio|pvp|venta/.test(h));
  const idxCosto = header.findIndex((h) => /costo|cost|compra/.test(h));
  const idxStock = header.findIndex((h) => /stock|cantidad|saldo|existencia|qty/.test(h));

  if (idxCodigo < 0 && idxNombre < 0) continue;

  const matched = [];
  const unmatchedExcel = [];
  for (const row of sheet.allRows.slice(1)) {
    const codigoRaw = idxCodigo >= 0 ? row.values[idxCodigo] : null;
    const nombreRaw = idxNombre >= 0 ? row.values[idxNombre] : null;
    const codigo = codigoRaw != null ? String(codigoRaw).trim() : '';
    if (!codigo && !nombreRaw) continue;

    let dbRow = codigo ? byCodigo.get(codigo.toUpperCase()) : null;
    if (!dbRow && nombreRaw) {
      const name = String(nombreRaw).trim().toUpperCase();
      dbRow = [...byCodigo.values()].find((r) => String(r.nombre).toUpperCase() === name
        || String(r.codigo).toUpperCase() === name);
    }

    const excel = {
      codigo: codigo || null,
      nombre: nombreRaw != null ? String(nombreRaw) : null,
      precio: idxPrecio >= 0 ? Number(row.values[idxPrecio]) : null,
      costo: idxCosto >= 0 ? Number(row.values[idxCosto]) : null,
      stock: idxStock >= 0 ? Number(row.values[idxStock]) : null,
    };

    if (!dbRow) {
      unmatchedExcel.push(excel);
      continue;
    }

    matched.push({
      codigo: dbRow.codigo,
      excel,
      db: {
        precio_venta: Number(dbRow.precio_venta),
        stock_actual: Number(dbRow.stock_actual),
        costo_promedio: Number(dbRow.costo_promedio),
      },
      diffs: {
        precio: excel.precio != null && Number.isFinite(excel.precio)
          ? Number((Number(dbRow.precio_venta) - excel.precio).toFixed(4))
          : null,
        stock: excel.stock != null && Number.isFinite(excel.stock)
          ? Number((Number(dbRow.stock_actual) - excel.stock).toFixed(4))
          : null,
        costo: excel.costo != null && Number.isFinite(excel.costo)
          ? Number((Number(dbRow.costo_promedio) - excel.costo).toFixed(4))
          : null,
        costoVs065: excel.precio != null && Number.isFinite(excel.precio)
          ? Number((Number(dbRow.costo_promedio) - excel.precio * 0.65).toFixed(4))
          : null,
      },
    });
  }

  report.comparisons.push({
    sheet: sheet.name,
    columns: { idxCodigo, idxNombre, idxPrecio, idxCosto, idxStock, header },
    matched: matched.length,
    unmatchedExcel: unmatchedExcel.length,
    unmatchedSample: unmatchedExcel.slice(0, 15),
    priceMismatches: matched.filter((m) => m.diffs.precio != null && Math.abs(m.diffs.precio) > 0.001).slice(0, 40),
    stockMismatches: matched.filter((m) => m.diffs.stock != null && Math.abs(m.diffs.stock) > 0.001).slice(0, 40),
    costMismatches: matched.filter((m) => m.diffs.costo != null && Math.abs(m.diffs.costo) > 0.001).slice(0, 40),
    allMatched: matched,
  });
}

writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  outPath,
  sheets: report.sheets.map((s) => ({ name: s.name, rows: s.rowCount, header: s.header })),
  comparisons: report.comparisons.map((c) => ({
    sheet: c.sheet,
    matched: c.matched,
    unmatched: c.unmatchedExcel,
    priceMismatch: c.priceMismatches.length,
    stockMismatch: c.stockMismatches.length,
    costMismatch: c.costMismatches.length,
    columns: c.columns,
  })),
}, null, 2));

await closeDatabase();
