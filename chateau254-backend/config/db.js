const { Pool } = require('pg');
const env = require('./env');

if (!env.databaseUrl) {
  console.warn('DATABASE_URL is not set. Database routes will be unavailable until it is configured.');
}

const isNeonConnection = env.databaseUrl.includes('neon.tech');

const pool = new Pool({
  connectionString: env.databaseUrl || undefined,
  ssl: isNeonConnection || env.nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

const query = (text, params) => pool.query(text, params);

const checkDatabase = async () => {
  const result = await query('SELECT NOW() AS now');
  return result.rows[0];
};

const closeDatabase = () => pool.end();

module.exports = { pool, query, checkDatabase, closeDatabase };
