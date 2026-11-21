const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');

const COLORS = {
  // Brand luxury accents
  darkHeader: '#0B0A08',        // Signature Château Noir
  darkSurface: '#141210',       // Dark Card Surface
  gold: '#B08D45',              // Château Gold
  goldLight: '#CBA961',         // Warm Champagne Gold
  goldDark: '#8A6C30',          // Deep Antique Gold
  goldPale: '#FBF7ED',          // Soft Gold background tint
  goldBorder: '#D8BD82',
  burgundy: '#761329',          // Royal Wine Accent
  burgundyLight: '#8B1C35',

  // Surfaces & Lines
  cardBg: '#FAFAF9',
  cardBgAlt: '#F5F5F4',
  cardBorder: '#E7E5E4',
  line: '#E7E5E4',
  lineSubtle: '#F5F5F4',
  tableHeader: '#1E293B',       // Slate 800

  // Text inks
  ink: '#0F172A',               // Slate 900
  inkSoft: '#334155',           // Slate 700
  muted: '#64748B',             // Slate 500
  faint: '#94A3B8',             // Slate 400
  white: '#FFFFFF',

  // Status indicators
  success: '#15803D',
  successBg: '#DCFCE7',
  warning: '#B45309',
  warningBg: '#FEF3C7',
  danger: '#B91C1C',
  dangerBg: '#FEE2E2',
  info: '#1D4ED8',
  infoBg: '#DBEAFE',
};

const PAGE_MARGIN = 36;
const FOOTER_HEIGHT = 38;

const toNum = (value) => Number(value || 0);
const fmtNum = (value) => toNum(value).toLocaleString('en-KE');
const kes = (value) => `KES ${toNum(value).toLocaleString('en-KE')}`;

