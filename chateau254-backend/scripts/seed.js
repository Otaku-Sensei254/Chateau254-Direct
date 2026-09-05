const bcrypt = require('bcryptjs');
const { pool, closeDatabase } = require('../config/db');
const menuItems = require('../../chateau245-direct/src/components/data/menu.json');
const wines = require('../../chateau245-direct/src/components/data/luxury_wine_list.json');

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

const seed = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

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

    for (const item of menuItems) {
      await client.query(
        `INSERT INTO menu_items (id, name, description, price, category, image_url)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
         ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price, image_url = EXCLUDED.image_url, updated_at = NOW()`,
        [item.name, item.description, item.price, item.category, item.image],
      );
    }

    for (const wine of wines) {
      await client.query(
        `INSERT INTO menu_items (name, description, price, category, image_url, wine_type, region, grape, tasting_notes)
         VALUES ($1, $2, $3, 'Wine', $4, $5, $6, $7, $8)
         ON CONFLICT (name) DO UPDATE SET
           price = EXCLUDED.price, image_url = EXCLUDED.image_url,
           wine_type = EXCLUDED.wine_type, region = EXCLUDED.region,
           grape = EXCLUDED.grape, tasting_notes = EXCLUDED.tasting_notes, updated_at = NOW()`,
        [
          wine.name,
          wine.notes || `${wine.type} from ${wine.region}`,
          6500 + wines.indexOf(wine) * 750,
          wine.image,
          wine.type,
          wine.region,
          wine.grape,
          wine.notes,
        ],
      );
    }

    await client.query('COMMIT');
    console.log(`Seeded admin ${adminUser.email}, ${riders.length} riders, ${menuItems.length} menu items, ${wines.length} wines.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await closeDatabase();
  }
};

seed().catch((error) => {
  console.error('Seed failed:', error.message);
  process.exitCode = 1;
});
