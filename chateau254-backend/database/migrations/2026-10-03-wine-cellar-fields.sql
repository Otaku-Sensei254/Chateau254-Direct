-- Cellar catalogue fields for the public Wine Cellar page.
--
-- The /wines page previously rendered three hardcoded JSON files bundled into
-- the frontend, so image edits made through the admin menu never reached it.
-- This adds the columns that page needs so it can read from `wines` instead,
-- keeping the existing catalogue design intact.
--
-- Existing `wines` columns are deliberately NOT renamed or dropped. The cellar
-- fields are added alongside the operational ones:
--   * description   already holds the JSON `backstory` (verified identical for
--                   all 109 rows), so no new column is needed for it.
--   * grape, region already match the cellar usage.
--   * image_url, price, is_available, on_offer, offer are admin-managed and
--                   must not be overwritten by this migration.
--
-- Verified before running against Neon:
--   * wines has 109 rows, all matching a JSON cellar entry by normalised name.
--   * 3 further JSON wines (Salsedine, Mistral Rigoloccio, Borgofulvia Spumante
--     Brut) exist only in JSON and are inserted by the companion script.
--   * rating.score is sometimes a number and sometimes the string "Not rated",
--     so the rating columns are text rather than numeric.
--   * price_range_kes.min is "Not available" for unpriced bottles, so the
--     price range columns are nullable. `price` is left as the single
--     sellable figure used by ordering.
--
-- Safety properties:
--   * Every statement is ADD COLUMN IF NOT EXISTS, so it is safe to re-run.
--   * Purely additive: no DROP, no DELETE, no TRUNCATE, no data rewrite.
--   * New columns are nullable with no default, so existing rows stay valid.

BEGIN;

-- Producer identity. `region` holds a finer-grained appellation
-- ("Veneto, Italy, Italy"), so the producer needs columns of its own.
ALTER TABLE wines ADD COLUMN IF NOT EXISTS producer          VARCHAR;
ALTER TABLE wines ADD COLUMN IF NOT EXISTS producer_region   VARCHAR;
-- Coarse grouping the cellar page uses for its Italy / South Africa / France
-- sections. Derived from the JSON file each entry came from, not from `region`.
ALTER TABLE wines ADD COLUMN IF NOT EXISTS collection        VARCHAR;

-- Presentation fields rendered as badges on the card and in the detail view.
ALTER TABLE wines ADD COLUMN IF NOT EXISTS color              VARCHAR;
ALTER TABLE wines ADD COLUMN IF NOT EXISTS category_filter    VARCHAR;
ALTER TABLE wines ADD COLUMN IF NOT EXISTS confidence         VARCHAR;
ALTER TABLE wines ADD COLUMN IF NOT EXISTS source_note        TEXT;

-- Rating block. Kept as discrete columns rather than JSONB so the existing
-- SELECT-based query style and the admin edit form stay simple.
ALTER TABLE wines ADD COLUMN IF NOT EXISTS rating_source      VARCHAR;
ALTER TABLE wines ADD COLUMN IF NOT EXISTS rating_score       VARCHAR;
ALTER TABLE wines ADD COLUMN IF NOT EXISTS rating_scale       VARCHAR;
ALTER TABLE wines ADD COLUMN IF NOT EXISTS rating_count       VARCHAR;
ALTER TABLE wines ADD COLUMN IF NOT EXISTS rating_found       BOOLEAN;
ALTER TABLE wines ADD COLUMN IF NOT EXISTS rating_reason      TEXT;

-- Display price range. Distinct from `price`, which stays the single figure
-- used by the menu and ordering flows.
ALTER TABLE wines ADD COLUMN IF NOT EXISTS price_min           NUMERIC;
ALTER TABLE wines ADD COLUMN IF NOT EXISTS price_max           NUMERIC;

-- Position within the producer's listing, taken from the JSON sequence. The
-- cellar page groups wines by producer and pages between siblings, so the
-- curated order has to survive the move into the database. `order_index` cannot
-- serve this purpose: it is menu ordering, shared with the food tables and only
-- spanning 0-45 across all 109 wines.
ALTER TABLE wines ADD COLUMN IF NOT EXISTS cellar_order       INTEGER;

COMMIT;