const formatDate = (value) => new Date(value).toLocaleString('en-KE', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

const formatShortDate = (value) => new Date(value).toLocaleDateString('en-KE', {
  day: '2-digit', month: 'short', year: 'numeric',
});

// Resolves logo path gracefully across deployment structures
const getLogoPath = () => {
  const candidates = [
    path.join(__dirname, '..', 'assets', 'chateau-logo.png'),
    path.join(__dirname, '..', '..', 'chateau245-direct', 'src', 'components', 'images', 'chateau-nobg.png'),
    path.join(__dirname, '..', '..', 'chateau245-direct', 'src', 'components', 'images', 'chateau-emblem.png'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
};

// Adds a page when the next block would run past the printable area
const ensureSpace = (doc, needed, report) => {
  if (doc.y + needed > doc.page.height - PAGE_MARGIN - FOOTER_HEIGHT) {
    doc.addPage();
    drawPageTop(doc, report);
  }
};

const drawPageTop = (doc, report) => {
  doc.y = PAGE_MARGIN;
  doc.fillColor(COLORS.muted).font('Helvetica-Bold').fontSize(7.5)
    .text('CHÂTEAU254', PAGE_MARGIN, doc.y, { continued: true });
  doc.font('Helvetica').fontSize(7.5).fillColor(COLORS.faint)
    .text(`  •  ${(report?.label || 'EXECUTIVE').toUpperCase()} PERFORMANCE REPORT  •  DATA BREAKDOWN`);
  const lineY = doc.y + 4;
  doc.moveTo(PAGE_MARGIN, lineY).lineTo(PAGE_MARGIN + 24, lineY)
    .lineWidth(1.5).strokeColor(COLORS.gold).stroke();
  doc.moveTo(PAGE_MARGIN + 24, lineY).lineTo(doc.page.width - PAGE_MARGIN, lineY)
    .lineWidth(0.5).strokeColor(COLORS.line).stroke();
  doc.y = lineY + 14;
  doc.fillColor(COLORS.ink);
};

const drawSectionHeading = (doc, title, subtitle, report) => {
  ensureSpace(doc, 42, report);
  const y = doc.y;

  // Gold vertical marker
  doc.rect(PAGE_MARGIN, y, 4, 14).fillColor(COLORS.gold).fill();

  // Heading text
  doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(11)
    .text(title.toUpperCase(), PAGE_MARGIN + 12, y + 1, { characterSpacing: 0.6 });

  if (subtitle) {
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8)
      .text(subtitle, doc.page.width - PAGE_MARGIN - 200, y + 2, { width: 200, align: 'right' });
  }

  // Accent underline across page width
  const lineY = y + 18;
  doc.moveTo(PAGE_MARGIN, lineY).lineTo(PAGE_MARGIN + 32, lineY)
    .lineWidth(2).strokeColor(COLORS.gold).stroke();
  doc.moveTo(PAGE_MARGIN + 32, lineY).lineTo(doc.page.width - PAGE_MARGIN, lineY)
    .lineWidth(0.5).strokeColor(COLORS.line).stroke();

  doc.y = lineY + 12;
  doc.fillColor(COLORS.ink);
};

const drawSummaryCards = (doc, summary) => {
  const cards = [
    {
      label: 'Total Revenue',
      value: kes(summary.revenue),
      subtext: 'Gross Period Sales',
      hero: true,
    },
    {
      label: 'Total Orders',
      value: fmtNum(summary.orders),
      subtext: `${summary.completed || 0} completed (${Math.round(((summary.completed || 0) / (summary.orders || 1)) * 100)}%)`,
      badge: 'completed',
    },
    {
      label: 'Average Order Value',
      value: kes(summary.averageOrderValue),
      subtext: 'Revenue Per Order',
    },
    {
      label: 'Items Sold',
      value: fmtNum(summary.itemsSold),
      subtext: `${summary.uniqueCustomers || 0} unique buyers`,
    },
    {
      label: 'Completed Orders',
      value: fmtNum(summary.completed),
      subtext: 'Delivered & Fulfilled',
      statusColor: COLORS.success,
    },
    {
      label: 'In Progress',
      value: fmtNum(summary.inProgress),
      subtext: 'Active in Kitchen / Transit',
      statusColor: COLORS.info,
    },
    {
      label: 'Cancelled Orders',
      value: fmtNum(summary.cancelled),
      subtext: `${Math.round(((summary.cancelled || 0) / (summary.orders || 1)) * 100)}% of total volume`,
      statusColor: COLORS.muted,
    },
    {
      label: 'New Customers',
      value: fmtNum(summary.newCustomers),
      subtext: 'First-time Registrations',
      statusColor: COLORS.gold,
    },
  ];

  const columns = 4;
  const gap = 8;
  const totalWidth = doc.page.width - PAGE_MARGIN * 2;
  const cardWidth = (totalWidth - gap * (columns - 1)) / columns;
  const cardHeight = 56;

  cards.forEach((card, index) => {
    ensureSpace(doc, cardHeight + 8);
    const column = index % columns;
    const x = PAGE_MARGIN + column * (cardWidth + gap);
    const y = doc.y;

    if (card.hero) {
      // Hero Revenue Card (Subtle Gold/Cream Background with Gold Top Bar)
      doc.roundedRect(x, y, cardWidth, cardHeight, 5)
        .fillColor(COLORS.goldPale).fill();
      doc.roundedRect(x, y, cardWidth, cardHeight, 5)
        .lineWidth(0.75).strokeColor(COLORS.goldBorder).stroke();
      doc.rect(x + 5, y, cardWidth - 10, 2.5)
        .fillColor(COLORS.gold).fill();

      doc.fillColor(COLORS.goldDark).font('Helvetica-Bold').fontSize(7)
        .text(card.label.toUpperCase(), x + 9, y + 8, { width: cardWidth - 18, characterSpacing: 0.5 });
      doc.fillColor(COLORS.burgundy).font('Helvetica-Bold').fontSize(11.5)
        .text(card.value, x + 9, y + 22, { width: cardWidth - 18, ellipsis: true });
      doc.fillColor(COLORS.muted).font('Helvetica').fontSize(6.5)
        .text(card.subtext, x + 9, y + 40, { width: cardWidth - 18, ellipsis: true });
    } else {
      // Standard Metric Card
      doc.roundedRect(x, y, cardWidth, cardHeight, 5)
        .fillColor(COLORS.cardBg).fill();
      doc.roundedRect(x, y, cardWidth, cardHeight, 5)
        .lineWidth(0.5).strokeColor(COLORS.cardBorder).stroke();

      doc.fillColor(COLORS.muted).font('Helvetica-Bold').fontSize(6.8)
        .text(card.label.toUpperCase(), x + 9, y + 8, { width: cardWidth - 18, characterSpacing: 0.4 });
      doc.fillColor(card.statusColor || COLORS.ink).font('Helvetica-Bold').fontSize(11.5)
        .text(card.value, x + 9, y + 22, { width: cardWidth - 18, ellipsis: true });
      doc.fillColor(COLORS.faint).font('Helvetica').fontSize(6.5)
        .text(card.subtext, x + 9, y + 40, { width: cardWidth - 18, ellipsis: true });
    }

    if (column === columns - 1) {
      doc.y = y + cardHeight + gap;
    }
  });

  doc.y += 6;
};

const drawTrendBanner = (doc, report) => {
  const { summary, previous } = report;
  if (!previous || (previous.orders === 0 && previous.revenue === 0)) return;

  const prevRev = toNum(previous.revenue);
  const currRev = toNum(summary.revenue);
  const change = prevRev > 0 ? ((currRev - prevRev) / prevRev) * 100 : null;

  ensureSpace(doc, 36);
  const bannerY = doc.y;
  const width = doc.page.width - PAGE_MARGIN * 2;

  const isPositive = change !== null && change >= 0;
  const trendBg = isPositive ? '#F0FDF4' : '#FEF2F2';
  const trendBorder = isPositive ? '#BBF7D0' : '#FECACA';
  const trendColor = isPositive ? COLORS.success : COLORS.danger;
  const arrow = isPositive ? '▲' : '▼';

  doc.roundedRect(PAGE_MARGIN, bannerY, width, 28, 4)
    .fillColor(trendBg).fill();
  doc.roundedRect(PAGE_MARGIN, bannerY, width, 28, 4)
    .lineWidth(0.5).strokeColor(trendBorder).stroke();

  // Trend Pill
  const pillText = change === null ? 'NEW DATA' : `${arrow} ${Math.abs(change).toFixed(1)}%`;
  doc.roundedRect(PAGE_MARGIN + 8, bannerY + 6, 60, 16, 3)
    .fillColor(trendColor).fill();
  doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(7.5)
    .text(pillText, PAGE_MARGIN + 8, bannerY + 10, { width: 60, align: 'center' });

  // Description
  const desc = change === null
    ? `No baseline sales in previous period (${kes(prevRev)}). Total orders this cycle: ${fmtNum(summary.orders)}.`
    : `Revenue ${isPositive ? 'grew' : 'decreased'} compared to the prior ${report.label.toLowerCase()} period (${kes(prevRev)} across ${fmtNum(previous.orders)} orders).`;

  doc.fillColor(COLORS.inkSoft).font('Helvetica').fontSize(8)
    .text(desc, PAGE_MARGIN + 76, bannerY + 9, { width: width - 85, ellipsis: true });

  doc.y = bannerY + 34;
  doc.fillColor(COLORS.ink);
};

const drawSeriesChart = (doc, series, granularity, report) => {
  if (!series || !series.length) return;

  drawSectionHeading(doc, `Revenue Timeline (${granularity === 'hour' ? 'Hourly Performance' : 'Daily Trend'})`, null, report);

  const chartHeight = 95;
  const width = doc.page.width - PAGE_MARGIN * 2;
  const top = doc.y;
  const values = series.map((p) => toNum(p.revenue));
  const max = Math.max(...values, 0);
  const scale = max > 0 ? max : 1;
  const peakIndex = values.indexOf(max);

  // Background frame
  doc.roundedRect(PAGE_MARGIN, top, width, chartHeight + 24, 6)
    .fillColor('#FAFBFD').fill();
  doc.roundedRect(PAGE_MARGIN, top, width, chartHeight + 24, 6)
    .lineWidth(0.5).strokeColor(COLORS.cardBorder).stroke();

  // Horizontal Grid Lines
  const gridLevels = [0.25, 0.5, 0.75, 1];
  gridLevels.forEach((level) => {
    const gridY = top + chartHeight - level * (chartHeight - 16);
    doc.moveTo(PAGE_MARGIN + 10, gridY).lineTo(PAGE_MARGIN + width - 10, gridY)
      .lineWidth(0.5).strokeColor(COLORS.line).stroke();
  });

  const slot = (width - 24) / series.length;
  const barWidth = Math.max(2, Math.min(slot - 3, 20));

  series.forEach((point, index) => {
    const value = toNum(point.revenue);
    const height = Math.max(1, (value / scale) * (chartHeight - 20));
    const x = PAGE_MARGIN + 12 + index * slot + (slot - barWidth) / 2;
    const y = top + chartHeight - height;
    const isPeak = index === peakIndex && max > 0;

    // Draw Bar with rounded top
    doc.roundedRect(x, y, barWidth, height, 2.5)
      .fillColor(isPeak ? COLORS.burgundy : COLORS.gold).fill();

    // Peak label tag
    if (isPeak) {
      doc.fillColor(COLORS.burgundy).font('Helvetica-Bold').fontSize(5.5)
        .text('★ PEAK', x - 8, y - 8, { width: barWidth + 16, align: 'center' });
    }

    // X-Axis Labels (sample if lots of points)
    const step = series.length > 14 ? Math.ceil(series.length / 10) : 1;
    if (index % step === 0 || index === series.length - 1) {
      doc.fillColor(COLORS.muted).font('Helvetica').fontSize(6.5)
        .text(point.label, x - 6, top + chartHeight + 6, { width: barWidth + 12, align: 'center' });
    }
  });

  doc.y = top + chartHeight + 32;
  doc.fillColor(COLORS.muted).font('Helvetica').fontSize(7.5)
    .text(`Peak Revenue: ${kes(max)} • Total Series Revenue: ${kes(values.reduce((a, b) => a + b, 0))}`, PAGE_MARGIN, doc.y);
  doc.y += 16;
};

const drawTable = (doc, { title, columns, rows, isTopItems = false, isStatus = false }, report) => {
  if (!rows || !rows.length) return;

  drawSectionHeading(doc, title, `${rows.length} entries`, report);

  const total = doc.page.width - PAGE_MARGIN * 2;
  const widths = columns.map((col) => col.width * total);
  const rowHeight = 21;

  const drawHeader = () => {
    const y = doc.y;
    // Elegant dark header band with soft rounded top
    doc.roundedRect(PAGE_MARGIN, y, total, rowHeight, 3).fillColor(COLORS.tableHeader).fill();
    let x = PAGE_MARGIN;
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLORS.white);

    columns.forEach((column, index) => {
      doc.text(column.label.toUpperCase(), x + 8, y + 6.5, {
        width: widths[index] - 16,
        align: column.align || 'left',
        characterSpacing: 0.4,
        lineBreak: false,
      });
      x += widths[index];
    });
    doc.y = y + rowHeight;
  };

  ensureSpace(doc, rowHeight * 2, report);
  drawHeader();

  rows.forEach((row, index) => {
    if (doc.y + rowHeight > doc.page.height - PAGE_MARGIN - FOOTER_HEIGHT) {
      doc.addPage();
      drawPageTop(doc, report);
      drawHeader();
    }

    const y = doc.y;
    const isEven = index % 2 === 0;

    // Alternating zebra row fill
    if (!isEven) {
      doc.rect(PAGE_MARGIN, y, total, rowHeight).fillColor('#F8FAFC').fill();
    }

    let x = PAGE_MARGIN;
    doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.ink);

    columns.forEach((column, columnIndex) => {
      const cellVal = String(row[column.key]);
      const cellW = widths[columnIndex];

      // Formatted rank pill for Top Items
      if (isTopItems && column.key === 'rank') {
        const isTop3 = index < 3;
        const rankColor = isTop3 ? COLORS.gold : COLORS.muted;
        doc.fillColor(rankColor).font('Helvetica-Bold').fontSize(8)
          .text(`#${index + 1}`, x + 8, y + 6, { width: cellW - 16, align: 'center' });
      }
      // Status Pill for Status Table
      else if (isStatus && column.key === 'status') {
        const st = cellVal.toLowerCase();
        let bg = COLORS.cardBgAlt;
        let fg = COLORS.inkSoft;
        if (st.includes('completed')) { bg = COLORS.successBg; fg = COLORS.success; }
        else if (st.includes('progress') || st.includes('preparing') || st.includes('out_for_delivery')) { bg = COLORS.infoBg; fg = COLORS.info; }
        else if (st.includes('pending')) { bg = COLORS.warningBg; fg = COLORS.warning; }
        else if (st.includes('cancelled')) { bg = COLORS.dangerBg; fg = COLORS.danger; }

        doc.roundedRect(x + 8, y + 4, cellW - 24, 13, 3).fillColor(bg).fill();
        doc.fillColor(fg).font('Helvetica-Bold').fontSize(7)
          .text(cellVal.toUpperCase(), x + 8, y + 6.5, { width: cellW - 24, align: 'center' });
      } else {
        doc.fillColor(column.color || COLORS.ink).font(column.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5)
          .text(cellVal, x + 8, y + 6, {
            width: cellW - 16,
            align: column.align || 'left',
            lineBreak: false,
            ellipsis: true,
          });
      }

      x += cellW;
    });

    // Row divider
    doc.moveTo(PAGE_MARGIN, y + rowHeight).lineTo(PAGE_MARGIN + total, y + rowHeight)
      .lineWidth(0.5).strokeColor(COLORS.lineSubtle).stroke();
    doc.y = y + rowHeight;
  });

  doc.y += 14;
  doc.fillColor(COLORS.ink);
};

