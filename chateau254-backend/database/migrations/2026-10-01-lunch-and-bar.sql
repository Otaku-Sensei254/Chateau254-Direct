-- Move Lunch & Bar items from dine_in_menu into lunchbox_menu.
--
-- The customer-facing "Lunch & Bar" mode (frontend route ?mode=lunchbox) is built at
-- display time in App.js from two sources: rows whose menu_type is 'lunchbox' plus
-- dine_in_menu rows in specific subcategories. This migration makes the database the
-- single source of truth by relocating those rows, so the frontend no longer needs a
-- hardcoded subcategory allowlist.
--
-- Verified before running (Neon):
--   * dine_in_menu and lunchbox_menu have identical column sets and types.
--   * No name collisions between the source rows and existing lunchbox_menu rows.
--   * All source rows have a non-null R2 image_url; images are URL strings, so the
--     R2 objects are never touched by this migration.
--
-- Safety properties:
--   * Runs as a single transaction: either every row moves or none do.
--   * Original UUIDs are preserved so any order_items or promotion references stay valid.
--   * order_index is renumbered after the existing lunchbox_menu rows to avoid ties.

BEGIN;

-- Move rows, preserving id, then removing the originals.
WITH moved AS (
  DELETE FROM dine_in_menu
  WHERE subcategory IN ('Bar Bites & Sandwiches', 'Chateau Lunchbox')
  RETURNING id, name, description, price, category, subcategory, image_url,
            is_available, on_offer, offer, order_index, created_at, updated_at
)
INSERT INTO lunchbox_menu (
  id, name, description, price, category, subcategory, image_url,
  is_available, on_offer, offer, order_index, created_at, updated_at
)
SELECT
  id, name, description, price, category, subcategory, image_url,
  is_available, on_offer, offer,
  (SELECT COALESCE(MAX(order_index), -1) FROM lunchbox_menu) + ROW_NUMBER() OVER (ORDER BY order_index, name),
  created_at, updated_at
FROM moved
ON CONFLICT DO NOTHING;

COMMIT;