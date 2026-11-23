import { describe, expect, test } from 'vitest';
import zlib from 'node:zlib';
import { Buffer } from 'node:buffer';
import { buildReportPdfBuffer } from '../../../../src/services/pdfService.js';

/** Extract and inflate all FlateDecode content streams, positioned by the
 *  declared /Length N (binary-safe; naive 'stream' scanning derails inside
 *  compressed bytes). */
const contentText = (pdf) => {
  const s = pdf.toString('latin1');
  const parts = [];
  const re = /\/Length (\d+)\s*(?:\/Filter [^\n>]*\s*)?>>\s*stream\r?\n/g;
  let match;
  while ((match = re.exec(s)) !== null) {
    const length = Number(match[1]);
    const start = match.index + match[0].length;
    const raw = pdf.subarray(start, start + length);
    try {
      parts.push(zlib.inflateSync(raw).toString('latin1'));
    } catch {
      parts.push('(INFLATE FAIL)');
    }
    re.lastIndex = start + length;
  }
  return parts.join('\n---STREAM---\n');
};

const pageCount = (pdf) => (pdf.toString('latin1').match(/\/Type \/Page[^s]/g) ?? []).length;

const shownText = (content) => {
  const out = [];
  // pdfkit text ops: either [<hex> kern <hex>] TJ or (literal) Tj.
  // Join all string chunks inside each op so kerned-run splits reassemble.
  const ops = content.matchAll(/\[((?:[^\]\\]|\\.)*)\][\d\s]*TJ|\((?:\\\(|\\\([^)\\]*)*\)[\d\s-]*T[Jj]/g);
  for (const op of ops) {
    const chunks = [];
    if (op[1] !== undefined) {
      for (const hex of op[1].matchAll(/<([0-9A-Fa-f]+)>/g)) chunks.push(Buffer.from(hex[1], 'hex').toString('latin1'));
      for (const lit of op[1].matchAll(/\(((?:\\\(|\\\(|[^)\n\\])*)\)/g)) {
        chunks.push(lit[1].replaceAll('\\(', '(').replaceAll('\\)', ')'));
      }
    } else {
      const lit = op[0].match(/^\(((?:\\\)|\\\(|[^)\n\\])*)\)/);
      if (lit) chunks.push(lit[1].replaceAll('\\(', '(').replaceAll('\\)', ')'));
    }
    if (chunks.length) out.push(chunks.join(''));
  }
  return out.join('\n');
};

const ventasSpec = {
  sheet: 'Ventas',
  columns: [
    { header: 'Id', key: 'idVenta', width: 36 },
    { header: 'Fecha', key: 'fechaHora', width: 24 },
    { header: 'Estado', key: 'estado', width: 12 },
    { header: 'Vendedor', key: 'vendedor', width: 20 },
    { header: 'Cliente', key: 'cliente', width: 24 },
    { header: 'Total', key: 'total', width: 12 },
    { header: 'Cobrado', key: 'cobrado', width: 12 },
    { header: 'Saldo', key: 'saldo', width: 12 },
  ],
  rows: [
    {
      idVenta: '0ef614c2-0c9e-4052-8b44-1df3d94700cb',
      fechaHora: new Date('2026-11-02T20:24:30.577Z'),
      estado: 'CONFIRMADA',
      vendedor: 'admin',
      cliente: 'Cliente Mostrador',
      total: 15,
      cobrado: 0,
      saldo: 15,
    },
    {
      idVenta: '27afb14e-363e-448e-82dc-2c564549428c',
      fechaHora: new Date('2026-11-02T20:24:42.096Z'),
      estado: 'BORRADOR',
      vendedor: 'admin',
      cliente: 'Cliente Mostrador',
      total: 330,
      cobrado: 0,
      saldo: 330,
    },
  ],
};

const ventasData = {
  periodo: { desde: '2026-10-24', hasta: '2026-11-23', zona: 'America/La_Paz' },
  resumen: { vendido: 200, cobrado: 185, excluyeAnuladasDeVendido: true },
  items: ventasSpec.rows,
};

