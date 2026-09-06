const express = require('express');
const asyncHandler = require('../middleware/async.middleware');
const { query } = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

const getRiderId = async (userId) => {
  const result = await query('SELECT id FROM riders WHERE user_id = $1', [userId]);
  if (!result.rowCount) return null;
  return result.rows[0].id;
};

router.get('/me', authenticate, requireRole('rider'), asyncHandler(async (req, res) => {
  const result = await query(
    'SELECT r.id, r.full_name, r.phone, r.status FROM riders r WHERE r.user_id = $1',
    [req.user.id],
  );
  if (!result.rowCount) return res.status(404).json({ error: 'Rider profile not found' });
  res.json({ rider: result.rows[0] });
}));

router.get('/me/orders', authenticate, requireRole('rider'), asyncHandler(async (req, res) => {
  const riderId = await getRiderId(req.user.id);
  if (!riderId) return res.status(404).json({ error: 'Rider profile not found' });

  const result = await query(
    `SELECT o.*, u.full_name AS customer_name, u.email AS customer_email, u.phone AS customer_phone
     FROM orders o
     JOIN users u ON u.id = o.user_id
     WHERE o.rider_id = $1 AND o.status IN ('preparing', 'out_for_delivery')
     ORDER BY o.created_at DESC`,
    [riderId],
  );
  res.json({ orders: result.rows });
}));

router.get('/me/orders/completed', authenticate, requireRole('rider'), asyncHandler(async (req, res) => {
  const riderId = await getRiderId(req.user.id);
  if (!riderId) return res.status(404).json({ error: 'Rider profile not found' });

  const result = await query(
    `SELECT o.*, u.full_name AS customer_name
     FROM orders o
     JOIN users u ON u.id = o.user_id
     WHERE o.rider_id = $1 AND o.status = 'completed'
     ORDER BY o.updated_at DESC
     LIMIT 20`,
    [riderId],
  );
  res.json({ orders: result.rows });
}));

router.patch('/me/orders/:orderId/status', authenticate, requireRole('rider'), asyncHandler(async (req, res) => {
  const { status } = req.body;
  const allowedStatuses = ['out_for_delivery', 'completed'];
  if (!allowedStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const riderId = await getRiderId(req.user.id);
  if (!riderId) return res.status(404).json({ error: 'Rider profile not found' });

  const result = await query(
    `UPDATE orders SET status = $1, updated_at = NOW()
     WHERE id = $2 AND rider_id = $3 RETURNING *`,
    [status, req.params.orderId, riderId],
  );
  if (!result.rowCount) return res.status(404).json({ error: 'Order not found or not assigned to you' });
  res.json({ order: result.rows[0] });
}));

router.patch('/me/status', authenticate, requireRole('rider'), asyncHandler(async (req, res) => {
  const { status } = req.body;
  const allowedStatuses = ['online', 'offline', 'on_break'];
  if (!allowedStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const result = await query(
    'UPDATE riders SET status = $1 WHERE user_id = $2 RETURNING id, full_name, phone, status',
    [status, req.user.id],
  );
  if (!result.rowCount) return res.status(404).json({ error: 'Rider not found' });

  if (status === 'offline') {
    const riderId = await getRiderId(req.user.id);
    if (riderId) {
      await query('DELETE FROM rider_locations WHERE rider_id = $1', [riderId]).catch(() => {});
    }
  }

  res.json({ rider: result.rows[0] });
}));

router.patch('/me/location', authenticate, requireRole('rider'), asyncHandler(async (req, res) => {
  const { latitude, longitude } = req.body;
  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'Latitude and longitude are required' });
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return res.status(400).json({ error: 'Invalid coordinates' });
  }

  const riderId = await getRiderId(req.user.id);
  if (!riderId) return res.status(404).json({ error: 'Rider profile not found' });

  await query(
    `INSERT INTO rider_locations (rider_id, latitude, longitude, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (rider_id) DO UPDATE SET latitude = $2, longitude = $3, updated_at = NOW()`,
    [riderId, latitude, longitude],
  );

  const io = req.app.get('io');
  if (io) {
    io.to('admin').emit('rider:location_updated', { riderId, latitude, longitude });
    io.to(`rider:${riderId}`).emit('rider:location_updated', { riderId, latitude, longitude });
  }

  res.json({ success: true });
}));

router.get('/locations', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT rl.rider_id, rl.latitude, rl.longitude, rl.updated_at,
            r.full_name, r.phone, r.status
     FROM rider_locations rl
     JOIN riders r ON r.id = rl.rider_id
     WHERE r.status = 'online'`,
  );
  res.json({ locations: result.rows });
}));

router.get('/', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const result = await query(`SELECT r.id, r.user_id, r.full_name, r.phone, r.status, r.created_at
    FROM riders r JOIN chateau_users u ON u.id = r.user_id ORDER BY r.full_name`);
  res.json({ riders: result.rows });
}));

router.post('/', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'Rider name and phone are required' });
  const result = await query('INSERT INTO riders (full_name, phone) VALUES ($1, $2) RETURNING id, full_name, phone, status, created_at', [name.trim(), phone.trim()]);
  res.status(201).json({ rider: result.rows[0] });
}));

router.patch('/:id/status', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const allowedStatuses = ['online', 'offline', 'on_break'];
  if (!allowedStatuses.includes(req.body.status)) return res.status(400).json({ error: 'Invalid rider status' });
  const result = await query('UPDATE riders SET status = $1 WHERE id = $2 RETURNING id, full_name, phone, status', [req.body.status, req.params.id]);
  if (!result.rowCount) return res.status(404).json({ error: 'Rider not found' });
  res.json({ rider: result.rows[0] });
}));

router.delete('/:id', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const result = await query('DELETE FROM riders WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rowCount) return res.status(404).json({ error: 'Rider not found' });
  res.status(204).send();
}));

module.exports = router;
