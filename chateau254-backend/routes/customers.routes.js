const express = require('express');
const asyncHandler = require('../middleware/async.middleware');
const { query } = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const result = await query('SELECT id, full_name, email, phone, loyalty_points, created_at FROM users ORDER BY created_at DESC');
  res.json({ customers: result.rows });
}));

router.patch('/:id/points', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const points = Number(req.body.points);
  if (!Number.isInteger(points) || points === 0) return res.status(400).json({ error: 'Points must be a non-zero integer' });

  const result = await query(
    'UPDATE users SET loyalty_points = GREATEST(0, loyalty_points + $1) WHERE id = $2 RETURNING id, full_name, email, loyalty_points',
    [points, req.params.id],
  );
  if (!result.rowCount) return res.status(404).json({ error: 'Customer not found' });
  res.json({ customer: result.rows[0] });
}));

module.exports = router;
