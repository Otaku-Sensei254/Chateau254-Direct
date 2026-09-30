const bcrypt = require('bcryptjs');
const db = require('../config/db');

const dineInMenu = require('../../chateau245-direct/src/components/data/chateau254_full_menu.json');
const takeoutMenuData = require('../../chateau245-direct/src/components/data/takeout_menu.json');
const takeawayCombos = require('../../chateau245-direct/src/components/data/chateau_takeaway_menu.json');
const eventMenu = require('../../chateau245-direct/src/components/data/event_menu.json');
const italianWines = require('../../chateau245-direct/src/components/data/italian_wines_producer_grouped.json');
const southAfricanWines = require('../../chateau245-direct/src/components/data/chateau_south_african_wines.json');
const frenchWines = require('../../chateau245-direct/src/components/data/chateau_french_wines.json');

const admin = { name: 'Chateau Admin', email: 'admin@chateau254.com', password: 'chateau254@1234' };
const riders = [
  { name: 'Peter Banda', email: 'peter.banda@chateau254.com', phone: '0712 987 654' },
  { name: 'Alex Njoroge', email: 'alex.njoroge@chateau254.com', phone: '0722 345 678' },
  { name: 'James Mutua', email: 'james.mutua@chateau254.com', phone: '0790 456 123' },
  { name: 'Samuel Kariuki', email: 'samuel.kariuki@chateau254.com', phone: '0701 234 567' },
];

const roleId = async (client, name) => {
  const result = await client.query('SELECT id FROM roles WHERE name = $1', [name]);
  if (!result.rowCount) throw new Error(`Missing role: ${name}`);
  return result.rows[0].id;
};

const upsertUser = async (client, account, role) => {
  const passwordHash = await bcrypt.hash(account.password || 'chateau254@1234', 12);
  const userResult = await client.query(
    `INSERT INTO chateau_users (full_name, email, password_hash)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, password_hash = EXCLUDED.password_hash
     RETURNING id, full_name, email`,
    [account.name, account.email, passwordHash],
  );
  const user = userResult.rows[0];
  const roleIdValue = await roleId(client, role);
  await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [user.id, roleIdValue]);
  return user;
};

const seedDineIn = async (client) => {
  const FOOD_SUBCATEGORY_MAP = {
    'Appetizers': 'Appetizers', 'Soups': 'Soups', 'Salads': 'Salads',
    'Signature Mains': 'Mains', 'Farinaceous Delicacies': 'Pasta',
    'Chateau Classics': 'Mains', 'Chateau Lunchbox': 'Mains',
    'Light Fair': 'Mains', 'Platters & Boards': 'Platters',
  };
  const categories = dineInMenu?.categories || [];
  let orderIdx = 0;
  for (const category of categories) {
    const subcategory = FOOD_SUBCATEGORY_MAP[category.category] || category.category;
    for (const item of (category.items || [])) {
      await client.query(
        `INSERT INTO dine_in_menu (name, description, price, category, subcategory, image_url, on_offer, offer, order_index)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price, image_url = EXCLUDED.image_url, on_offer = EXCLUDED.on_offer, offer = EXCLUDED.offer, subcategory = EXCLUDED.subcategory, order_index = EXCLUDED.order_index, updated_at = NOW()`,
        [item.name, item.description || '', item.price || 0, 'Meals', subcategory, item.image || null, Boolean(item.on_offer), item.offer || null, orderIdx++],
      );
    }
  }
};

