-- Promo videos table for scheduled video ads on home/menu pages
-- Each video is assigned a specific day of the week (0=Sunday .. 6=Saturday)
-- within a declared week. Videos play sequentially: day 0 video on day 0,
-- day 1 video on day 1, etc. No video repeats within the same week.
-- A promo video is a feed post flagged as a promo (is_promo=true) that
-- gets special display on home and menu pages AFTER the regular ad is dismissed.

BEGIN;

CREATE TABLE IF NOT EXISTS promo_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  -- Which day of the week this video plays (0=Sunday .. 6=Saturday)
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  -- The week this schedule applies to (Monday of the week)
  week_start_date DATE NOT NULL,
  -- Display order if multiple videos on same day (lower = first)
  display_order SMALLINT NOT NULL DEFAULT 0,
  -- Optional CTA link
  link_url TEXT,
  link_text VARCHAR(60) DEFAULT 'View Details',
  -- Whether this promo is active
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (feed_post_id)
);

CREATE INDEX IF NOT EXISTS promo_videos_schedule_idx
  ON promo_videos (week_start_date, day_of_week, display_order)
  WHERE is_active = TRUE;

-- Add is_promo flag to feed_posts to mark posts that are promo videos
ALTER TABLE feed_posts
  ADD COLUMN IF NOT EXISTS is_promo BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS feed_posts_is_promo_idx
  ON feed_posts (is_promo, published_at DESC)
  WHERE is_promo = TRUE;

COMMIT;