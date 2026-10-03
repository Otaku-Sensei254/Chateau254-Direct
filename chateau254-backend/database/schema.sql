CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS tables CASCADE;
DROP TABLE IF EXISTS rider_locations CASCADE;
DROP TABLE IF EXISTS customer_locations CASCADE;
DROP TABLE IF EXISTS takeout_menu CASCADE;
DROP TABLE IF EXISTS dine_in_menu CASCADE;
DROP TABLE IF EXISTS wines CASCADE;
DROP TABLE IF EXISTS riders CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS chateau_users CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL AND to_regclass('public.chateau_users') IS NULL THEN
    ALTER TABLE users RENAME TO chateau_users;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS chateau_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT,
  loyalty_points INTEGER NOT NULL DEFAULT 0 CHECK (loyalty_points >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE chateau_users ADD COLUMN IF NOT EXISTS full_name VARCHAR(120);
ALTER TABLE chateau_users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE chateau_users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE chateau_users ADD COLUMN IF NOT EXISTS loyalty_points INTEGER NOT NULL DEFAULT 0;
ALTER TABLE chateau_users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE chateau_users DROP COLUMN IF EXISTS role;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT,
  phone VARCHAR(30),
  loyalty_points INTEGER NOT NULL DEFAULT 0 CHECK (loyalty_points >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(30);

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(40) UNIQUE NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(80) UNIQUE NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID NOT NULL REFERENCES chateau_users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS wines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(160) NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  category VARCHAR(40) NOT NULL DEFAULT 'Wine',
  subcategory VARCHAR(80),
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  on_offer BOOLEAN NOT NULL DEFAULT FALSE,
  offer TEXT,
  wine_type VARCHAR(80),
  region VARCHAR(160),
  grape VARCHAR(160),
  tasting_notes TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE wines ADD COLUMN IF NOT EXISTS wine_type VARCHAR(80);
ALTER TABLE wines ADD COLUMN IF NOT EXISTS region VARCHAR(160);

-- Cellar catalogue fields backing the public /wines page. Mirrors
-- database/migrations/2026-10-03-wine-cellar-fields.sql. Additive only; the
-- admin-managed columns above (image_url, description, price, availability and
-- offer flags) are never written by the sync script.
ALTER TABLE wines ADD COLUMN IF NOT EXISTS producer VARCHAR(160);
ALTER TABLE wines ADD COLUMN IF NOT EXISTS producer_region VARCHAR(160);
ALTER TABLE wines ADD COLUMN IF NOT EXISTS collection VARCHAR(40);
ALTER TABLE wines ADD COLUMN IF NOT EXISTS color VARCHAR(40);
ALTER TABLE wines ADD COLUMN IF NOT EXISTS category_filter VARCHAR(40);
ALTER TABLE wines ADD COLUMN IF NOT EXISTS confidence VARCHAR(40);
ALTER TABLE wines ADD COLUMN IF NOT EXISTS source_note TEXT;
ALTER TABLE wines ADD COLUMN IF NOT EXISTS rating_source VARCHAR(120);
ALTER TABLE wines ADD COLUMN IF NOT EXISTS rating_score VARCHAR(40);
ALTER TABLE wines ADD COLUMN IF NOT EXISTS rating_scale VARCHAR(40);
ALTER TABLE wines ADD COLUMN IF NOT EXISTS rating_count VARCHAR(40);
ALTER TABLE wines ADD COLUMN IF NOT EXISTS rating_found BOOLEAN;
ALTER TABLE wines ADD COLUMN IF NOT EXISTS rating_reason TEXT;
ALTER TABLE wines ADD COLUMN IF NOT EXISTS price_min NUMERIC(12, 2);
ALTER TABLE wines ADD COLUMN IF NOT EXISTS price_max NUMERIC(12, 2);
ALTER TABLE wines ADD COLUMN IF NOT EXISTS cellar_order INTEGER;
ALTER TABLE wines ADD COLUMN IF NOT EXISTS grape VARCHAR(160);
ALTER TABLE wines ADD COLUMN IF NOT EXISTS tasting_notes TEXT;
ALTER TABLE wines ADD COLUMN IF NOT EXISTS on_offer BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE wines ADD COLUMN IF NOT EXISTS offer TEXT;
ALTER TABLE wines ADD COLUMN IF NOT EXISTS subcategory VARCHAR(80);
ALTER TABLE wines ADD COLUMN IF NOT EXISTS order_index INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS wines_category_idx ON wines(category);
CREATE INDEX IF NOT EXISTS wines_order_idx ON wines(order_index);

CREATE TABLE IF NOT EXISTS dine_in_menu (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(160) NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  category VARCHAR(40) NOT NULL DEFAULT 'Meals',
  subcategory VARCHAR(80),
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  on_offer BOOLEAN NOT NULL DEFAULT FALSE,
  offer TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS dine_in_menu_category_idx ON dine_in_menu(category);
CREATE INDEX IF NOT EXISTS dine_in_menu_order_idx ON dine_in_menu(order_index);

CREATE TABLE IF NOT EXISTS takeout_menu (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(160) NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  category VARCHAR(40) NOT NULL DEFAULT 'Meals',
  subcategory VARCHAR(80),
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  on_offer BOOLEAN NOT NULL DEFAULT FALSE,
  offer TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS takeout_menu_category_idx ON takeout_menu(category);
CREATE INDEX IF NOT EXISTS takeout_menu_order_idx ON takeout_menu(order_index);

CREATE TABLE IF NOT EXISTS lunchbox_menu (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(160) NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  category VARCHAR(40) NOT NULL DEFAULT 'Meals',
  subcategory VARCHAR(80),
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  on_offer BOOLEAN NOT NULL DEFAULT FALSE,
  offer TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS lunchbox_menu_category_idx ON lunchbox_menu(category);
CREATE INDEX IF NOT EXISTS lunchbox_menu_order_idx ON lunchbox_menu(order_index);

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
CREATE TABLE IF NOT EXISTS feed_likes (
  post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);
CREATE INDEX IF NOT EXISTS feed_likes_user_idx ON feed_likes(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(180) NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  link_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  priority INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS promotions_active_idx ON promotions(is_active, priority DESC);



CREATE TABLE IF NOT EXISTS riders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES chateau_users(id) ON DELETE CASCADE,
  full_name VARCHAR(120) NOT NULL,
  phone VARCHAR(30) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'on_break')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE riders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES chateau_users(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  rider_id UUID REFERENCES riders(id) ON DELETE SET NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'out_for_delivery', 'completed', 'cancelled')),
  delivery_address TEXT NOT NULL,
  total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
  payment_method VARCHAR(30) NOT NULL DEFAULT 'cash_on_delivery',
  payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'pending', 'completed', 'failed', 'reversed')),
  pesapal_merchant_reference VARCHAR(50),
  pesapal_tracking_id UUID,
  payment_provider_status VARCHAR(80),
  payment_message TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ DECLARE
  v_conname TEXT;
BEGIN
  SELECT c.conname INTO v_conname FROM pg_constraint c
  WHERE c.conrelid = 'orders'::regclass AND c.contype = 'f'
  AND pg_get_constraintdef(c.oid) LIKE '%chateau_users%';
  IF v_conname IS NOT NULL THEN
    EXECUTE 'ALTER TABLE orders DROP CONSTRAINT ' || quote_ident(v_conname);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'orders'::regclass AND c.contype = 'f'
    AND pg_get_constraintdef(c.oid) LIKE '%users(id)%' AND pg_get_constraintdef(c.oid) NOT LIKE '%chateau_users%'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0)
);

