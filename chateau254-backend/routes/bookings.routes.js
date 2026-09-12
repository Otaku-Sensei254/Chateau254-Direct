const express = require('express');
const asyncHandler = require('../middleware/async.middleware');
const { query } = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

const bookingQuery = `
  SELECT b.*, t.table_number
  FROM bookings b
  LEFT JOIN tables t ON t.id = b.table_id
`;

router.get('/', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const result = await query(`${bookingQuery} ORDER BY b.created_at DESC`);
  res.json({ bookings: result.rows });
}));

router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const result = await query(
    `${bookingQuery} WHERE b.user_id = $1 ORDER BY b.created_at DESC`,
    [req.user.id],
  );
  res.json({ bookings: result.rows });
}));

router.post('/', authenticate, asyncHandler(async (req, res) => {
  const { customer_name, party_size, preferred_item, dining_time, notes } = req.body;
  if (!customer_name || !party_size || !dining_time) {
    return res.status(400).json({ error: 'Customer name, party size, and dining time are required' });
  }

  const result = await query(
    `INSERT INTO bookings (user_id, customer_name, party_size, preferred_item, dining_time, notes)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [req.user.id, customer_name, party_size, preferred_item || null, dining_time, notes || ''],
  );

  const booking = result.rows[0];

  const io = req.app.get('io');
  if (io) {
    io.to('admin').emit('booking:created', { booking });
  }

  res.status(201).json({ booking });
}));

router.patch('/:id/table', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { table_id } = req.body;
  if (!table_id) return res.status(400).json({ error: 'Table ID is required' });

  const tableCheck = await query('SELECT id, status FROM tables WHERE id = $1', [table_id]);
  if (!tableCheck.rowCount) return res.status(404).json({ error: 'Table not found' });
  if (tableCheck.rows[0].status !== 'available') {
    return res.status(400).json({ error: 'Table is not available' });
  }

  const bookingCheck = await query('SELECT id, table_id FROM bookings WHERE id = $1', [req.params.id]);
  if (!bookingCheck.rowCount) return res.status(404).json({ error: 'Booking not found' });

  if (bookingCheck.rows[0].table_id) {
    await query(
      "UPDATE tables SET status = 'available', updated_at = NOW() WHERE id = $1",
      [bookingCheck.rows[0].table_id],
    );
  }

  const result = await query(
    "UPDATE bookings SET table_id = $1, status = 'confirmed', updated_at = NOW() WHERE id = $2 RETURNING *",
    [table_id, req.params.id],
  );

  await query(
    "UPDATE tables SET status = 'reserved', updated_at = NOW() WHERE id = $1",
    [table_id],
  );

  const io = req.app.get('io');
  if (io) {
    io.to('admin').emit('booking:updated', { booking: result.rows[0] });
  }

  res.json({ booking: result.rows[0] });
}));

router.delete('/:id/table', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const bookingCheck = await query('SELECT id, table_id FROM bookings WHERE id = $1', [req.params.id]);
  if (!bookingCheck.rowCount) return res.status(404).json({ error: 'Booking not found' });

  const { table_id } = bookingCheck.rows[0];

  const result = await query(
    "UPDATE bookings SET table_id = NULL, status = 'completed', updated_at = NOW() WHERE id = $1 RETURNING *",
    [req.params.id],
  );

  if (table_id) {
    await query(
      "UPDATE tables SET status = 'available', updated_at = NOW() WHERE id = $1",
      [table_id],
    );
  }

  const io = req.app.get('io');
  if (io) {
    io.to('admin').emit('booking:updated', { booking: result.rows[0] });
  }

  res.json({ booking: result.rows[0] });
}));

module.exports = router;
