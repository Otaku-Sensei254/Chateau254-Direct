const express = require('express');
const multer = require('multer');
const asyncHandler = require('../middleware/async.middleware');
const { query } = require('../config/db');
const { authenticate, requireRole, optionalAuthenticate } = require('../middleware/auth.middleware');
const {
  FEED_ALLOWED_MEDIA_TYPES,
  uploadFeedMedia,
  deleteStoredMedia,
} = require('../config/storage');

const router = express.Router();

const DEFAULT_AUTHOR = 'Château254 Team';
const MAX_TITLE_LENGTH = 180;

/* Like counts and the viewer's own like state are resolved in the same query so
   the feed renders with a single round trip. likedByMe compares against the
   viewer id, and is false for an anonymous visitor because NULL never matches.

   The viewer placeholder is a parameter rather than a hardcoded $1 because
   single-post lookups bind the post id first. pg rejects a query that is handed
   more parameters than it references, so the index has to be explicit. */
const feedColumns = (viewerParam = 1) => `
  p.id,
  p.title,
  p.caption,
  p.media_url AS "mediaUrl",
  p.media_type AS "mediaType",
  p.thumbnail_url AS "thumbnailUrl",
  p.author_name AS "authorName",
  p.is_published AS "isPublished",
  p.published_at AS "publishedAt",
  p.created_at AS "createdAt",
  (SELECT COUNT(*)::int FROM feed_likes fl WHERE fl.post_id = p.id) AS "likeCount",
  (SELECT COUNT(*)::int FROM feed_likes fl WHERE fl.post_id = p.id AND fl.user_id = $${viewerParam}) > 0 AS "likedByMe"
`;

const feedUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!FEED_ALLOWED_MEDIA_TYPES.has(file.mimetype)) {
      const error = new Error('Only JPEG, PNG, WebP, MP4, WebM, and MOV files are allowed');
      error.statusCode = 400;
      return callback(error);
    }
    return callback(null, true);
  },
});

/* A multipart body labelled application/json never reaches multer: the global
   JSON parser consumes it first and fails with a confusing token error. Reject it
   here with a message that names the actual problem. */
const requireMultipart = (req, res, next) => {
  const contentType = req.get('content-type') || '';
  if (!contentType.toLowerCase().startsWith('multipart/form-data')) {
    return res.status(415).json({
      error: 'Upload must be sent as multipart/form-data. When using fetch with FormData, do not set the Content-Type header yourself.',
    });
  }
  return next();
};

const handleFeedUpload = (req, res, next) => feedUpload.single('media')(req, res, (error) => {
  if (error) {
    if (error.code === 'LIMIT_FILE_SIZE') error.statusCode = 413;
    if (!error.statusCode) error.statusCode = 400;
    return next(error);
  }
  return next();
});

/* Created on boot so a fresh deployment works without a separate migration run.
   The likes table is created after feed_posts, and both are IF NOT EXISTS. */
const ensureFeedTable = () => query(`
  CREATE TABLE IF NOT EXISTS feed_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(180) NOT NULL DEFAULT '',
    caption TEXT NOT NULL DEFAULT '',
    media_url TEXT NOT NULL,
    media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('image', 'video')),
    thumbnail_url TEXT,
    author_name VARCHAR(120) NOT NULL DEFAULT '${DEFAULT_AUTHOR}',
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS feed_posts_published_idx ON feed_posts(is_published, published_at DESC);
  CREATE TABLE IF NOT EXISTS feed_likes (
    post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (post_id, user_id)
  );
  CREATE INDEX IF NOT EXISTS feed_likes_user_idx ON feed_likes(user_id, created_at DESC);
`);

router.get('/', optionalAuthenticate, asyncHandler(async (req, res) => {
  const includeAll = String(req.query.all).toLowerCase() === 'true';
  const viewerId = req.user?.id || null;

  // Without a viewer, likedByMe is computed against a NULL id and is always
  // false, which is the correct answer for an anonymous visitor.
  const result = await query(
    `SELECT ${feedColumns(1)}
     FROM feed_posts p
     ${includeAll && req.user?.roles?.includes('admin') ? '' : 'WHERE p.is_published = TRUE'}
     ORDER BY p.published_at DESC, p.created_at DESC
     LIMIT 200`,
    [viewerId],
  );

  return res.json({ posts: result.rows });
}));

