const PDFDocument = require('pdfkit');

const COLORS = {
  wine: '#7B1E2B',
  gold: '#C9A227',
  ink: '#1F2933',
  muted: '#6B7280',
  line: '#E5E7EB',
  band: '#F9FAFB',
};

const PAGE_MARGIN = 40;
const FOOTER_HEIGHT = 40;
// Arithmetic needs a real number; only fmtNum may be used for display.
const toNum = (value) => Number(value || 0);
const fmtNum = (value) => toNum(value).toLocaleString('en-KE');
const kes = (value) => `KES ${toNum(value).toLocaleString('en-KE')}`;

// Adds a page when the next block would run past the printable area.
const ensureSpace = (doc, needed) => {
  if (doc.y + needed > doc.page.height - PAGE_MARGIN - FOOTER_HEIGHT) doc.addPage();
};

const drawHeading = (doc, text) => {
  ensureSpace(doc, 34);
  doc.fillColor(COLORS.wine).font('Helvetica-Bold').fontSize(11).text(text.toUpperCase(), PAGE_MARGIN, doc.y);
  const y = doc.y + 3;
  doc.moveTo(PAGE_MARGIN, y).lineTo(doc.page.width - PAGE_MARGIN, y).lineWidth(1).strokeColor(COLORS.gold).stroke();
  doc.y = y + 10;
  doc.fillColor(COLORS.ink);
};

const drawSummaryCards = (doc, summary) => {
  const cards = [
    { label: 'Revenue', value: kes(summary.revenue), tone: COLORS.wine },
    { label: 'Orders', value: fmtNum(summary.orders), tone: COLORS.ink },
    { label: 'Average Order', value: kes(summary.averageOrderValue), tone: COLORS.ink },
    { label: 'Items Sold', value: fmtNum(summary.itemsSold), tone: COLORS.ink },
    { label: 'Completed', value: fmtNum(summary.completed), tone: COLORS.ink },
    { label: 'Cancelled', value: fmtNum(summary.cancelled), tone: COLORS.muted },
    { label: 'In Progress', value: fmtNum(summary.inProgress), tone: COLORS.ink },
    { label: 'New Customers', value: fmtNum(summary.newCustomers), tone: COLORS.ink },
  ];

  const columns = 4;
  const gap = 10;
  const width = (doc.page.width - PAGE_MARGIN * 2 - gap * (columns - 1)) / columns;
  const height = 54;

  cards.forEach((card, index) => {
    ensureSpace(doc, height + 8);
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = PAGE_MARGIN + column * (width + gap);

    if (column === 0) doc.y = doc.y;
    const y = doc.y;

    doc.roundedRect(x, y, width, height, 6).fillColor(COLORS.band).fill();
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(7.5)
      .text(card.label.toUpperCase(), x + 10, y + 10, { width: width - 20, characterSpacing: 0.4 });
    doc.fillColor(card.tone).font('Helvetica-Bold').fontSize(12)
      .text(card.value, x + 10, y + 26, { width: width - 20, ellipsis: true });

    if (column === columns - 1) doc.y = y + height + gap;
  });

  doc.y += 6;
};

const drawSeriesChart = (doc, series, granularity) => {
  if (!series.length) return;
  drawHeading(doc, `Revenue by ${granularity === 'hour' ? 'hour' : 'day'}`);

  const chartHeight = 110;
  const width = doc.page.width - PAGE_MARGIN * 2;
  const top = doc.y;
  const values = series.map((point) => toNum(point.revenue));
  const max = Math.max(...values, 0);
  const scale = max > 0 ? max : 1;

  doc.moveTo(PAGE_MARGIN, top + chartHeight).lineTo(PAGE_MARGIN + width, top + chartHeight)
    .lineWidth(0.5).strokeColor(COLORS.line).stroke();

  const slot = width / series.length;
  const barWidth = Math.max(1, Math.min(slot - 3, 22));

  series.forEach((point, index) => {
    const value = toNum(point.revenue);
    const height = (value / scale) * (chartHeight - 12);
    const x = PAGE_MARGIN + index * slot + (slot - barWidth) / 2;
    const y = top + chartHeight - height;

    if (height > 0) doc.rect(x, y, barWidth, height).fillColor(COLORS.wine).fill();

    if (series.length <= 12 || index % Math.ceil(series.length / 12) === 0) {
      doc.fillColor(COLORS.muted).font('Helvetica').fontSize(6.5)
        .text(point.label, x - 4, top + chartHeight + 4, { width: barWidth + 8, align: 'center' });
    }
  });

  doc.y = top + chartHeight + 20;
  doc.fillColor(COLORS.muted).font('Helvetica').fontSize(7.5)
    .text(`Peak ${kes(max)}`, PAGE_MARGIN, doc.y);
  doc.y += 14;
};

