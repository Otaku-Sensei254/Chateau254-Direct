const express = require('express');
const multer = require('multer');
const asyncHandler = require('../middleware/async.middleware');
const { query } = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const env = require('../config/env');
const { ALLOWED_IMAGE_TYPES, uploadPromotionImage } = require('../config/storage');

const router = express.Router();

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.r2MaxFileSize, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      const error = new Error('Only JPEG, PNG, and WebP images are allowed');
      error.statusCode = 400;
      return callback(error);
    }
    return callback(null, true);
  },
});

router.post('/upload', authenticate, requireRole('admin'), imageUpload.single('image'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'An image file is required' });

  const uploaded = await uploadPromotionImage(req.file);
  return res.status(201).json(uploaded);
}));

router.get('/', asyncHandler(async (req, res) => {
  const includeAll = String(req.query.all).toLowerCase() === 'true';
  let result;
  if (includeAll) {
    result = await query(
      `SELECT * FROM promotions
       ORDER BY priority DESC, created_at DESC
       LIMIT 100`,
    );
  } else {
    const now = new Date().toISOString();
    result = await query(
      `SELECT * FROM promotions
       WHERE is_active = TRUE
         AND (starts_at IS NULL OR starts_at <= $1)
         AND (ends_at IS NULL OR ends_at >= $1)
       ORDER BY priority DESC, created_at DESC
       LIMIT 10`,
      [now],
    );
  }
  res.json({ promotions: result.rows });
}));

router.post('/', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { title, message, image_url, link_url, is_active, priority, starts_at, ends_at } = req.body;
  if (!message) return res.status(400).json({ error: 'Promotion message is required' });
  if (typeof image_url === 'string' && image_url.startsWith('data:')) {
    return res.status(400).json({ error: 'Image must be uploaded via /api/promotions/upload' });
  }

  const result = await query(
    `INSERT INTO promotions (title, message, image_url, link_url, is_active, priority, starts_at, ends_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [title || '', message, image_url || null, link_url || null, is_active !== false, Number(priority || 0), starts_at || null, ends_at || null],
  );
  res.status(201).json({ promotion: result.rows[0] });
}));

router.patch('/:id', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { title, message, image_url, link_url, is_active, priority, starts_at, ends_at } = req.body;
  if (typeof image_url === 'string' && image_url.startsWith('data:')) {
    return res.status(400).json({ error: 'Image must be uploaded via /api/promotions/upload' });
  }

  const result = await query(
    `UPDATE promotions SET
      title = COALESCE($1, title),
      message = COALESCE($2, message),
      image_url = COALESCE($3, image_url),
      link_url = COALESCE($4, link_url),
      is_active = COALESCE($5, is_active),
      priority = COALESCE($6, priority),
      starts_at = COALESCE($7, starts_at),
      ends_at = COALESCE($8, ends_at),
      updated_at = NOW()
     WHERE id = $9 RETURNING *`,
    [title, message, image_url, link_url, is_active, priority, starts_at, ends_at, req.params.id],
  );
  if (!result.rowCount) return res.status(404).json({ error: 'Promotion not found' });
  res.json({ promotion: result.rows[0] });
}));

router.delete('/:id', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const result = await query('DELETE FROM promotions WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rowCount) return res.status(404).json({ error: 'Promotion not found' });
  res.status(204).send();
}));

module.exports = router;
