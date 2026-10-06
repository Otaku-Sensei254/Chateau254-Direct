-- Server-side wine cellar + user ratings (local first; run against Neon too).
-- Ratings are stored per (user, wine) and rolled up onto wines so the
-- "most rated" ranking can be served without scanning the ratings table.

CREATE TABLE IF NOT EXISTS cellar_wines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wine_id UUID NOT NULL REFERENCES wines(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, wine_id)
);

CREATE TABLE IF NOT EXISTS wine_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wine_id UUID NOT NULL REFERENCES wines(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, wine_id)
);

CREATE INDEX IF NOT EXISTS idx_cellar_wines_user ON cellar_wines (user_id);
CREATE INDEX IF NOT EXISTS idx_wine_ratings_wine ON wine_ratings (wine_id);

ALTER TABLE wines ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(3,2) NOT NULL DEFAULT 0;
ALTER TABLE wines ADD COLUMN IF NOT EXISTS rating_votes INTEGER NOT NULL DEFAULT 0;