const drawTable = (doc, { title, columns, rows, emptyMessage }) => {
  if (!rows.length) return;
  drawHeading(doc, title);

  const total = doc.page.width - PAGE_MARGIN * 2;
  const widths = columns.map((column) => column.width * total);
  const rowHeight = 18;

  const drawHeader = () => {
    const y = doc.y;
    doc.rect(PAGE_MARGIN, y, total, rowHeight).fillColor(COLORS.band).fill();
    let x = PAGE_MARGIN;
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLORS.muted);
    columns.forEach((column, index) => {
      doc.text(column.label.toUpperCase(), x + 6, y + 5.5, {
        width: widths[index] - 12,
        align: column.align || 'left',
        characterSpacing: 0.3,
        lineBreak: false,
      });
      x += widths[index];
    });
    doc.y = y + rowHeight;
  };

  ensureSpace(doc, rowHeight * 2);
  drawHeader();

  rows.forEach((row, index) => {
    if (doc.y + rowHeight > doc.page.height - PAGE_MARGIN - FOOTER_HEIGHT) {
      doc.addPage();
      drawHeader();
    }
    const y = doc.y;
    if (index % 2 === 1) doc.rect(PAGE_MARGIN, y, total, rowHeight).fillColor('#FCFCFD').fill();

    let x = PAGE_MARGIN;
    doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.ink);
    columns.forEach((column, columnIndex) => {
      doc.text(String(row[column.key]), x + 6, y + 5, {
        width: widths[columnIndex] - 12,
        align: column.align || 'left',
        lineBreak: false,
        ellipsis: true,
      });
      x += widths[columnIndex];
    });

    doc.moveTo(PAGE_MARGIN, y + rowHeight).lineTo(PAGE_MARGIN + total, y + rowHeight)
      .lineWidth(0.5).strokeColor(COLORS.line).stroke();
    doc.y = y + rowHeight;
  });

  doc.y += 14;
  doc.fillColor(COLORS.ink);
};

const formatDate = (value) => new Date(value).toLocaleString('en-KE', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

const buildReportPdf = (report) => new Promise((resolve, reject) => {
  const doc = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN, bufferPages: true });
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  doc.on('end', () => resolve(Buffer.concat(chunks)));
  doc.on('error', reject);

  const { summary, previous } = report;

  // Header band
  doc.rect(0, 0, doc.page.width, 78).fillColor(COLORS.wine).fill();
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(20)
    .text('Château254', PAGE_MARGIN, 24);
  doc.font('Helvetica').fontSize(10)
    .text(`${report.label} Report`, PAGE_MARGIN, 50);
  doc.fontSize(8).fillColor('#F3D9DD')
    .text(`${formatDate(report.range.from)}  to  ${formatDate(report.range.to)}`, PAGE_MARGIN, 64);
  doc.y = 100;

  drawSummaryCards(doc, summary);

  if (previous.orders > 0 || previous.revenue > 0) {
    const change = previous.revenue > 0
      ? ((toNum(summary.revenue) - toNum(previous.revenue)) / toNum(previous.revenue)) * 100
      : null;
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted)
      .text(
        change === null
          ? `No comparable revenue in the previous ${report.label.toLowerCase()} period (${kes(previous.revenue)}).`
          : `Revenue ${change >= 0 ? 'up' : 'down'} ${Math.abs(change).toFixed(1)}% versus the previous period (${kes(previous.revenue)}, ${fmtNum(previous.orders)} orders).`,
        PAGE_MARGIN, doc.y,
      );
    doc.y += 18;
    doc.fillColor(COLORS.ink);
  }

  drawSeriesChart(doc, report.series, report.granularity);

  drawTable(doc, {
    title: 'Orders by Status',
    columns: [
      { key: 'status', label: 'Status', width: 0.5 },
      { key: 'count', label: 'Orders', width: 0.25, align: 'right' },
      { key: 'revenue', label: 'Value', width: 0.25, align: 'right' },
    ],
    rows: report.byStatus.map((row) => ({ status: row.status, count: row.count, revenue: kes(row.revenue) })),
  });

  drawTable(doc, {
    title: 'Top Items',
    columns: [
      { key: 'name', label: 'Item', width: 0.5 },
      { key: 'quantity', label: 'Qty', width: 0.2, align: 'right' },
      { key: 'revenue', label: 'Revenue', width: 0.3, align: 'right' },
    ],
    rows: report.topItems.map((row) => ({ name: row.name, quantity: row.quantity, revenue: kes(row.revenue) })),
  });

  drawTable(doc, {
    title: 'Sales by Category',
    columns: [
      { key: 'category', label: 'Category', width: 0.5 },
      { key: 'quantity', label: 'Qty', width: 0.2, align: 'right' },
      { key: 'revenue', label: 'Revenue', width: 0.3, align: 'right' },
    ],
    rows: report.categories.map((row) => ({ category: row.category, quantity: row.quantity, revenue: kes(row.revenue) })),
  });

  if (!report.topItems.length && !report.byStatus.length) {
    doc.moveDown(2);
    doc.fillColor(COLORS.muted).font('Helvetica-Oblique').fontSize(10)
      .text(`No orders were recorded during this ${report.label.toLowerCase()} period.`,
        PAGE_MARGIN, doc.y, { align: 'center', width: doc.page.width - PAGE_MARGIN * 2 });
  }

  // Footers are drawn last so the total page count is known. They sit inside the
  // bottom margin, so pagination is suppressed to avoid appending a blank page per call.
  const range = doc.bufferedPageRange();
  for (let index = range.start; index < range.start + range.count; index += 1) {
    doc.switchToPage(index);
    const bottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    const y = doc.page.height - 30;
    doc.moveTo(PAGE_MARGIN, y).lineTo(doc.page.width - PAGE_MARGIN, y)
      .lineWidth(0.5).strokeColor(COLORS.line).stroke();
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(7.5)
      .text(`Generated ${formatDate(report.generatedAt)}`, PAGE_MARGIN, y + 5, { lineBreak: false });
    doc.text(`Page ${index + 1} of ${range.count}`, PAGE_MARGIN, y + 5, {
      width: doc.page.width - PAGE_MARGIN * 2, align: 'right', lineBreak: false,
    });

    doc.page.margins.bottom = bottomMargin;
  }

  doc.end();
});

module.exports = { buildReportPdf };