CREATE TABLE IF NOT EXISTS rider_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID NOT NULL UNIQUE REFERENCES riders(id) ON DELETE CASCADE,
  latitude NUMERIC(10, 8) NOT NULL,
  longitude NUMERIC(11, 8) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rider_locations_rider_id ON rider_locations(rider_id);

CREATE TABLE IF NOT EXISTS customer_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  latitude NUMERIC(10, 8) NOT NULL,
  longitude NUMERIC(11, 8) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customer_locations_user_id ON customer_locations(user_id);

CREATE TABLE IF NOT EXISTS tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number INTEGER NOT NULL UNIQUE,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'occupied')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  customer_name VARCHAR(120) NOT NULL,
  party_size INTEGER NOT NULL CHECK (party_size > 0),
  preferred_item VARCHAR(160),
  dining_time TIMESTAMPTZ NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'seated', 'completed', 'cancelled')),
  table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
CREATE INDEX IF NOT EXISTS orders_user_id_idx ON orders(user_id);
CREATE INDEX IF NOT EXISTS orders_rider_id_idx ON orders(rider_id);
CREATE UNIQUE INDEX IF NOT EXISTS orders_pesapal_reference_idx ON orders(pesapal_merchant_reference) WHERE pesapal_merchant_reference IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS orders_pesapal_tracking_idx ON orders(pesapal_tracking_id) WHERE pesapal_tracking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS user_roles_role_id_idx ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS bookings_status_idx ON bookings(status);
CREATE INDEX IF NOT EXISTS tables_status_idx ON tables(status);

INSERT INTO roles (name, description) VALUES
  ('admin', 'Full access to Chateau254 administration'),
  ('rider', 'Delivery partner access'),
  ('staff', 'Restaurant operations access'),
  ('customer', 'Customer ordering access')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO permissions (name, description) VALUES
  ('dashboard.view', 'View dashboards'), ('orders.view', 'View orders'), ('orders.create', 'Create orders'),
  ('orders.update_status', 'Update order status'), ('menu.view', 'View menu'), ('menu.manage', 'Manage menu'),
  ('customers.view', 'View customers'), ('customers.manage_loyalty', 'Manage loyalty'),
  ('riders.view', 'View riders'), ('riders.manage', 'Manage riders'), ('reports.view', 'View reports'),
  ('promotions.manage', 'Manage promotions'), ('settings.manage', 'Manage settings'), ('profile.manage', 'Manage profile')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'admin' ON CONFLICT DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.name IN ('dashboard.view','orders.view','orders.update_status','menu.view','customers.view','profile.manage') WHERE r.name = 'staff' ON CONFLICT DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.name IN ('dashboard.view','orders.view','orders.update_status','profile.manage') WHERE r.name = 'rider' ON CONFLICT DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.name IN ('orders.create','menu.view','profile.manage') WHERE r.name = 'customer' ON CONFLICT DO NOTHING;