const buildReportPdf = (report) => new Promise((resolve, reject) => {
  const doc = new PDFDocument({
    size: 'A4',
    margin: PAGE_MARGIN,
    bufferPages: true,
    info: {
      Title: `Château254 Management Report — ${report.label}`,
      Author: 'Château254 Operations & Finance',
      Subject: 'Executive Performance & Sales Report',
      Creator: 'Château254 Platform',
    },
  });

  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  doc.on('end', () => resolve(Buffer.concat(chunks)));
  doc.on('error', reject);

  const { summary } = report;
  const logoPath = getLogoPath();

  // =========================================================================
  // Executive Header Bar
  // =========================================================================
  const headerHeight = 92;
  doc.rect(0, 0, doc.page.width, headerHeight).fillColor(COLORS.darkHeader).fill();

  // Gold accent lines at base of header
  doc.rect(0, headerHeight - 3, doc.page.width, 2).fillColor(COLORS.gold).fill();
  doc.rect(0, headerHeight - 1, doc.page.width, 0.75).fillColor(COLORS.goldLight).fill();

  // Logo & Title block
  let textStartX = PAGE_MARGIN;
  if (logoPath) {
    try {
      doc.image(logoPath, PAGE_MARGIN, 18, { width: 54 });
      textStartX = PAGE_MARGIN + 64;
    } catch (e) {
      // Fallback cleanly if image has read error
      textStartX = PAGE_MARGIN;
    }
  }

  doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(17)
    .text('CHÂTEAU254', textStartX, 22, { characterSpacing: 1.2 });
  doc.fillColor(COLORS.goldLight).font('Helvetica-Bold').fontSize(7.5)
    .text('FINE DINING & CURATED WINE CELLAR', textStartX, 43, { characterSpacing: 1 });
  doc.fillColor('#94A3B8').font('Helvetica').fontSize(6.5)
    .text('The Promenade, General Mathenge Drive, Westlands, Nairobi', textStartX, 56);

  // Right Metadata Framed Badge
  const badgeWidth = 164;
  const badgeHeight = 58;
  const badgeX = doc.page.width - PAGE_MARGIN - badgeWidth;
  const badgeY = 16;

  doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 6)
    .fillColor(COLORS.darkSurface).fill();
  doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 6)
    .lineWidth(0.75).strokeColor(COLORS.gold).stroke();

  doc.fillColor(COLORS.goldLight).font('Helvetica-Bold').fontSize(6.5)
    .text('EXECUTIVE PERFORMANCE REPORT', badgeX + 10, badgeY + 8, { width: badgeWidth - 20, characterSpacing: 0.6 });

  doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(11)
    .text(`${report.label.toUpperCase()} REPORT`, badgeX + 10, badgeY + 19, { width: badgeWidth - 20, ellipsis: true });

  const rangeStr = `${formatShortDate(report.range.from)} – ${formatShortDate(report.range.to)}`;
  doc.fillColor('#E2E8F0').font('Helvetica').fontSize(6.8)
    .text(rangeStr, badgeX + 10, badgeY + 34, { width: badgeWidth - 20 });

  doc.fillColor(COLORS.faint).font('Helvetica').fontSize(6)
    .text(`Generated: ${formatDate(report.generatedAt)}`, badgeX + 10, badgeY + 45, { width: badgeWidth - 20 });

  doc.y = 108;

  // =========================================================================
  // Executive KPI Summary Dashboard
  // =========================================================================
  drawSummaryCards(doc, summary);

  // Growth Trend Banner vs Previous Period
  drawTrendBanner(doc, report);

  // =========================================================================
  // Revenue Timeline Chart
  // =========================================================================
  drawSeriesChart(doc, report.series, report.granularity, report);

  // =========================================================================
  // Data Tables
  // =========================================================================
  // 1. Orders by Status
  drawTable(doc, {
    title: 'Order Distribution by Status',
    isStatus: true,
    columns: [
      { key: 'status', label: 'Status', width: 0.45 },
      { key: 'count', label: 'Orders', width: 0.25, align: 'right', bold: true },
      { key: 'revenue', label: 'Gross Value', width: 0.3, align: 'right', color: COLORS.burgundy, bold: true },
    ],
    rows: (report.byStatus || []).map((row) => ({
      status: row.status,
      count: fmtNum(row.count),
      revenue: kes(row.revenue),
    })),
  }, report);

  // 2. Top Performing Menu Items
  drawTable(doc, {
    title: 'Top Performing Menu & Cellar Items',
    isTopItems: true,
    columns: [
      { key: 'rank', label: 'Rank', width: 0.1, align: 'center' },
      { key: 'name', label: 'Item Name', width: 0.48, bold: true },
      { key: 'quantity', label: 'Qty Sold', width: 0.18, align: 'right' },
      { key: 'revenue', label: 'Total Revenue', width: 0.24, align: 'right', color: COLORS.burgundy, bold: true },
    ],
    rows: (report.topItems || []).map((row, i) => ({
      rank: i + 1,
      name: row.name,
      quantity: fmtNum(row.quantity),
      revenue: kes(row.revenue),
    })),
  }, report);

  // 3. Sales Breakdown by Category
  const totalCatRevenue = (report.categories || []).reduce((acc, cat) => acc + toNum(cat.revenue), 0);
  drawTable(doc, {
    title: 'Sales Breakdown by Category',
    columns: [
      { key: 'category', label: 'Category', width: 0.44, bold: true },
      { key: 'quantity', label: 'Units Sold', width: 0.18, align: 'right' },
      { key: 'revenue', label: 'Category Revenue', width: 0.22, align: 'right', bold: true },
      { key: 'share', label: 'Share', width: 0.16, align: 'right', color: COLORS.goldDark, bold: true },
    ],
    rows: (report.categories || []).map((row) => {
      const share = totalCatRevenue > 0 ? (toNum(row.revenue) / totalCatRevenue) * 100 : 0;
      return {
        category: row.category,
        quantity: fmtNum(row.quantity),
        revenue: kes(row.revenue),
        share: `${share.toFixed(1)}%`,
      };
    }),
  }, report);

  // Empty state note if no data exists
  if ((!report.topItems || !report.topItems.length) && (!report.byStatus || !report.byStatus.length)) {
    doc.moveDown(2);
    doc.fillColor(COLORS.muted).font('Helvetica-Oblique').fontSize(9)
      .text(`No transaction records were logged during this ${report.label.toLowerCase()} period.`,
        PAGE_MARGIN, doc.y, { align: 'center', width: doc.page.width - PAGE_MARGIN * 2 });
  }

  // =========================================================================
  // Running Footers (Page X of Y)
  // =========================================================================
  const range = doc.bufferedPageRange();
  for (let index = range.start; index < range.start + range.count; index += 1) {
    doc.switchToPage(index);
    const bottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    const y = doc.page.height - 28;

    // Footer divider line with central gold jewel accent
    doc.moveTo(PAGE_MARGIN, y).lineTo(doc.page.width - PAGE_MARGIN, y)
      .lineWidth(0.5).strokeColor(COLORS.line).stroke();
    doc.moveTo(doc.page.width / 2 - 20, y).lineTo(doc.page.width / 2 + 20, y)
      .lineWidth(1.5).strokeColor(COLORS.gold).stroke();

    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(6.8)
      .text('CHÂTEAU254 MANAGEMENT REPORT  •  CONFIDENTIAL', PAGE_MARGIN, y + 6, { lineBreak: false });

    doc.fillColor(COLORS.faint).font('Helvetica').fontSize(6.5)
      .text('Westlands, Nairobi  •  www.chateau254.co.ke', PAGE_MARGIN, y + 6, {
        width: doc.page.width - PAGE_MARGIN * 2, align: 'center', lineBreak: false,
      });

    doc.fillColor(COLORS.muted).font('Helvetica-Bold').fontSize(6.8)
      .text(`PAGE ${index + 1} OF ${range.count}`, PAGE_MARGIN, y + 6, {
        width: doc.page.width - PAGE_MARGIN * 2, align: 'right', lineBreak: false,
      });

    doc.page.margins.bottom = bottomMargin;
  }

  doc.end();
});

module.exports = { buildReportPdf };
