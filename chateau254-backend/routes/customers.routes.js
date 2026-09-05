const express = require('express');
const asyncHandler = require('../middleware/async.middleware');
const { query } = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const result = await query("SELECT u.id, u.full_name, u.email, u.loyalty_points, u.created_at FROM chateau_users u JOIN user_roles ur ON ur.user_id = u.id JOIN roles r ON r.id = ur.role_id WHERE r.name = 'customer' ORDER BY u.created_at DESC");
  res.json({ customers: result.rows });
}));

router.patch('/:id/points', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const points = Number(req.body.points);
  if (!Number.isInteger(points) || points === 0) return res.status(400).json({ error: 'Points must be a non-zero integer' });

  const result = await query("UPDATE chateau_users SET loyalty_points = GREATEST(0, loyalty_points + $1) WHERE id = $2 AND EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = chateau_users.id AND r.name = 'customer') RETURNING id, full_name, email, loyalty_points", [points, req.params.id]);
  if (!result.rowCount) return res.status(404).json({ error: 'Customer not found' });
  res.json({ customer: result.rows[0] });
}));

module.exports = router;
