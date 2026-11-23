import PDFDocument from 'pdfkit';

const COMPANY = {
  nombre: process.env.COMPANY_NAME || 'Electrónica Central AZ',
  direccion: process.env.COMPANY_ADDRESS || 'La Paz, Bolivia',
  nit: process.env.COMPANY_NIT || 'N/A (comprobante interno)',
};

const collectPdfBuffer = (build) => new Promise((resolve, reject) => {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  doc.on('end', () => resolve(Buffer.concat(chunks)));
  doc.on('error', reject);
  try {
    build(doc);
    doc.end();
  } catch (error) {
    reject(error);
  }
});

const writeKv = (doc, label, value) => {
  doc.font('Helvetica-Bold').text(`${label}: `, { continued: true });
  doc.font('Helvetica').text(String(value ?? ''));
};

export const buildComprobantePdfBuffer = async (data) => collectPdfBuffer((doc) => {
  doc.fontSize(16).font('Helvetica-Bold').text(COMPANY.nombre);
  doc.fontSize(10).font('Helvetica').text(COMPANY.direccion);
  doc.text(`NIT: ${COMPANY.nit}`);
  doc.moveDown();
  doc.fontSize(14).font('Helvetica-Bold').text('Comprobante interno');
  doc.moveDown(0.5);
  writeKv(doc, 'Número', data.numero);
  writeKv(doc, 'Fecha emisión', data.fechaEmision);
  writeKv(doc, 'Estado venta', data.estadoVenta);
  writeKv(doc, 'Cliente', data.cliente?.nombre);
  doc.moveDown();
  doc.font('Helvetica-Bold').text('Detalle');
  doc.moveDown(0.3);
  for (const line of data.lineas ?? []) {
    doc.font('Helvetica').fontSize(10).text(
      `${line.codigo} | ${line.nombre} | cant ${line.cantidad} | P.U. ${line.precioUnitario} | sub ${line.subtotal}`,
    );
  }
  doc.moveDown();
  writeKv(doc, 'Total', data.total);
  writeKv(doc, 'Cobrado', data.cobrado);
  writeKv(doc, 'Saldo', data.saldo);
  if (data.pagos?.length) {
    doc.moveDown();
    doc.font('Helvetica-Bold').text('Pagos');
    for (const pago of data.pagos) {
      doc.font('Helvetica').text(
        `${pago.metodo ?? pago.medio ?? ''} | ${pago.estado} | ${pago.monto}`,
      );
    }
  }
  doc.moveDown(2);
  doc.fontSize(8).fillColor('#666').text('Documento interno — no constituye factura fiscal.');
});

// ---------------------------------------------------------------------------
// Structured report layout
// ---------------------------------------------------------------------------

const COLOR = {
  brand: '#14532d',
  brandSoft: '#e7f3ec',
  ink: '#1f2937',
  secondary: '#6b7280',
  line: '#e2e8e5',
  rowAlt: '#f5f8f6',
  headerText: '#ffffff',
};

const BADGE_TONES = {
  green: { bg: '#dcfce7', fg: '#166534' },
  amber: { bg: '#fef3c7', fg: '#b45309' },
  red: { bg: '#fee2e2', fg: '#b91c1c' },
};

const BADGE_GREEN = new Set(['CONFIRMADA', 'CONFIRMADO', 'OK']);
const BADGE_AMBER = new Set(['BORRADOR', 'PENDIENTE', 'BAJO_MINIMO']);
const BADGE_RED = new Set(['ANULADA', 'ANULADO', 'RECHAZADO', 'AGOTADO', 'VENCIDO']);

const HUMAN_LABELS = {
  vendido: 'Vendido',
  cobrado: 'Cobrado',
  excluyeAnuladasDeVendido: 'Excluye anuladas de vendido',
  gananciaBruta: 'Ganancia bruta',
  valoracionTotal: 'Valoración total',
  agotados: 'Agotados',
  bajoMinimo: 'Bajo mínimo',
};

const humanLabel = (key) => HUMAN_LABELS[key]
  ?? key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());

const LA_PAZ = 'America/La_Paz';
const LA_PAZ_OFFSET = '-04:00';

const formatLaPazDateTime = (date) => new Intl.DateTimeFormat('sv-SE', {
  timeZone: LA_PAZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
}).format(date);

const nowLaPaz = () => formatLaPazDateTime(new Date());

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const formatCell = (value) => {
  if (value === null || value === undefined) return '—';
  if (value instanceof Date) return formatLaPazDateTime(value);
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  const text = String(value);
  if (UUID_RE.test(text)) return text.slice(0, 8);
  if (text === '') return '—';
  return text;
};

const isAmountKey = (key) => /^(total|cobrado|saldo|valoracion|costo|precio|monto|ganancia|valor|cogs|inventario)/i.test(key);

const badgeToneFor = (value) => {
  if (typeof value !== 'string') return null;
  if (BADGE_GREEN.has(value)) return BADGE_TONES.green;
  if (BADGE_AMBER.has(value)) return BADGE_TONES.amber;
  if (BADGE_RED.has(value)) return BADGE_TONES.red;
  return null;
};

