const express = require('express');
const asyncHandler = require('../middleware/async.middleware');
const { query } = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const result = await query('SELECT * FROM menu_items WHERE is_available = TRUE ORDER BY category, name');
  res.json({ items: result.rows });
}));

router.post('/', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { name, description, price, category, image_url } = req.body;
  if (!name || price === undefined || !category) return res.status(400).json({ error: 'Name, price, and category are required' });

  const result = await query(
    `INSERT INTO menu_items (name, description, price, category, image_url)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [name.trim(), description || '', price, category, image_url || null],
  );

  res.status(201).json({ item: result.rows[0] });
}));

router.patch('/:id', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { name, description, price, category, image_url, is_available } = req.body;
  const result = await query(
    `UPDATE menu_items SET
      name = COALESCE($1, name), description = COALESCE($2, description),
      price = COALESCE($3, price), category = COALESCE($4, category),
      image_url = COALESCE($5, image_url), is_available = COALESCE($6, is_available),
      updated_at = NOW() WHERE id = $7 RETURNING *`,
    [name, description, price, category, image_url, is_available, req.params.id],
  );
  if (!result.rowCount) return res.status(404).json({ error: 'Menu item not found' });
  res.json({ item: result.rows[0] });
}));

router.delete('/:id', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const result = await query('DELETE FROM menu_items WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rowCount) return res.status(404).json({ error: 'Menu item not found' });
  res.status(204).send();
}));

module.exports = router;