router.post('/upload', authenticate, requireRole('admin'), requireMultipart, handleFeedUpload, asyncHandler(async (req, res) => {
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
    is_published: isPublished,
  } = req.body;

  if (!mediaUrl || !['image', 'video'].includes(mediaType)) {
    return res.status(400).json({ error: 'Media URL and a valid media type are required' });
  }

  const trimmedTitle = String(title || '').trim();
  const trimmedCaption = String(caption || '').trim();
  if (!trimmedTitle && !trimmedCaption) {
    return res.status(400).json({ error: 'A title or a description is required' });
  }
  if (trimmedTitle.length > MAX_TITLE_LENGTH) {
    return res.status(400).json({ error: `Title must be ${MAX_TITLE_LENGTH} characters or fewer` });
  }

  const result = await query(
    /* The explicit casts matter: pg sends a NULL parameter as an untyped value,
       and Postgres cannot infer a type for a bare $7 inside COALESCE. */
    `INSERT INTO feed_posts (title, caption, media_url, media_type, thumbnail_url, author_name, is_published, published_at)
     VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::boolean, TRUE), COALESCE($8::timestamptz, NOW()))
     RETURNING id`,
    [
      trimmedTitle,
      trimmedCaption,
      mediaUrl,
      mediaType,
      thumbnailUrl || null,
      String(authorName || '').trim() || DEFAULT_AUTHOR,
      isPublished === undefined || isPublished === null ? null : Boolean(isPublished),
      publishedAt || null,
    ],
  );

  const created = await query(
    `SELECT ${feedColumns(2)} FROM feed_posts p WHERE p.id = $1`,
    [result.rows[0].id, req.user?.id || null],
  );
  return res.status(201).json({ post: created.rows[0] });
}));

router.patch('/:id', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { title, caption, author_name: authorName, is_published: isPublished } = req.body;
  const updates = [];

  if (title !== undefined) {
    const trimmed = String(title).trim();
    if (trimmed.length > MAX_TITLE_LENGTH) {
      return res.status(400).json({ error: `Title must be ${MAX_TITLE_LENGTH} characters or fewer` });
    }
    updates.push(`title = $${updates.length + 1}`);
    req.body.title = trimmed;
  }
  if (caption !== undefined) {
    updates.push(`caption = $${updates.length + 1}`);
  }
  if (authorName !== undefined) {
    updates.push(`author_name = $${updates.length + 1}`);
  }
  if (isPublished !== undefined) {
    updates.push(`is_published = $${updates.length + 1}`);
    req.body.is_published = Boolean(isPublished);
  }

  if (!updates.length) return res.status(400).json({ error: 'No fields to update' });

  const values = [];
  for (const key of ['title', 'caption', 'author_name', 'is_published']) {
    if (req.body[key] !== undefined) values.push(req.body[key]);
  }

  const result = await query(
    `UPDATE feed_posts SET ${updates.join(', ')}, updated_at = NOW()
     WHERE id = $${updates.length + 1}
     RETURNING id`,
    [...values, req.params.id],
  );
  if (!result.rowCount) return res.status(404).json({ error: 'Feed post not found' });

  const updated = await query(
    `SELECT ${feedColumns(2)} FROM feed_posts p WHERE p.id = $1`,
    [req.params.id, req.user?.id || null],
  );
  return res.json({ post: updated.rows[0] });
}));

/* Likes belong to customer identities. Staff tokens are issued from the legacy
   chateau_users table, so their id is not present in users; without this guard
   the insert would fail the foreign key and surface as a 500. */
const resolveCustomer = async (req, res) => {
  const result = await query('SELECT 1 FROM users WHERE id = $1', [req.user.id]);
  if (!result.rowCount) {
    res.status(403).json({ error: 'Only customer accounts can like feed posts' });
    return null;
  }
  return req.user.id;
};

router.post('/:id/like', authenticate, asyncHandler(async (req, res) => {
  const userId = await resolveCustomer(req, res);
  if (!userId) return undefined;

  // Checked before the insert: feed_likes has a foreign key to feed_posts, so
  // inserting first would raise a constraint error and surface as a 500.
  const exists = await query('SELECT 1 FROM feed_posts WHERE id = $1', [req.params.id]);
  if (!exists.rowCount) return res.status(404).json({ error: 'Feed post not found' });

  const result = await query(
    `INSERT INTO feed_likes (post_id, user_id) VALUES ($1, $2)
     ON CONFLICT (post_id, user_id) DO NOTHING
     RETURNING post_id`,
    [req.params.id, userId],
  );

  const counts = await query('SELECT COUNT(*)::int AS "likeCount" FROM feed_likes WHERE post_id = $1', [req.params.id]);
  // 201 when a new like was recorded, 200 when it already existed, so a double
  // tap is not reported as a new like.
  return res.status(result.rowCount ? 201 : 200).json({ liked: true, likeCount: counts.rows[0].likeCount });
}));

router.delete('/:id/like', authenticate, asyncHandler(async (req, res) => {
  const userId = await resolveCustomer(req, res);
  if (!userId) return undefined;

  await query('DELETE FROM feed_likes WHERE post_id = $1 AND user_id = $2', [req.params.id, userId]);

  const counts = await query('SELECT COUNT(*)::int AS "likeCount" FROM feed_likes WHERE post_id = $1', [req.params.id]);
  return res.json({ liked: false, likeCount: counts.rows[0].likeCount });
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