const seedTakeout = async (client) => {
  const FOOD_SUBCATEGORY_MAP = {
    'Coffee & Hot Drinks': 'Beverages', 'Cold Drinks': 'Beverages',
    'Fast Food': 'Fast Food', 'Fried Chicken': 'Fast Food',
    'Lunch / Mains': 'Mains', 'Desserts': 'Desserts',
    'Canapés & Starters': 'Appetizers', 'Buffet Mains': 'Mains',
    'Salads & Sides': 'Salads', 'Desserts & Cakes': 'Desserts',
    'Beverage Service': 'Beverages', 'Plated Combos': 'Combos',
    'Sharing Boards': 'Platters',
  };
  const upsert = async (item, rawCategory, price, orderIdx) => {
    if (!price) return;
    const subcategory = FOOD_SUBCATEGORY_MAP[rawCategory] || rawCategory;
    await client.query(
      `INSERT INTO takeout_menu (name, description, price, category, subcategory, image_url, on_offer, offer, order_index)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price, image_url = EXCLUDED.image_url, on_offer = EXCLUDED.on_offer, offer = EXCLUDED.offer, subcategory = EXCLUDED.subcategory, order_index = EXCLUDED.order_index, updated_at = NOW()`,
      [item.name, item.description || '', price, 'Meals', subcategory, item.image || null, Boolean(item.on_offer), item.offer || null, orderIdx],
    );
  };

  let orderIdx = 0;
  const takeoutCategories = takeoutMenuData?.takeout_menu || [];
  for (const category of takeoutCategories) {
    for (const item of (category.items || [])) {
      const price = item.price_range_kes
        ? Math.round((item.price_range_kes.min + item.price_range_kes.max) / 2)
        : item.pricing?.paired_price_with_wine_kes || item.pricing?.meal_only_kes || null;
      await upsert(item, category.category, price, orderIdx++);
    }
  }

  const eventCategories = eventMenu?.event_menu || [];
  for (const category of eventCategories) {
    for (const item of (category.items || [])) {
      const price = item.price_range_kes
        ? Math.round((item.price_range_kes.min + item.price_range_kes.max) / 2)
        : item.pricing?.paired_price_with_wine_kes || item.pricing?.meal_only_kes || null;
      await upsert(item, category.category, price, orderIdx++);
    }
  }

  const comboCategories = takeawayCombos?.takeaway_combo_menu?.categories || [];
  for (const category of comboCategories) {
    for (const item of (category.items || [])) {
      const price = item.pricing?.paired_price_with_wine_kes
        ? item.pricing.paired_price_with_wine_kes
        : item.pricing?.meal_only_kes && item.pricing?.wine_only_kes
          ? Math.round((item.pricing.meal_only_kes + item.pricing.wine_only_kes) / 2)
          : item.pricing?.meal_only_kes || null;
      await upsert(item, category.category, price, orderIdx++);
    }
  }
};

const seedWines = async (client, data) => {
  const producers = data?.producers || [];
  const WINE_SUBCATEGORY_MAP = { 'Red': 'Red', 'White': 'White', 'Rosé': 'Rosé', 'Rose': 'Rosé', 'Sparkling': 'Sparkling', 'Sparkling Rosé': 'Sparkling', 'Sparkling White': 'Sparkling', 'Red (lightly sparkling)': 'Red', 'Orange': 'Orange', 'Dessert': 'Dessert', 'Fortified': 'Dessert' };
  let orderIdx = 0;
  for (const producer of producers) {
    for (const wine of (producer.wines || [])) {
      const price = wine.price_range_kes
        ? Math.round((wine.price_range_kes.min + wine.price_range_kes.max) / 2)
        : null;
      if (!price) continue;
      const onOffer = Boolean(wine.on_offer || wine.on_Offer || wine.classification?.on_offer || wine.classification?.on_Offer);
      const offerText = wine.offer || wine.classification?.offer || null;
      const rawColor = wine.color || 'Other';
      const subcategory = WINE_SUBCATEGORY_MAP[rawColor] || rawColor;
      await client.query(
        `INSERT INTO wines (name, description, price, category, subcategory, image_url, wine_type, region, grape, tasting_notes, on_offer, offer, order_index)
         VALUES ($1, $2, $3, 'Wine', $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (name) DO UPDATE SET
           price = EXCLUDED.price, image_url = EXCLUDED.image_url,
           wine_type = EXCLUDED.wine_type, region = EXCLUDED.region,
           grape = EXCLUDED.grape, tasting_notes = EXCLUDED.tasting_notes,
           on_offer = EXCLUDED.on_offer, offer = EXCLUDED.offer,
           subcategory = EXCLUDED.subcategory, order_index = EXCLUDED.order_index, updated_at = NOW()`,
        [
          wine.name,
          wine.backstory || `${wine.color} from ${data.region}`,
          price,
          subcategory,
          wine.image || null,
          wine.color || null,
          `${producer.producer_region}${data.region ? `, ${data.region}` : ''}`.trim(),
          wine.grape || null,
          wine.backstory || null,
          onOffer,
          offerText,
          orderIdx++,
        ],
      );
    }
  }
};

