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

/* Get today's scheduled promo video.
   Returns the promo video assigned to today's day-of-week within the current week.
   Only returns videos that are active, have is_promo=true on the feed_post,
   and fall within the declared week_start_date..week_start_date+6 days. */
router.get('/promo-video/today', asyncHandler(async (req, res) => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sunday .. 6=Saturday
  // Monday of current week
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const weekStart = monday.toISOString().slice(0, 10);

  const result = await query(
    `SELECT
       pv.id AS promo_video_id,
       pv.day_of_week,
       pv.display_order,
       pv.link_url,
       pv.link_text,
       fp.id AS feed_post_id,
       fp.title,
       fp.caption,
       fp.media_url,
       fp.media_type,
       fp.thumbnail_url,
       fp.author_name,
       fp.published_at
     FROM promo_videos pv
     JOIN feed_posts fp ON fp.id = pv.feed_post_id
     WHERE pv.is_active = TRUE
       AND fp.is_promo = TRUE
       AND fp.media_type = 'video'
       AND pv.week_start_date = $1
       AND pv.day_of_week = $2
     ORDER BY pv.display_order
     LIMIT 1`,
    [weekStart, dayOfWeek]
  );

  if (!result.rows.length) {
    return res.json({ promoVideo: null });
  }

  const video = result.rows[0];
  // Compute week_end_date for reference
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  res.json({
    promoVideo: {
      id: video.promo_video_id,
      feedPostId: video.feed_post_id,
      title: video.title,
      caption: video.caption,
      mediaUrl: video.media_url,
      mediaType: video.media_type,
      thumbnailUrl: video.thumbnail_url,
      authorName: video.author_name,
      publishedAt: video.published_at,
      linkUrl: video.link_url,
      linkText: video.link_text,
      dayOfWeek: video.day_of_week,
      displayOrder: video.display_order,
      weekStartDate: weekStart,
      weekEndDate: weekEnd.toISOString(),
    }
  });
}));

router.get('/promo-video/week', asyncHandler(async (req, res) => {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const weekStart = monday.toISOString().slice(0, 10);

  const result = await query(
    `SELECT
       pv.id AS promo_video_id,
       pv.day_of_week,
       pv.display_order,
       pv.link_url,
       pv.link_text,
       fp.id AS feed_post_id,
       fp.title,
       fp.caption,
       fp.media_url,
       fp.media_type,
       fp.thumbnail_url,
       fp.author_name,
       fp.published_at
     FROM promo_videos pv
     JOIN feed_posts fp ON fp.id = pv.feed_post_id
     WHERE pv.is_active = TRUE
       AND fp.is_promo = TRUE
       AND fp.media_type = 'video'
       AND pv.week_start_date = $1
     ORDER BY pv.day_of_week, pv.display_order`,
    [weekStart]
  );

  const videosByDay = {};
  for (const row of result.rows) {
    const day = row.day_of_week;
    if (!videosByDay[day]) videosByDay[day] = [];
    videosByDay[day].push({
      id: row.promo_video_id,
      feedPostId: row.feed_post_id,
      title: row.title,
      caption: row.caption,
      mediaUrl: row.media_url,
      mediaType: row.media_type,
      thumbnailUrl: row.thumbnail_url,
      authorName: row.author_name,
      publishedAt: row.published_at,
      linkUrl: row.link_url,
      linkText: row.link_text,
      displayOrder: row.display_order,
    });
  }

  res.json({ videosByDay, weekStartDate: weekStart });
}));

/* Create or update a promo video entry for a feed post.
   Body: { feed_post_id, day_of_week, week_start_date, display_order, link_url, link_text, is_active }
   If a promo_videos entry already exists for this feed_post_id, it will be updated. */
router.post('/promo-videos', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { feed_post_id, day_of_week, week_start_date, display_order, link_url, link_text, is_active } = req.body;
  
  if (!feed_post_id) return res.status(400).json({ error: 'feed_post_id is required' });
  if (day_of_week === undefined || day_of_week === null) return res.status(400).json({ error: 'day_of_week is required' });
  if (!week_start_date) return res.status(400).json({ error: 'week_start_date is required' });

  // Verify the feed post exists and is a video with is_promo=true
  const postCheck = await query(
    `SELECT id, media_type, is_promo FROM feed_posts WHERE id = $1`,
    [feed_post_id]
  );
  if (!postCheck.rowCount) return res.status(404).json({ error: 'Feed post not found' });
  if (postCheck.rows[0].media_type !== 'video') return res.status(400).json({ error: 'Only video posts can be promo videos' });
  if (!postCheck.rows[0].is_promo) return res.status(400).json({ error: 'Feed post must have is_promo=true' });

  const result = await query(
    `INSERT INTO promo_videos (feed_post_id, day_of_week, week_start_date, display_order, link_url, link_text, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (feed_post_id) DO UPDATE SET
       day_of_week = EXCLUDED.day_of_week,
       week_start_date = EXCLUDED.week_start_date,
       display_order = EXCLUDED.display_order,
       link_url = EXCLUDED.link_url,
       link_text = EXCLUDED.link_text,
       is_active = EXCLUDED.is_active,
       updated_at = NOW()
     RETURNING *`,
    [feed_post_id, day_of_week, week_start_date, display_order || 0, link_url || null, link_text || 'View Details', is_active !== false]
  );

  res.status(201).json({ promoVideo: result.rows[0] });
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
