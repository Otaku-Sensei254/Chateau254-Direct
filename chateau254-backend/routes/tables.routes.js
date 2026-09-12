const express = require('express');
const asyncHandler = require('../middleware/async.middleware');
const { query } = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const result = await query(
    'SELECT id, table_number, capacity, status, created_at, updated_at FROM tables ORDER BY table_number',
  );
  res.json({ tables: result.rows });
}));

router.post('/', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { table_number, capacity } = req.body;
  if (!table_number || !capacity) return res.status(400).json({ error: 'Table number and capacity are required' });

  const existing = await query('SELECT id FROM tables WHERE table_number = $1', [table_number]);
  if (existing.rowCount) return res.status(400).json({ error: 'A table with that number already exists' });

  const result = await query(
    'INSERT INTO tables (table_number, capacity) VALUES ($1, $2) RETURNING *',
    [table_number, capacity],
  );
  res.status(201).json({ table: result.rows[0] });
}));

router.patch('/:id', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { table_number, capacity } = req.body;

  if (table_number) {
    const existing = await query('SELECT id FROM tables WHERE table_number = $1 AND id != $2', [table_number, req.params.id]);
    if (existing.rowCount) return res.status(400).json({ error: 'A table with that number already exists' });
  }

  const result = await query(
    `UPDATE tables SET
      table_number = COALESCE($1, table_number),
      capacity = COALESCE($2, capacity),
      updated_at = NOW()
     WHERE id = $3 RETURNING *`,
    [table_number, capacity, req.params.id],
  );
  if (!result.rowCount) return res.status(404).json({ error: 'Table not found' });
  res.json({ table: result.rows[0] });
}));

router.patch('/:id/status', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { status } = req.body;
  const allowedStatuses = ['available', 'reserved', 'occupied'];
  if (!allowedStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const result = await query(
    'UPDATE tables SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [status, req.params.id],
  );
  if (!result.rowCount) return res.status(404).json({ error: 'Table not found' });
  res.json({ table: result.rows[0] });
}));

router.delete('/:id', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const result = await query('DELETE FROM tables WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rowCount) return res.status(404).json({ error: 'Table not found' });
  res.status(204).send();
}));

module.exports = router;
