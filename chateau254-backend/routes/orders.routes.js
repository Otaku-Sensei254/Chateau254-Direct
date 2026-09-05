const express = require('express');
const asyncHandler = require('../middleware/async.middleware');
const { query } = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

const orderQuery = `
    SELECT o.*, u.full_name AS customer_name, u.email AS customer_email,
      r.full_name AS rider_name, r.phone AS rider_phone,
      (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS items_count
  FROM orders o
  JOIN users u ON u.id = o.user_id
  LEFT JOIN riders r ON r.id = o.rider_id
`;

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const isAdmin = req.user.roles?.includes('admin') || req.user.role === 'admin';
  const values = [];
  let where = '';

  if (!isAdmin) {
    where = ' WHERE o.user_id = $1';
    values.push(req.user.id);
  } else if (req.query.status) {
    where = ' WHERE o.status = $1';
    values.push(req.query.status);
  }

  const result = await query(`${orderQuery}${where} ORDER BY o.created_at DESC`, values);
  res.json({ orders: result.rows });
}));

router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const result = await query(`${orderQuery} WHERE o.id = $1`, [req.params.id]);
  if (!result.rowCount) return res.status(404).json({ error: 'Order not found' });

  const items = await query(
    `SELECT oi.*, mi.name AS item_name, mi.image_url
     FROM order_items oi
     JOIN menu_items mi ON mi.id = oi.menu_item_id
     WHERE oi.order_id = $1`,
    [req.params.id],
  );

  res.json({ order: { ...result.rows[0], items: items.rows } });
}));

router.post('/', authenticate, requireRole('customer', 'admin'), asyncHandler(async (req, res) => {
  const { user_id, delivery_address, total_amount, items = [] } = req.body;
  if (!user_id || !delivery_address || total_amount === undefined) return res.status(400).json({ error: 'User, delivery address, and total amount are required' });

  const result = await query(
    `INSERT INTO orders (user_id, delivery_address, total_amount)
     VALUES ($1, $2, $3) RETURNING *`,
    [user_id, delivery_address, total_amount],
  );
  const order = result.rows[0];

  for (const item of items) {
    await query('INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price) VALUES ($1, $2, $3, $4)', [order.id, item.menu_item_id, item.quantity, item.unit_price]);
  }

  res.status(201).json({ order });
}));

router.patch('/:id/status', authenticate, requireRole('admin', 'rider'), asyncHandler(async (req, res) => {
  const { status, rider_id } = req.body;
  const allowedStatuses = ['pending', 'preparing', 'out_for_delivery', 'completed', 'cancelled'];
  if (!allowedStatuses.includes(status)) return res.status(400).json({ error: 'Invalid order status' });

  const result = await query(
    `UPDATE orders SET status = $1, rider_id = COALESCE($2, rider_id), updated_at = NOW()
     WHERE id = $3 RETURNING *`,
    [status, rider_id || null, req.params.id],
  );
  if (!result.rowCount) return res.status(404).json({ error: 'Order not found' });
  res.json({ order: result.rows[0] });
}));

module.exports = router;
