const express = require('express');
const asyncHandler = require('../middleware/async.middleware');
const { query } = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

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

router.patch('/:id/status', authenticate, requireRole('admin', 'rider'), asyncHandler(async (req, res) => {
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
