import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

export interface ExportColumn {
  header: string;
  key: string;
  width?: number; // Excel character width
  align?: 'left' | 'right' | 'center';
  format?: 'text' | 'number' | 'currency' | 'percent';
}

export interface ExportMeta {
  label: string;
  value: string;
}

export interface ExportSpec {
  title: string;
  subtitle?: string;
  meta?: ExportMeta[];
  columns: ExportColumn[];
  rows: Record<string, any>[];
  totals?: Record<string, any>;
  generatedBy?: string;
}

const BRAND = 'Zalmi Beverages Ltd.';
const BRAND_SUB = 'Sales & Distribution Management System';
const ACCENT = '2A78D6';

function formatCell(value: any, format?: ExportColumn['format']): string {
  if (value === null || value === undefined || value === '') return '';
  if (format === 'currency') return `Rs ${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (format === 'percent') return `${Number(value).toFixed(1)}%`;
  if (format === 'number') return Number(value).toLocaleString();
  return String(value);
}

// ─────────────────────────────────────────────────────────────────────────
// Excel
// ─────────────────────────────────────────────────────────────────────────

export async function buildExcelBuffer(spec: ExportSpec): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = `${BRAND} — SecondarySales`;
  wb.created = new Date();

  const ws = wb.addWorksheet((spec.title || 'Report').slice(0, 31).replace(/[\\/*?:[\]]/g, ' '));
  const colCount = spec.columns.length;

  ws.mergeCells(1, 1, 1, colCount);
  ws.getCell(1, 1).value = BRAND;
  ws.getCell(1, 1).font = { bold: true, size: 14 };

  ws.mergeCells(2, 1, 2, colCount);
  ws.getCell(2, 1).value = BRAND_SUB;
  ws.getCell(2, 1).font = { size: 9, italic: true, color: { argb: 'FF666666' } };

  ws.mergeCells(3, 1, 3, colCount);
  ws.getCell(3, 1).value = spec.title;
  ws.getCell(3, 1).font = { bold: true, size: 12, color: { argb: `FF${ACCENT}` } };

  let row = 4;
  if (spec.subtitle) {
    ws.mergeCells(row, 1, row, colCount);
    ws.getCell(row, 1).value = spec.subtitle;
    ws.getCell(row, 1).font = { size: 9, color: { argb: 'FF666666' } };
    row++;
  }
  if (spec.meta?.length) {
    ws.mergeCells(row, 1, row, colCount);
    ws.getCell(row, 1).value = spec.meta.map((m) => `${m.label}: ${m.value}`).join('    ');
    ws.getCell(row, 1).font = { size: 9, color: { argb: 'FF666666' } };
    row++;
  }
  ws.mergeCells(row, 1, row, colCount);
  ws.getCell(row, 1).value = `Generated ${new Date().toLocaleString()}${spec.generatedBy ? ' by ' + spec.generatedBy : ''}`;
  ws.getCell(row, 1).font = { size: 8, italic: true, color: { argb: 'FF999999' } };
  row += 2;

  const headerRowIdx = row;
  const headerRow = ws.getRow(headerRowIdx);
  spec.columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${ACCENT}` } };
    cell.alignment = { horizontal: col.align || 'left', vertical: 'middle' };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } } };
  });
  headerRow.height = 20;

  spec.rows.forEach((r, idx) => {
    const dataRow = ws.getRow(headerRowIdx + 1 + idx);
    spec.columns.forEach((col, i) => {
      const cell = dataRow.getCell(i + 1);
      const raw = r[col.key];
      if (col.format === 'currency' || col.format === 'number') cell.value = typeof raw === 'number' ? raw : Number(raw) || 0;
      else if (col.format === 'percent') cell.value = typeof raw === 'number' ? raw / 100 : Number(raw) / 100 || 0;
      else cell.value = raw ?? '';
      if (col.format === 'currency') cell.numFmt = '"Rs" #,##0';
      if (col.format === 'number') cell.numFmt = '#,##0';
      if (col.format === 'percent') cell.numFmt = '0.0%';
      cell.alignment = { horizontal: col.align || 'left' };
      if (idx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F6F9' } };
    });
  });

  if (spec.totals) {
    const totalsRowIdx = headerRowIdx + 1 + spec.rows.length;
    const totalsRow = ws.getRow(totalsRowIdx);
    spec.columns.forEach((col, i) => {
      const cell = totalsRow.getCell(i + 1);
      const raw = spec.totals![col.key];
      if (raw === undefined) return;
      if (col.format === 'currency' || col.format === 'number') cell.value = Number(raw) || 0;
      else if (col.format === 'percent') cell.value = Number(raw) / 100 || 0;
      else cell.value = raw;
      if (col.format === 'currency') cell.numFmt = '"Rs" #,##0';
      if (col.format === 'number') cell.numFmt = '#,##0';
      if (col.format === 'percent') cell.numFmt = '0.0%';
      cell.font = { bold: true };
      cell.border = { top: { style: 'thin', color: { argb: 'FF999999' } } };
      cell.alignment = { horizontal: col.align || 'left' };
    });
  }

  ws.columns.forEach((c, i) => {
    c.width = spec.columns[i]?.width || Math.max(12, spec.columns[i]?.header.length + 4 || 14);
  });
  ws.views = [{ state: 'frozen', ySplit: headerRowIdx }];
  ws.autoFilter = { from: { row: headerRowIdx, column: 1 }, to: { row: headerRowIdx, column: colCount } };

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ─────────────────────────────────────────────────────────────────────────
// PDF
// ─────────────────────────────────────────────────────────────────────────

export function buildPdfBuffer(spec: ExportSpec): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const landscape = spec.columns.length > 5;
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: landscape ? 'landscape' : 'portrait', bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.font('Helvetica-Bold').fontSize(16).fillColor('#0b0b0b').text(BRAND);
    doc.font('Helvetica').fontSize(8).fillColor('#666666').text(BRAND_SUB);
    doc.moveDown(0.6);
    doc.font('Helvetica-Bold').fontSize(13).fillColor(`#${ACCENT}`).text(spec.title);
    if (spec.subtitle) {
      doc.font('Helvetica').fontSize(9).fillColor('#666666').text(spec.subtitle);
    }
    const metaLine = [
      ...(spec.meta || []).map((m) => `${m.label}: ${m.value}`),
      `Generated ${new Date().toLocaleString()}${spec.generatedBy ? ' by ' + spec.generatedBy : ''}`,
    ].join('   |   ');
    doc.font('Helvetica').fontSize(8).fillColor('#999999').text(metaLine);
    doc.moveDown(0.8);

    drawTable(doc, spec.columns, spec.rows, spec.totals);

    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      const bottom = doc.page.height - doc.page.margins.bottom + 16;
      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor('#999999')
        .text(`${BRAND} — Confidential`, doc.page.margins.left, bottom, { continued: true, width: doc.page.width - doc.page.margins.left - doc.page.margins.right, align: 'left' })
        .text(`Page ${i - range.start + 1} of ${range.count}`, { align: 'right' });
    }

    doc.end();
  });
}