const drawBadge = (doc, label, tone, x, y) => {
  doc.font('Helvetica-Bold').fontSize(7);
  const textWidth = doc.widthOfString(label);
  doc.roundedRect(x, y, textWidth + 10, 13, 6).fill(tone.bg);
  doc.fillColor(tone.fg).text(label, x + 5, y + 3.2, { lineBreak: false });
  return { x, y, width: textWidth + 10, height: 13 };
};

const drawFooter = (doc, page) => {
  const bottom = doc.page.height - 32;
  doc.font('Helvetica').fontSize(7.5).fillColor(COLOR.secondary);
  doc.text(`Reporte generado el ${nowLaPaz()} (${LA_PAZ})`, 40, bottom, { lineBreak: false });
  const brand = doc.widthOfString(COMPANY.nombre);
  doc.text(COMPANY.nombre, doc.page.width - 40 - brand, bottom, { lineBreak: false });
  const pageNo = `Página ${page}`;
  doc.font('Helvetica-Bold');
  const pageW = doc.widthOfString(pageNo);
  doc.text(pageNo, doc.page.width / 2 - pageW / 2, bottom, { lineBreak: false });
  doc
    .moveTo(40, bottom - 6)
    .lineTo(doc.page.width - 40, bottom - 6)
    .lineWidth(0.6)
    .strokeColor(COLOR.line)
    .stroke();
  doc.lineWidth(1);
};

const RESOURCE_BOTTOM = 750;

const currentPageNo = (doc) => doc.bufferedPageRange()?.count ?? 1;

const drawHeader = (doc, title, data) => {
  doc.rect(0, 0, doc.page.width, 6).fill(COLOR.brand);

  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLOR.brand);
  doc.text(COMPANY.nombre, 40, 22, { lineBreak: false });

  doc.moveTo(188, 26).lineTo(188, 36).lineWidth(0.8).strokeColor(COLOR.line).stroke();

  doc.font('Helvetica').fontSize(9).fillColor(COLOR.secondary);
  doc.text(COMPANY.direccion, 198, 24, { lineBreak: false });

  doc.font('Helvetica-Bold').fontSize(19).fillColor(COLOR.ink);
  doc.text(title, 40, 46, { lineBreak: false });

  // Period / cutoff pill
  let periodLabel = '';
  let periodRange = '';
  if (data?.periodo) {
    periodLabel = 'Periodo';
    periodRange = `${data.periodo.desde} – ${data.periodo.hasta} (${data.periodo.zona})`;
  }
  if (data?.fechaCorte) {
    periodLabel = 'Fecha de corte';
    periodRange = `${data.fechaCorte} (${data.zona})`;
  }
  let y = 74;
  if (periodLabel) {
    const labelW = 76;
    doc.font('Helvetica').fontSize(9);
    const rangeW = doc.widthOfString(periodRange);
    doc.roundedRect(40, y - 6, labelW + rangeW + 26, 24, 12).fill(COLOR.brandSoft);
    doc.font('Helvetica-Bold').fillColor(COLOR.brand).fontSize(9);
    doc.text(periodLabel, 52, y, { lineBreak: false });
    doc.font('Helvetica').fillColor(COLOR.secondary);
    doc.text(periodRange, 52 + labelW, y, { lineBreak: false }); y += 34;
  } else {
    y += 10;
  }
  return y;
};

