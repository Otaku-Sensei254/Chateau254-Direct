CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL AND to_regclass('public.chateau_users') IS NULL THEN
    ALTER TABLE users RENAME TO chateau_users;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS chateau_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), full_name VARCHAR(120) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL, password_hash TEXT,
  loyalty_points INTEGER NOT NULL DEFAULT 0 CHECK (loyalty_points >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE chateau_users ADD COLUMN IF NOT EXISTS full_name VARCHAR(120);
ALTER TABLE chateau_users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE chateau_users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE chateau_users ADD COLUMN IF NOT EXISTS loyalty_points INTEGER NOT NULL DEFAULT 0;
ALTER TABLE chateau_users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE chateau_users DROP COLUMN IF EXISTS role;

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(40) UNIQUE NOT NULL,
  description TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(80) UNIQUE NOT NULL,
  description TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(160) NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '', price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  category VARCHAR(40) NOT NULL, image_url TEXT, is_available BOOLEAN NOT NULL DEFAULT TRUE,
  wine_type VARCHAR(80), region VARCHAR(160), grape VARCHAR(160), tasting_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS riders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID UNIQUE REFERENCES chateau_users(id) ON DELETE CASCADE,
  full_name VARCHAR(120) NOT NULL, phone VARCHAR(30) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'on_break')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE riders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES chateau_users(id) ON DELETE CASCADE;
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES chateau_users(id),
  rider_id UUID REFERENCES riders(id) ON DELETE SET NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'out_for_delivery', 'completed', 'cancelled')),
  delivery_address TEXT NOT NULL, total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id), quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0)
);

ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS wine_type VARCHAR(80);
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS region VARCHAR(160);
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS grape VARCHAR(160);
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS tasting_notes TEXT;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'menu_items_name_key') THEN
    ALTER TABLE menu_items ADD CONSTRAINT menu_items_name_key UNIQUE (name);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
CREATE INDEX IF NOT EXISTS orders_user_id_idx ON orders(user_id);
CREATE INDEX IF NOT EXISTS orders_rider_id_idx ON orders(rider_id);
CREATE INDEX IF NOT EXISTS menu_items_category_idx ON menu_items(category);
CREATE INDEX IF NOT EXISTS user_roles_role_id_idx ON user_roles(role_id);

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

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM chateau_users u JOIN roles r ON r.name = 'customer'
WHERE NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id);