function drawTable(doc: PDFKit.PDFDocument, columns: ExportColumn[], rows: Record<string, any>[], totals?: Record<string, any>) {
  const startX = doc.page.margins.left;
  const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const weights = columns.map((c) => (!c.align || c.align === 'left' ? 2 : 1));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const widths = weights.map((w) => (w / totalWeight) * usableWidth);
  const rowHeight = 20;
  let y = doc.y;

  function ensureSpace(h: number) {
    if (y + h > doc.page.height - doc.page.margins.bottom - 24) {
      doc.addPage();
      y = doc.page.margins.top;
    }
  }

  function drawRow(values: string[], opts: { fill?: string; textColor?: string; bold?: boolean; topBorder?: boolean } = {}) {
    ensureSpace(rowHeight);
    if (opts.fill) {
      doc.rect(startX, y, usableWidth, rowHeight).fill(opts.fill);
    }
    if (opts.topBorder) {
      doc.moveTo(startX, y).lineTo(startX + usableWidth, y).strokeColor('#999999').lineWidth(0.5).stroke();
    }
    doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5).fillColor(opts.textColor || '#111111');
    let x = startX;
    columns.forEach((col, i) => {
      doc.text(values[i] ?? '', x + 4, y + 6, { width: widths[i] - 8, align: col.align || 'left', lineBreak: false, ellipsis: true });
      x += widths[i];
    });
    y += rowHeight;
  }

  drawRow(
    columns.map((c) => c.header),
    { fill: `#${ACCENT}`, textColor: '#ffffff', bold: true }
  );
  rows.forEach((r, idx) => {
    const values = columns.map((c) => formatCell(r[c.key], c.format));
    drawRow(values, idx % 2 === 1 ? { fill: '#f4f6f9' } : {});
  });
  if (totals) {
    const values = columns.map((c) => formatCell(totals[c.key], c.format));
    drawRow(values, { bold: true, fill: '#eef2f7', topBorder: true });
  }

  doc.y = y + 10;
}
