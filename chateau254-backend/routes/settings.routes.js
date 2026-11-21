const express = require('express');
const asyncHandler = require('../middleware/async.middleware');
const { query } = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

const DEFAULT_THEME_CONFIG = {
  activeTheme: 'christmas',
  lightsEnabled: true,
  snowEnabled: true,
  ribbonsEnabled: true,
  treeEnabled: true,
  showBanner: true,
  bannerText: "Season's Greetings from Château254 • Celebrate the Holidays with Fine Dining & Curated Wines 🍷",
};

/**
 * Ensure site_settings table exists and default theme is present.
 */
const ensureSettingsTable = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS site_settings (
      key VARCHAR(100) PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(
    `INSERT INTO site_settings (key, value)
     VALUES ($1, $2::jsonb)
     ON CONFLICT (key) DO NOTHING;`,
    ['theme', JSON.stringify(DEFAULT_THEME_CONFIG)],
  );
};

/**
 * GET /api/settings/theme
 * Public endpoint: returns current active theme configuration.
 */
router.get('/theme', asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT value, updated_at FROM site_settings WHERE key = 'theme' LIMIT 1`,
  );

  if (!result.rows.length) {
    return res.json({ theme: DEFAULT_THEME_CONFIG });
  }

  const stored = result.rows[0].value;
  // Merge with defaults so any missing fields are safely populated
  const theme = {
    ...DEFAULT_THEME_CONFIG,
    ...(typeof stored === 'object' && stored !== null ? stored : {}),
  };

  return res.json({ theme, updatedAt: result.rows[0].updated_at });
}));

/**
 * PUT /api/settings/theme
 * Protected endpoint: updates theme settings and broadcasts update via Socket.io.
 */
router.put('/theme', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const payload = req.body || {};

  // Fetch current value to perform safe patch/merge
  const currentRes = await query(
    `SELECT value FROM site_settings WHERE key = 'theme' LIMIT 1`,
  );
  const currentVal = currentRes.rows[0]?.value || DEFAULT_THEME_CONFIG;

  const validThemes = ['christmas', 'black-gold', 'cream-burgundy', 'new-year'];
  const activeTheme = validThemes.includes(payload.activeTheme)
    ? payload.activeTheme
    : currentVal.activeTheme || 'christmas';

  const updatedConfig = {
    activeTheme,
    lightsEnabled: typeof payload.lightsEnabled === 'boolean' ? payload.lightsEnabled : (currentVal.lightsEnabled ?? true),
    snowEnabled: typeof payload.snowEnabled === 'boolean' ? payload.snowEnabled : (currentVal.snowEnabled ?? true),
    ribbonsEnabled: typeof payload.ribbonsEnabled === 'boolean' ? payload.ribbonsEnabled : (currentVal.ribbonsEnabled ?? true),
    treeEnabled: typeof payload.treeEnabled === 'boolean' ? payload.treeEnabled : (currentVal.treeEnabled ?? true),
    showBanner: typeof payload.showBanner === 'boolean' ? payload.showBanner : (currentVal.showBanner ?? true),
    bannerText: typeof payload.bannerText === 'string' && payload.bannerText.trim()
      ? payload.bannerText.trim()
      : (currentVal.bannerText || DEFAULT_THEME_CONFIG.bannerText),
  };

  const upsertRes = await query(
    `INSERT INTO site_settings (key, value, updated_at)
     VALUES ('theme', $1::jsonb, NOW())
     ON CONFLICT (key) DO UPDATE
     SET value = EXCLUDED.value, updated_at = NOW()
     RETURNING value, updated_at`,
    [JSON.stringify(updatedConfig)],
  );

  const savedTheme = upsertRes.rows[0].value;

  // Broadcast update to all connected clients (customers, riders, admins)
  const io = req.app.get('io');
  if (io) {
    io.emit('theme:updated', savedTheme);
  }

  return res.json({
    success: true,
    theme: savedTheme,
    updatedAt: upsertRes.rows[0].updated_at,
  });
}));

/**
 * GET /api/settings
 * Public endpoint: returns all site settings.
 */
router.get('/', asyncHandler(async (req, res) => {
  const result = await query(`SELECT key, value, updated_at FROM site_settings`);
  const settings = {};
  result.rows.forEach((row) => {
    settings[row.key] = row.value;
  });
  return res.json({ settings });
}));

module.exports = router;
module.exports.ensureSettingsTable = ensureSettingsTable;