const drawChips = (doc, y, entries) => {
  if (!entries.length) return y;
  doc.font('Helvetica-Bold').fontSize(12).fillColor(COLOR.ink);
  doc.text('Resumen', 40, y, { lineBreak: false });
  y += 20;
  let x = 40;
  for (const [key, raw] of entries) {
    doc.font('Helvetica').fontSize(7.5).fillColor(COLOR.secondary);
    const label = humanLabel(key);
    const labelW = doc.widthOfString(label);
    doc.font('Helvetica').fontSize(7.5).fillColor(COLOR.secondary);
    const valueStr = formatCell(raw);
    const valueW = doc.widthOfString(valueStr);
    const w = Math.max(labelW, valueW) + 26;
    if (x + w > 555) {
      x = 40;
      y += 52;
    }
    doc.roundedRect(x, y, w, 46, 8).fill(COLOR.brandSoft);
    doc.font('Helvetica').fontSize(7.5).fillColor(COLOR.secondary);
    doc.text(label, x + 13, y + 10, { lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(13).fillColor(COLOR.brand);
    doc.text(valueStr, x + 13, y + 25, { lineBreak: false });
    x += w + 10;
  }
  return y + 60;
};

const COLUMN_MIN = (header, key) => {
  if (isAmountKey(key)) return 46;
  if (/^(id|venta|idventa)$/i.test(header) || header.toLowerCase() === 'id') return 52;
  if (/(fecha|corte)/i.test(header)) return 84;
  if (/(estado|alerta|estado)/i.test(header)) return 62;
  return 58;
};

const drawTable = (doc, spec, heading, startY) => {
  const columns = spec?.columns ?? [];
  const rows = spec?.rows ?? [];
  if (!columns.length || !rows.length) return { y: startY, pageNo: 1 };

  const total = columns.reduce((a, c) => a + (c.width ?? 10), 0) || 1;
  const usable = 515;
  // Proportional allocation, then enforce per-column minimums by rebalancing
  // from the oversized columns (uniform rescale used to bury minimums).
  const mins = columns.map((c) => COLUMN_MIN(c.header, c.key));
  const widths = columns.map((c) => (c.width / total) * usable);
  for (let pass = 0; pass < 3; pass += 1) {
    const deficits = widths.map((w, i) => Math.max(0, mins[i] - w));
    const deficitSum = deficits.reduce((a, w) => a + w, 0);
    if (deficitSum < 0.5) break;
    const surplusIdx = widths.map((w, i) => (w > mins[i] + 1 ? i : -1)).filter((i) => i >= 0);
    const surplusSum = surplusIdx.reduce((a, i) => a + (widths[i] - mins[i]), 0);
    if (!surplusIdx.length || surplusSum < 0.5) break; // cannot satisfy mins; stop
    for (const i of surplusIdx) widths[i] -= ((widths[i] - mins[i]) / surplusSum) * deficitSum;
    for (let i = 0; i < widths.length; i += 1) widths[i] += deficits[i];
  }
  const xs = [];
  let acc = 40;
  for (const w of widths) {
    xs.push(acc);
    acc += w;
  }

  let y = startY;
  let pageNo = currentPageNo(doc);
  doc.font('Helvetica-Bold').fontSize(12).fillColor(COLOR.ink);
  doc.text(heading, 40, y, { lineBreak: false });
  y += 20;

  const drawHeadRow = () => {
    // Defensive state reset: pdfkit state may leak across addPage
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLOR.headerText);
    doc.rect(40, y, usable, 22).fill(COLOR.brand);
    columns.forEach((col, i) => {
      const align = isAmountKey(col.key) ? 'right' : 'left';
      // Shrink-to-fit: never ellipsize headers; smaller font instead.
      const availW = widths[i] - 12;
      let size = 8;
      doc.font('Helvetica-Bold').fontSize(size);
      while (size > 6 && doc.widthOfString(col.header) > availW) {
        size -= 0.5;
        doc.font('Helvetica-Bold').fontSize(size);
      }
      doc.fillColor(COLOR.headerText);
      doc.text(col.header, xs[i] + 6, y + 7, {
        width: availW,
        align,
        lineBreak: false,
        height: 16,
      });
    });
    y += 24;
  };

  drawHeadRow();
  rows.forEach((row, idx) => {
    const cells = columns.map((col) => {
      const raw = row?.[col.key];
      return { col, raw, text: formatCell(raw) };
    });
    doc.font('Helvetica').fontSize(8).fillColor(COLOR.ink);
    const bodyHeight = Math.max(...cells.map((cell, i) => doc.heightOfString(cell.text, {
      width: widths[i] - 12,
    })), 13);
    const rowH = Math.max(bodyHeight + 10, 22);
    if (y + rowH > RESOURCE_BOTTOM) {
      if (pageNo >= 50) throw new Error('PDF pagination runaway: more than 50 pages for a report');
      drawFooter(doc, pageNo);
      doc.addPage();
      pageNo += 1;
      y = 42;
      doc.font('Helvetica').fontSize(8).fillColor(COLOR.ink);
      drawHeadRow();
    }
    // Alternate row background AFTER the page-break branch so it lands on the
    // open page
    if (idx % 2 === 1) {
      doc.rect(40, y, usable, rowH).fill(COLOR.rowAlt);
    }
    for (let i = 0; i < cells.length; i += 1) {
      const { col, raw, text } = cells[i];
      const tone = badgeToneFor(typeof raw === 'string' ? raw : null);
      if (tone && (text !== '—')) {
        drawBadge(doc, text.replace(/_/g, ' '), tone, xs[i] + 6, y + 5);
      } else {
        doc.font('Helvetica').fontSize(8).fillColor(COLOR.ink);
        doc.text(text, xs[i] + 6, y + 5, {
          width: widths[i] - 12,
          align: isAmountKey(col.key) ? 'right' : 'left',
          lineBreak: false,
          ellipsis: true,
          height: 16,
        });
      }
    }
    y += rowH;
    doc
      .moveTo(40, y)
      .lineTo(40 + usable, y)
      .lineWidth(0.5)
      .strokeColor(COLOR.line)
      .stroke();
    doc.lineWidth(1);
  });
  return { y: y + 12, pageNo };
};

export const buildReportPdfBuffer = async (title, data, spec) => collectPdfBuffer((doc) => {
  let y = drawHeader(doc, title, data ?? {});
  const chips = Object.entries(data?.resumen ?? {});
  y = drawChips(doc, y, chips);
  const rows = data?.items?.length
    ? data.items
    : spec?.rows ?? [];
  const itemCount = rows.length;
  const table = drawTable(doc, { columns: spec?.columns, rows }, itemCount ? `Items (${itemCount})` : 'Detalle', y);
  drawFooter(doc, table.pageNo);
});
