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

const flattenReportForPdf = (title, data) => {
  const lines = [`${title}`, ''];
  if (data.periodo) {
    lines.push(`Periodo: ${data.periodo.desde} → ${data.periodo.hasta} (${data.periodo.zona})`);
  }
  if (data.fechaCorte) {
    lines.push(`Fecha corte: ${data.fechaCorte} (${data.zona})`);
  }
  if (data.resumen) {
    lines.push('Resumen:');
    for (const [k, v] of Object.entries(data.resumen)) {
      lines.push(`  ${k}: ${v}`);
    }
  }
  if (data.rotacion) {
    lines.push('Rotacion:');
    for (const [k, v] of Object.entries(data.rotacion)) {
      lines.push(`  ${k}: ${v}`);
    }
  }
  if (data.demanda) {
    lines.push('Demanda:');
    for (const [k, v] of Object.entries(data.demanda)) {
      lines.push(`  ${k}: ${v}`);
    }
  }
  if (Array.isArray(data.items) && data.items.length) {
    lines.push('', `Items (${data.items.length}):`);
    const sample = data.items.slice(0, 80);
    for (const item of sample) {
      lines.push(`  ${JSON.stringify(item)}`);
    }
    if (data.items.length > sample.length) {
      lines.push(`  … y ${data.items.length - sample.length} más`);
    }
  }
  return lines;
};

export const buildReportPdfBuffer = async (title, data) => collectPdfBuffer((doc) => {
  doc.fontSize(14).font('Helvetica-Bold').text(COMPANY.nombre);
  doc.fontSize(12).text(title);
  doc.moveDown();
  doc.font('Helvetica').fontSize(9);
  for (const line of flattenReportForPdf(title, data)) {
    doc.text(line);
  }
});