describe('buildReportPdfBuffer structured layout', () => {
  test('ventas PDF has brand header, period, resumen chips and a real table', async () => {
    const pdf = await buildReportPdfBuffer('Reporte de ventas', ventasData, ventasSpec);
    const content = contentText(pdf);
    const text = shownText(content);
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    // Branded header + big title
    expect(text).toContain('Electrónica Central AZ');
    expect(text).toContain('Reporte de ventas');
    // Period rendered as a human chip: label + WinAnsi-safe range
    expect(text).toMatch(/Periodo\s*[\n: ]\s*2026-10-24 .{1,3} 2026-11-23/);
    // Resumen chips humanized, booleans translated
    expect(text).toContain('Resumen');
    expect(text).toContain('Vendido');
    expect(text).toContain('Cobrado');
    expect(text).toContain('Excluye anuladas de vendido');
    expect(text).toContain('Sí');
    // Table header row comes from the shared spec (not JSON dumps)
    expect(text).toContain('Fecha');
    expect(text).toContain('Estado');
    expect(text).toContain('Vendedor');
    expect(text).toContain('Cliente');
    expect(text).toContain('Cobrado');
    expect(text).toContain('Saldo');
    // Uuid truncated for readability
    expect(text).toContain('0ef614c2');
    expect(text).not.toContain('1df3d94700cb');
    // Dates localized to La Paz (UTC 20:24Z -> 16:24 local -04:00)
    expect(text).toContain('2026-11-02 16:24');
    expect(text).not.toContain('2026-11-02T');
    // No raw JSON anywhere
    expect(text).not.toContain('idVenta');
    expect(text).not.toContain('{"');
    // Footer
    expect(text).toMatch(/Reporte generado el \d{4}-\d{2}-\d{2} \d{2}:\d{2}/);
    // Brand colors present in drawing ops (pdfkit uses DeviceRGB scn)
    expect(content).toMatch(/[0-9.]+ [0-9.]+ [0-9.]+ scn/);
  });

  test('multi-page inventario PDF paginates with repeated table headers', async () => {
    const rows = Array.from({ length: 60 }, (_, i) => ({
      codigo: `SKU-${String(i + 1).padStart(3, '0')}`,
      nombre: `Producto ${i + 1}`,
      ubicacion: 'A1',
      stockCorte: 5,
      stockMinimo: 2,
      costoPromedio: 4.5,
      valoracion: 22.5,
      alerta: i % 10 === 0 ? 'BAJO_MINIMO' : null,
    }));
    const spec = {
      sheet: 'Inventario',
      columns: [
        { header: 'Codigo', key: 'codigo', width: 16 },
        { header: 'Producto', key: 'nombre', width: 28 },
        { header: 'Ubicacion', key: 'ubicacion', width: 14 },
        { header: 'Stock corte', key: 'stockCorte', width: 12 },
        { header: 'Minimo', key: 'stockMinimo', width: 10 },
        { header: 'Costo prom', key: 'costoPromedio', width: 12 },
        { header: 'Valoracion', key: 'valoracion', width: 12 },
        { header: 'Alerta', key: 'alerta', width: 12 },
      ],
      rows,
    };
    const pdf = await buildReportPdfBuffer('Reporte de inventario', {
      fechaCorte: '2026-11-23',
      zona: 'America/La_Paz',
      resumen: { valoracionTotal: 1350, agotados: 0, bajoMinimo: 6 },
      items: rows,
    }, spec);
    const content = contentText(pdf);
    const text = shownText(content);
    expect(pageCount(pdf)).toBeGreaterThan(1);
    expect(text).toContain('Reporte de inventario');
    expect(text).toMatch(/Items \(\d+\)/);
    expect(text).toContain('Valoración total');
    expect(text).toContain('SKU-060');
    // Alert tone text for the low-stock badge
    expect(text).toContain('BAJO MINIMO');
    // Table header repeated on later pages
    // Footers on every page
    const footers = (text.match(/Reporte generado el/g) ?? []).length;
    expect(footers).toBe(pageCount(pdf));
    // Repeated table headers on later pages ('Costo prom' may ellipsize, so
    // match its stable prefix)
    const headers = (text.match(/Costo pro/g) ?? []).length;
    expect(headers).toBe(pageCount(pdf));
  });

  test('rotacion PDF renders metric table without fake items', async () => {
    const spec = {
      sheet: 'Rotacion',
      columns: [
        { header: 'Metrica', key: 'metrica', width: 28 },
        { header: 'Valor', key: 'valor', width: 20 },
      ],
      rows: [
        { metrica: 'COGS', valor: 100 },
        { metrica: 'Inventario inicial', valor: 50 },
      ],
    };
    const pdf = await buildReportPdfBuffer('Rotacion y demanda', {
      periodo: { desde: '2026-11-01', hasta: '2026-11-23', zona: 'America/La_Paz' },
      rotacion: { cogs: 100, inventarioInicial: 50, inventarioFinal: 60, inventarioPromedio: 55, valor: 1.82, etiqueta: null },
      demanda: { ventasUnidades: 9, solicitudesUnidades: 3, nota: 'Solicitudes atendidas no se suman a ventas' },
    }, spec);
    const text = shownText(contentText(pdf));
    expect(text).toMatch(/(Items \(\d+\)|Detalle)/);
    expect(text).toContain('Inventario inicial');
    expect(text).toContain('COGS');
    expect(text).not.toContain('cogs');
  });
});
