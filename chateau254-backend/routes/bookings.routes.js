const express = require('express');
const emailService = require('../services/email.service');
const asyncHandler = require('../middleware/async.middleware');
const { query } = require('../config/db');
const { authenticate, requireRole, optionalAuthenticate } = require('../middleware/auth.middleware');

const router = express.Router();

const bookingQuery = `
  SELECT b.*, t.table_number,
         COALESCE(b.customer_phone, u.phone) AS customer_phone,
         CASE WHEN u.id IS NOT NULL OR EXISTS (
           SELECT 1 FROM users cu
           WHERE cu.phone IS NOT NULL AND cu.phone != ''
             AND (
               cu.phone = b.customer_phone
               OR (
                 LENGTH(REGEXP_REPLACE(cu.phone, '[^0-9]', '', 'g')) >= 9
                 AND LENGTH(REGEXP_REPLACE(COALESCE(b.customer_phone, ''), '[^0-9]', '', 'g')) >= 9
                 AND RIGHT(REGEXP_REPLACE(cu.phone, '[^0-9]', '', 'g'), 9) = RIGHT(REGEXP_REPLACE(COALESCE(b.customer_phone, ''), '[^0-9]', '', 'g'), 9)
               )
             )
         ) THEN TRUE ELSE FALSE END AS is_member
  FROM bookings b
  LEFT JOIN tables t ON t.id = b.table_id
  LEFT JOIN users u ON u.id = b.user_id
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

router.post('/', optionalAuthenticate, asyncHandler(async (req, res) => {
  const { customer_name, customer_phone, party_size, preferred_item, dining_time, notes } = req.body;
  if (!customer_name || !party_size || !dining_time) {
    return res.status(400).json({ error: 'Customer name, party size, and dining time are required' });
  }

  let userId = req.user?.id || null;
  const phone = (customer_phone || req.user?.phone || '').trim();

  if (!userId && phone) {
    const userMatch = await query(
      `SELECT id FROM users
       WHERE phone IS NOT NULL AND phone != ''
         AND (
           phone = $1
           OR (
             LENGTH(REGEXP_REPLACE(phone, '[^0-9]', '', 'g')) >= 9
             AND LENGTH(REGEXP_REPLACE($1, '[^0-9]', '', 'g')) >= 9
             AND RIGHT(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 9) = RIGHT(REGEXP_REPLACE($1, '[^0-9]', '', 'g'), 9)
           )
         )
       LIMIT 1`,
      [phone]
    );
    if (userMatch.rowCount) {
      userId = userMatch.rows[0].id;
    }
  }

  const result = await query(
    `INSERT INTO bookings (user_id, customer_name, customer_phone, party_size, preferred_item, dining_time, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [userId, customer_name, phone || null, party_size, preferred_item || null, dining_time, notes || ''],
  );

  const booking = result.rows[0];
  const fullBooking = await query(`${bookingQuery} WHERE b.id = $1`, [booking.id]);
  const emittedBooking = fullBooking.rows[0] || booking;

  const io = req.app.get('io');
  if (io) {
    io.to('admin').emit('booking:created', { booking: emittedBooking });
  }

  if (userId) {
    const u = await query('SELECT email, full_name FROM users WHERE id = $1', [userId]);
    if (u.rowCount && u.rows[0].email) {
      const b = emittedBooking;
      emailService.send(u.rows[0].email, 'Reservation received - Château254', emailService.reservationEmail(b.customer_name, (b.id||'').slice(0,8), new Date(b.dining_time).toLocaleString('en-KE'), b.party_size));
    }
  }
  res.status(201).json({ booking: emittedBooking });
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

  const fullBooking = await query(`${bookingQuery} WHERE b.id = $1`, [req.params.id]);
  const emittedBooking = fullBooking.rows[0] || result.rows[0];

  const io = req.app.get('io');
  if (io) {
    io.to('admin').emit('booking:updated', { booking: emittedBooking });
  }

  res.json({ booking: emittedBooking });
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

  const fullBooking = await query(`${bookingQuery} WHERE b.id = $1`, [req.params.id]);
  const emittedBooking = fullBooking.rows[0] || result.rows[0];

  const io = req.app.get('io');
  if (io) {
    io.to('admin').emit('booking:updated', { booking: emittedBooking });
  }

  res.json({ booking: emittedBooking });
}));

module.exports = router;
