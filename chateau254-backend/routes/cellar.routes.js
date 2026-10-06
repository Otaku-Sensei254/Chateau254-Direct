const express = require('express');
const asyncHandler = require('../middleware/async.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const db = require('../config/db');

const router = express.Router();

/* Cellar bottles are wines joined against the user's saved rows. The bottle
   shape matches what the cellar page rendered from localStorage so the page
   keeps its current markup. */
const BOTTLE_SELECT = `
  SELECT cw.wine_id AS id, cw.added_at AS "addedOn",
         w.name, w.grape AS subname, w.color, w.region,
         '' AS vintage, w.image_url AS image,
         w.price, w.avg_rating AS "avgRating", w.rating_votes AS "ratingVotes"
  FROM cellar_wines cw
  JOIN wines w ON w.id = cw.wine_id`;

const findWine = (wineId) => db.query('SELECT id FROM wines WHERE id = $1', [wineId]);

/* GET /api/cellar — the signed-in user's bottles, newest first. */
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const result = await db.query(
    `${BOTTLE_SELECT} WHERE cw.user_id = $1 ORDER BY cw.added_at DESC`,
    [req.user.id]
  );
  res.json({ bottles: result.rows });
}));

/* GET /api/cellar/ratings — every rating this user has given, keyed by wine. */
router.get('/ratings', authenticate, asyncHandler(async (req, res) => {
  const result = await db.query(
    'SELECT wine_id AS "wineId", rating, updated_at AS "updatedAt" FROM wine_ratings WHERE user_id = $1',
    [req.user.id]
  );
  const ratings = {};
  result.rows.forEach((row) => { ratings[row.wineId] = { score: row.rating, updatedAt: row.updatedAt }; });
  res.json({ ratings });
}));

/* GET /api/cellar/top-rated — ranking for the "most rated" merchandising slot.
   Votes lead so a wine with 4.8 from 2 people never outranks 4.6 from 40. */
router.get('/top-rated', authenticate, asyncHandler(async (req, res) => {
  const result = await db.query(
    `SELECT id, name, image_url AS "image", price, avg_rating AS "avgRating", rating_votes AS "ratingVotes"
     FROM wines
     WHERE rating_votes > 0
     ORDER BY avg_rating DESC, rating_votes DESC, name
     LIMIT 12`
  );
  res.json({ wines: result.rows });
}));

/* POST /api/cellar { wine_id } — idempotent add. */
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const { wine_id: wineId } = req.body || {};
  if (!wineId) return res.status(400).json({ error: 'wine_id is required' });
  const wine = await findWine(wineId);
  if (!wine.rowCount) return res.status(404).json({ error: 'Wine not found' });

  const inserted = await db.query(
    `INSERT INTO cellar_wines (user_id, wine_id) VALUES ($1, $2)
     ON CONFLICT (user_id, wine_id) DO NOTHING
     RETURNING wine_id`,
    [req.user.id, wineId]
  );
  res.status(inserted.rowCount ? 201 : 200).json({ added: Boolean(inserted.rowCount) });
}));

/* POST /api/cellar/import { wine_ids } — one-time move of bottles that older
   builds saved in this browser's localStorage. */
router.post('/import', authenticate, asyncHandler(async (req, res) => {
  const ids = Array.isArray(req.body?.wine_ids) ? req.body.wine_ids : [];
  const valid = ids.filter((id) => typeof id === 'string' && id);
  if (!valid.length) return res.json({ imported: 0 });

  const result = await db.query(
    `INSERT INTO cellar_wines (user_id, wine_id)
     SELECT $1, w.id FROM wines w WHERE w.id = ANY($2::uuid[])
     ON CONFLICT (user_id, wine_id) DO NOTHING`,
    [req.user.id, valid]
  );
  res.json({ imported: result.rowCount });
}));

/* POST /api/cellar/ratings { wine_id, score } — upsert the user's rating and
   roll it up onto wines.avg_rating / wines.rating_votes. */
router.post('/ratings', authenticate, asyncHandler(async (req, res) => {
  const { wine_id: wineId, score } = req.body || {};
  const value = Number(score);
  if (!wineId || !Number.isInteger(value) || value < 1 || value > 5) {
    return res.status(400).json({ error: 'A whole-number rating from 1 to 5 is required' });
  }
  const wine = await findWine(wineId);
  if (!wine.rowCount) return res.status(404).json({ error: 'Wine not found' });

  await db.query(
    `INSERT INTO wine_ratings (user_id, wine_id, rating) VALUES ($1, $2, $3)
     ON CONFLICT (user_id, wine_id) DO UPDATE SET rating = EXCLUDED.rating, updated_at = NOW()`,
    [req.user.id, wineId, value]
  );

  const aggregate = await db.query(
    `UPDATE wines SET
       avg_rating = COALESCE((SELECT ROUND(AVG(rating), 2) FROM wine_ratings WHERE wine_id = $1), 0),
       rating_votes = (SELECT COUNT(*) FROM wine_ratings WHERE wine_id = $1)
     WHERE id = $1
     RETURNING avg_rating AS "avgRating", rating_votes AS "ratingVotes"`,
    [wineId]
  );

  res.json({ score: value, ...aggregate.rows[0] });
}));

/* DELETE /api/cellar/:wineId — remove a bottle from the cellar. */
router.delete('/:wineId', authenticate, asyncHandler(async (req, res) => {
  const result = await db.query(
    'DELETE FROM cellar_wines WHERE user_id = $1 AND wine_id = $2',
    [req.user.id, req.params.wineId]
  );
  res.json({ removed: Boolean(result.rowCount) });
}));

module.exports = router;
