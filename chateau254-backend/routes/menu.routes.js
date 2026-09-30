const express = require('express');
const multer = require('multer');
const asyncHandler = require('../middleware/async.middleware');
const { query } = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const env = require('../config/env');
const { ALLOWED_IMAGE_TYPES, uploadMenuImage, deleteMenuImage } = require('../config/storage');

const router = express.Router();

const MENU_TABLES = {
  wine: 'wines',
  dine_in: 'dine_in_menu',
  takeout: 'takeout_menu',
};

const resolveTable = (menuType) => {
  const key = (menuType || '').toLowerCase();
  if (key === 'dine_in' || key === 'dine-in') return MENU_TABLES.dine_in;
  if (key === 'takeout' || key === 'take-out') return MENU_TABLES.takeout;
  return MENU_TABLES.wine;
};

const WINE_COLUMNS = `id, name, description, price, category, subcategory, image_url AS "image", is_available AS "availability", on_offer, offer, wine_type AS "wineType", region, grape, tasting_notes AS "tastingNotes", order_index, 'wine' AS "menuType"`;
const FOOD_COLUMNS = `id, name, description, price, category, subcategory, image_url AS "image", is_available AS "availability", on_offer, offer, order_index, NULL AS "wineType", NULL AS region, NULL AS grape, NULL AS "tastingNotes"`;

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

const handleImageUpload = (req, res, next) => imageUpload.single('image')(req, res, (error) => {
  if (error) {
    if (error.code === 'LIMIT_FILE_SIZE') error.statusCode = 413;
    if (!error.statusCode) error.statusCode = 400;
    return next(error);
  }
  return next();
});

router.post('/upload', authenticate, requireRole('admin'), handleImageUpload, asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'An image file is required' });

  const uploaded = await uploadMenuImage(req.file);
  return res.status(201).json(uploaded);
}));

router.get('/', asyncHandler(async (req, res) => {
  const showAll = req.query.all === 'true';
  const search = (req.query.search || '').trim();
  const categoryFilter = (req.query.category || '').trim();
  const subcategoryFilter = (req.query.subcategory || '').trim();
  const menuTypeFilter = (req.query.menu_type || '').toLowerCase();

  const where = [];
  const params = [];
  let idx = 1;

  if (!showAll) {
    where.push(`is_available = TRUE`);
  }
  if (search) {
    where.push(`(name ILIKE $${idx} OR description ILIKE $${idx} OR COALESCE(subcategory, '') ILIKE $${idx})`);
    params.push(`%${search}%`);
    idx++;
  }
  if (categoryFilter) {
    where.push(`category = $${idx}`);
    params.push(categoryFilter);
    idx++;
  }
  if (subcategoryFilter) {
    where.push(`subcategory = $${idx}`);
    params.push(subcategoryFilter);
    idx++;
  }

  const whereClause = where.length ? ` WHERE ${where.join(' AND ')}` : '';

  const wines = menuTypeFilter && menuTypeFilter !== 'wine' ? [] : await query(`SELECT ${WINE_COLUMNS} FROM wines${whereClause} ORDER BY order_index, name`, params);
  const dineIn = menuTypeFilter && menuTypeFilter !== 'dine_in' && menuTypeFilter !== 'dine-in' ? [] : await query(`SELECT ${FOOD_COLUMNS}, 'dine_in' AS "menuType" FROM dine_in_menu${whereClause} ORDER BY order_index, name`, params);
  const takeout = menuTypeFilter && menuTypeFilter !== 'takeout' && menuTypeFilter !== 'take-out' ? [] : await query(`SELECT ${FOOD_COLUMNS}, 'takeout' AS "menuType" FROM takeout_menu${whereClause} ORDER BY order_index, name`, params);

  res.json({ items: [...wines.rows, ...dineIn.rows, ...takeout.rows] });
}));

router.post('/', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { name, description, price, category, subcategory, image_url, on_offer, offer, menu_type } = req.body;
  if (!name || price === undefined || !category) return res.status(400).json({ error: 'Name, price, and category are required' });

  const table = resolveTable(menu_type);
  const result = await query(
    `INSERT INTO ${table} (name, description, price, category, subcategory, image_url, on_offer, offer, order_index)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE((SELECT MAX(order_index) FROM ${table}), -1) + 1)
     RETURNING *`,
    [name.trim(), description || '', price, category, subcategory || null, image_url || null, Boolean(on_offer), offer || null],
  );

  const menuTypeResult = menu_type === 'dine_in' || menu_type === 'dine-in' ? 'dine_in' : menu_type === 'takeout' || menu_type === 'take-out' ? 'takeout' : 'wine';
  res.status(201).json({ item: { ...result.rows[0], menuType: menuTypeResult } });
}));

router.patch('/:id', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { name, description, price, category, subcategory, image_url, is_available, on_offer, offer, menu_type } = req.body;
  const table = resolveTable(menu_type);
  const existing = await query(`SELECT image_url FROM ${table} WHERE id = $1`, [req.params.id]);
  if (!existing.rowCount) return res.status(404).json({ error: 'Menu item not found' });

  const shouldReplaceImage = image_url !== undefined && image_url !== existing.rows[0].image_url;
  const result = await query(
    `UPDATE ${table} SET
      name = COALESCE($1, name), description = COALESCE($2, description),
      price = COALESCE($3, price), category = COALESCE($4, category),
      subcategory = COALESCE($5, subcategory),
      image_url = COALESCE($6, image_url), is_available = COALESCE($7, is_available),
      on_offer = COALESCE($8, on_offer), offer = COALESCE($9, offer),
      updated_at = NOW() WHERE id = $10 RETURNING *`,
    [name, description, price, category, subcategory, image_url, is_available, on_offer, offer, req.params.id],
  );
  if (!result.rowCount) return res.status(404).json({ error: 'Menu item not found' });

  if (shouldReplaceImage && existing.rows[0].image_url) {
    await deleteMenuImage(existing.rows[0].image_url).catch((error) => {
      console.warn('[R2] Failed to delete replaced menu image:', error.message);
    });
  }

  res.json({ item: result.rows[0] });
}));

router.delete('/:id', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const menuType = (req.query.menu_type || req.body.menu_type || '').toLowerCase();
  const table = resolveTable(menuType);
  const result = await query(`DELETE FROM ${table} WHERE id = $1 RETURNING id, image_url`, [req.params.id]);
  if (!result.rowCount) return res.status(404).json({ error: 'Menu item not found' });
  if (result.rows[0].image_url) {
    await deleteMenuImage(result.rows[0].image_url).catch((error) => {
      console.warn('[R2] Failed to delete menu image:', error.message);
    });
  }
  res.status(204).send();
}));

module.exports = router;
