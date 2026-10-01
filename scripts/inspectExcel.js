import ExcelJS from 'exceljs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';

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

const dump = {};
for (const ws of workbook.worksheets) {
  const rows = [];
  for (let r = 1; r <= Math.min(ws.rowCount, 40); r += 1) {
    const row = ws.getRow(r);
    const vals = [];
    for (let c = 1; c <= 10; c += 1) vals.push(cellText(row.getCell(c)));
    if (vals.some((v) => v != null && String(v).trim() !== '')) {
      rows.push({ r, vals });
    }
  }
  // also sample mid/end
  const mid = Math.floor(ws.rowCount / 2);
  for (const r of [mid, mid + 1, ws.rowCount - 2, ws.rowCount - 1, ws.rowCount]) {
    if (r < 1) continue;
    const row = ws.getRow(r);
    const vals = [];
    for (let c = 1; c <= 10; c += 1) vals.push(cellText(row.getCell(c)));
    if (vals.some((v) => v != null && String(v).trim() !== '')) rows.push({ r, vals });
  }
  dump[ws.name] = { rowCount: ws.rowCount, columnCount: ws.columnCount, rows };
}

writeFileSync(resolve(__dirname, 'seed/excel-structure-sample.json'), `${JSON.stringify(dump, null, 2)}\n`);
console.log(JSON.stringify(Object.fromEntries(Object.entries(dump).map(([k, v]) => [k, { rowCount: v.rowCount, first: v.rows.slice(0, 12) }])), null, 2));