const seed = async () => {
  await db.initializePool();
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    await client.query('TRUNCATE TABLE order_items CASCADE');
    await client.query('TRUNCATE TABLE bookings CASCADE');
    await client.query('TRUNCATE TABLE tables CASCADE');
    await client.query('TRUNCATE TABLE rider_locations CASCADE');
    await client.query('TRUNCATE TABLE customer_locations CASCADE');
    await client.query('TRUNCATE TABLE takeout_menu CASCADE');
    await client.query('TRUNCATE TABLE dine_in_menu CASCADE');
    await client.query('TRUNCATE TABLE wines CASCADE');
    await client.query('TRUNCATE TABLE riders CASCADE');

    await client.query(`INSERT INTO roles (name, description) VALUES
      ('admin', 'Full access to Chateau254 administration'),
      ('rider', 'Delivery partner access'),
      ('staff', 'Restaurant operations access'),
      ('customer', 'Customer ordering access')
    ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description`);

    await client.query(`INSERT INTO permissions (name, description) VALUES
      ('dashboard.view', 'View dashboards'), ('orders.view', 'View orders'), ('orders.create', 'Create orders'),
      ('orders.update_status', 'Update order status'), ('menu.view', 'View menu'), ('menu.manage', 'Manage menu'),
      ('customers.view', 'View customers'), ('customers.manage_loyalty', 'Manage loyalty'),
      ('riders.view', 'View riders'), ('riders.manage', 'Manage riders'), ('reports.view', 'View reports'),
      ('promotions.manage', 'Manage promotions'), ('settings.manage', 'Manage settings'), ('profile.manage', 'Manage profile')
    ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description`);

    await client.query('INSERT INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = \'admin\' ON CONFLICT DO NOTHING');
    await client.query('INSERT INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r JOIN permissions p ON p.name IN (\'dashboard.view\',\'orders.view\',\'orders.update_status\',\'menu.view\',\'customers.view\',\'profile.manage\') WHERE r.name = \'staff\' ON CONFLICT DO NOTHING');
    await client.query('INSERT INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r JOIN permissions p ON p.name IN (\'dashboard.view\',\'orders.view\',\'orders.update_status\',\'profile.manage\') WHERE r.name = \'rider\' ON CONFLICT DO NOTHING');
    await client.query('INSERT INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r JOIN permissions p ON p.name IN (\'orders.create\',\'menu.view\',\'profile.manage\') WHERE r.name = \'customer\' ON CONFLICT DO NOTHING');

    const adminUser = await upsertUser(client, admin, 'admin');
    for (const rider of riders) {
      const riderUser = await upsertUser(client, rider, 'rider');
      await client.query(
        `INSERT INTO riders (user_id, full_name, phone)
         VALUES ($1, $2, $3)
         ON CONFLICT (phone) DO UPDATE SET user_id = EXCLUDED.user_id, full_name = EXCLUDED.full_name`,
        [riderUser.id, rider.name, rider.phone],
      );
    }

    await seedDineIn(client);
    await seedTakeout(client);
    await seedWines(client, italianWines);
    await seedWines(client, southAfricanWines);
    await seedWines(client, frenchWines);

    await client.query('COMMIT');
    console.log(`Seeded admin ${adminUser.email}, ${riders.length} riders, dine-in, takeout, and regional wines.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await db.closeDatabase();
  }
};

seed().catch((error) => {
  console.error('Seed failed:', error.message);
  process.exitCode = 1;
});
