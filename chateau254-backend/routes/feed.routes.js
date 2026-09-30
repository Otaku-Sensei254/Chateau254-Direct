const express = require('express');
const multer = require('multer');
const asyncHandler = require('../middleware/async.middleware');
const { query } = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const {
  FEED_ALLOWED_MEDIA_TYPES,
  uploadFeedMedia,
  deleteStoredMedia,
} = require('../config/storage');

const router = express.Router();

const FEED_COLUMNS = `
  id,
  title,
  caption,
  media_url AS "mediaUrl",
  media_type AS "mediaType",
  thumbnail_url AS "thumbnailUrl",
  author_name AS "authorName",
  published_at AS "publishedAt",
  created_at AS "createdAt"
`;

const feedUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!FEED_ALLOWED_MEDIA_TYPES.has(file.mimetype)) {
      const error = new Error('Only JPEG, PNG, WebP, MP4, WebM, and MOV files are allowed');
      error.statusCode = 400;
      return callback(error);
    }
    return callback(null, true);
  },
});

const handleFeedUpload = (req, res, next) => feedUpload.single('media')(req, res, (error) => {
  if (error) {
    if (error.code === 'LIMIT_FILE_SIZE') error.statusCode = 413;
    if (!error.statusCode) error.statusCode = 400;
    return next(error);
  }
  return next();
});

const ensureFeedTable = () => query(`
  CREATE TABLE IF NOT EXISTS feed_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(180) NOT NULL DEFAULT '',
    caption TEXT NOT NULL DEFAULT '',
    media_url TEXT NOT NULL,
    media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('image', 'video')),
    thumbnail_url TEXT,
    author_name VARCHAR(120) NOT NULL DEFAULT 'Château254 Team',
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS feed_posts_published_idx ON feed_posts(is_published, published_at DESC);
`);

router.get('/', asyncHandler(async (req, res) => {
  const result = await query(`SELECT ${FEED_COLUMNS} FROM feed_posts WHERE is_published = TRUE ORDER BY published_at DESC, created_at DESC`);
  res.json({ posts: result.rows });
}));

router.post('/upload', authenticate, requireRole('admin'), handleFeedUpload, asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'A media file is required' });

  const uploaded = await uploadFeedMedia(req.file);
  return res.status(201).json(uploaded);
}));

router.post('/', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const {
    title,
    caption,
    media_url: mediaUrl,
    media_type: mediaType,
    thumbnail_url: thumbnailUrl,
    author_name: authorName,
    published_at: publishedAt,
  } = req.body;

  if (!mediaUrl || !['image', 'video'].includes(mediaType)) {
    return res.status(400).json({ error: 'Media URL and a valid media type are required' });
  }

  const result = await query(
    `INSERT INTO feed_posts (title, caption, media_url, media_type, thumbnail_url, author_name, published_at)
     VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, NOW()))
     RETURNING ${FEED_COLUMNS}`,
    [title || '', caption || '', mediaUrl, mediaType, thumbnailUrl || null, authorName || 'Château254 Team', publishedAt || null],
  );

  return res.status(201).json({ post: result.rows[0] });
}));

router.delete('/:id', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const result = await query('DELETE FROM feed_posts WHERE id = $1 RETURNING media_url', [req.params.id]);
  if (!result.rowCount) return res.status(404).json({ error: 'Feed post not found' });

  await deleteStoredMedia(result.rows[0].media_url).catch((error) => {
    console.warn('[R2] Failed to delete feed media:', error.message);
  });
  return res.status(204).send();
}));

module.exports = router;
module.exports.ensureFeedTable = ensureFeedTable;
