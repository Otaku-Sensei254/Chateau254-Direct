const express = require('express');
const asyncHandler = require('../middleware/async.middleware');
const { query } = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { buildReportPdf } = require('../services/reportPdf');

const router = express.Router();

const PERIODS = {
  today: { label: 'Today', sql: "date_trunc('day', NOW())", next: "INTERVAL '1 day'", step: 'hour' },
  week: { label: 'This Week', sql: "date_trunc('week', NOW())", next: "INTERVAL '1 week'", step: 'day' },
  month: { label: 'This Month', sql: "date_trunc('month', NOW())", next: "INTERVAL '1 month'", step: 'day' },
};

// Item names live in whichever of the four tables the item was created in, so any
// report that groups by item has to resolve across all of them.
const CATALOG_CTE = `
  WITH catalog AS (
    SELECT id, name, category FROM wines
    UNION ALL SELECT id, name, category FROM dine_in_menu
    UNION ALL SELECT id, name, category FROM takeout_menu
    UNION ALL SELECT id, name, category FROM lunchbox_menu
  )
`;

const num = (value) => Number(value || 0);
const round2 = (value) => Math.round(num(value) * 100) / 100;
const kes = (value) => `KES ${num(value).toLocaleString('en-KE')}`;

// Bounds are resolved by the database rather than the Node process so the reporting
// window always matches the database timezone instead of the server's.
const resolvePeriod = async (period) => {
  const config = PERIODS[period];
  const { rows } = await query(
    `SELECT ${config.sql} AS from_ts, ${config.sql} + ${config.next} AS to_ts,
            ${config.sql} - ${config.next} AS prev_from, ${config.sql} AS prev_to`,
  );
  return { ...config, ...rows[0] };
};

const fetchSummary = async (fromTs, toTs) => {
  const { rows } = await query(
    `SELECT
       COUNT(*)::int AS orders,
       COALESCE(SUM(o.total_amount) FILTER (WHERE o.status <> 'cancelled'), 0) AS revenue,
       COALESCE(AVG(o.total_amount) FILTER (WHERE o.status <> 'cancelled'), 0) AS average_order_value,
       COUNT(*) FILTER (WHERE o.status = 'completed')::int AS completed,
       COUNT(*) FILTER (WHERE o.status = 'cancelled')::int AS cancelled,
       COUNT(*) FILTER (WHERE o.status IN ('pending', 'preparing', 'out_for_delivery'))::int AS in_progress
     FROM orders o
     WHERE o.created_at >= $1 AND o.created_at < $2`,
    [fromTs, toTs],
  );
  const summary = rows[0];

  const items = await query(
    `SELECT COALESCE(SUM(oi.quantity), 0)::int AS items_sold,
            COUNT(DISTINCT o.user_id)::int AS unique_customers
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     WHERE o.created_at >= $1 AND o.created_at < $2 AND o.status <> 'cancelled'`,
    [fromTs, toTs],
  );

  const customers = await query(
    `SELECT COUNT(*)::int AS new_customers FROM users WHERE created_at >= $1 AND created_at < $2`,
    [fromTs, toTs],
  );

  return {
    orders: summary.orders,
    revenue: round2(summary.revenue),
    averageOrderValue: round2(summary.average_order_value),
    completed: summary.completed,
    cancelled: summary.cancelled,
    inProgress: summary.in_progress,
    itemsSold: items.rows[0].items_sold,
    uniqueCustomers: items.rows[0].unique_customers,
    newCustomers: customers.rows[0].new_customers,
  };
};

const fetchByStatus = async (fromTs, toTs) => {
  const { rows } = await query(
    `SELECT status, COUNT(*)::int AS count,
            COALESCE(SUM(total_amount), 0) AS revenue
     FROM orders
     WHERE created_at >= $1 AND created_at < $2
     GROUP BY status ORDER BY count DESC`,
    [fromTs, toTs],
  );
  return rows.map((row) => ({ status: row.status, count: row.count, revenue: round2(row.revenue) }));
};

