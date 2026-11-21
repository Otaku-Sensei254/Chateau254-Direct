-- Site settings table for dynamic site-wide configuration (themes, seasonal controls, features)
CREATE TABLE IF NOT EXISTS site_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default theme configuration (Christmas festive by default as requested)
INSERT INTO site_settings (key, value)
VALUES (
  'theme',
  '{
    "activeTheme": "christmas",
    "lightsEnabled": true,
    "snowEnabled": true,
    "ribbonsEnabled": true,
    "treeEnabled": true,
    "showBanner": true,
    "bannerText": "Season''s Greetings from Château254 • Celebrate the Holidays with Fine Dining & Curated Wines 🍷"
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;
