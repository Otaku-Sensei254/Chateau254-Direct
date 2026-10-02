-- Feed likes for the public media feed.
--
-- feed_posts already exists (see database/schema.sql) and holds the team's
-- social posts: a title, a description caption, and an R2-hosted image or video.
-- This adds the per-user like relationship on top of it.
--
-- Verified before running (local PostgreSQL only):
--   * feed_posts exists with 0 rows.
--   * users is the table that orders/bookings reference, so authenticated
--     customers can be keyed off it without touching the legacy chateau_users.
--
-- Safety properties:
--   * CREATE TABLE IF NOT EXISTS plus ON CONFLICT DO NOTHING, so it is safe to
--     re-run and safe to apply to Neon later.
--   * No existing rows are modified; this is purely additive.
--   * Deleting a post removes its likes via ON DELETE CASCADE.
--   * Deleting a user removes their likes via ON DELETE CASCADE.

BEGIN;

CREATE TABLE IF NOT EXISTS feed_likes (
  post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

-- Counting likes per post is the hot path for GET /api/feed.
CREATE INDEX IF NOT EXISTS feed_likes_user_idx ON feed_likes(user_id, created_at DESC);

COMMIT;