// The series is generated in SQL with generate_series so empty hours and days still
// appear as zero-value bars and the buckets stay aligned to the database timezone.
const fetchSeries = async (period, config, fromTs, toTs) => {
  const granularity = config.step === 'hour' ? 'hour' : 'day';
  const { rows } = await query(
    `SELECT to_char(b.bucket, $3) AS label,
            COALESCE(COUNT(o.id), 0)::int AS orders,
            COALESCE(SUM(o.total_amount) FILTER (WHERE o.status <> 'cancelled'), 0) AS revenue
     FROM generate_series($1::timestamptz, $2::timestamptz - $4::interval, $4::interval) AS b(bucket)
     LEFT JOIN orders o
       ON date_trunc($5, o.created_at) = b.bucket
      AND o.created_at >= $1::timestamptz AND o.created_at < $2::timestamptz
     GROUP BY b.bucket
     ORDER BY b.bucket`,
    [fromTs, toTs, granularity === 'hour' ? 'HH24:00' : 'Dy DD', config.step === 'hour' ? '1 hour' : '1 day', granularity],
  );
  return rows.map((row) => ({ label: row.label, orders: row.orders, revenue: round2(row.revenue) }));
};

const fetchTopItems = async (fromTs, toTs) => {
  const { rows } = await query(
    `${CATALOG_CTE}
     SELECT COALESCE(c.name, 'Removed item') AS name,
            SUM(oi.quantity)::int AS quantity,
            SUM(oi.quantity * oi.unit_price) AS revenue
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     LEFT JOIN catalog c ON c.id = oi.menu_item_id
     WHERE o.created_at >= $1 AND o.created_at < $2 AND o.status <> 'cancelled'
     GROUP BY c.name
     ORDER BY quantity DESC, revenue DESC
     LIMIT 10`,
    [fromTs, toTs],
  );
  return rows.map((row) => ({ name: row.name, quantity: row.quantity, revenue: round2(row.revenue) }));
};

const fetchCategories = async (fromTs, toTs) => {
  const { rows } = await query(
    `${CATALOG_CTE}
     SELECT COALESCE(c.category, 'Uncategorised') AS category,
            SUM(oi.quantity)::int AS quantity,
            SUM(oi.quantity * oi.unit_price) AS revenue
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     LEFT JOIN catalog c ON c.id = oi.menu_item_id
     WHERE o.created_at >= $1 AND o.created_at < $2 AND o.status <> 'cancelled'
     GROUP BY c.category
     ORDER BY revenue DESC`,
    [fromTs, toTs],
  );
  return rows.map((row) => ({ category: row.category, quantity: row.quantity, revenue: round2(row.revenue) }));
};

const buildReport = async (period) => {
  const config = await resolvePeriod(period);
  const [summary, previous, byStatus, series, topItems, categories] = await Promise.all([
    fetchSummary(config.from_ts, config.to_ts),
    fetchSummary(config.prev_from, config.prev_to),
    fetchByStatus(config.from_ts, config.to_ts),
    fetchSeries(period, config, config.from_ts, config.to_ts),
    fetchTopItems(config.from_ts, config.to_ts),
    fetchCategories(config.from_ts, config.to_ts),
  ]);

  return {
    period,
    label: config.label,
    granularity: config.step,
    range: {
      from: new Date(config.from_ts).toISOString(),
      to: new Date(config.to_ts).toISOString(),
    },
    summary,
    previous,
    byStatus,
    series,
    topItems,
    categories,
    generatedAt: new Date().toISOString(),
  };
};

const resolvePeriodParam = (req, res) => {
  const period = (req.query.period || 'today').toLowerCase();
  if (!PERIODS[period]) {
    res.status(400).json({ error: `Unknown period "${req.query.period}". Expected one of: today, week, month.` });
    return null;
  }
  return period;
};

router.get('/', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const period = resolvePeriodParam(req, res);
  if (!period) return undefined;
  return res.json(await buildReport(period));
}));

router.get('/pdf', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const period = resolvePeriodParam(req, res);
  if (!period) return undefined;

  const report = await buildReport(period);
  const pdf = await buildReportPdf(report);
  const stamp = new Date(report.generatedAt).toISOString().slice(0, 10);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="chateau254-${period}-${stamp}.pdf"`);
  res.setHeader('Content-Length', pdf.length);
  return res.send(pdf);
}));

module.exports = router;
module.exports.buildReport = buildReport;
module.exports.PERIODS = PERIODS;