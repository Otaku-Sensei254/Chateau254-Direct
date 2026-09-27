const { Pool } = require('pg');
const env = require('./env');

let pool = null;
let currentDbUrl = null;
let isUsingLocal = false;

const isNeonUrl = (url) => url && url.includes('neon.tech');

const createPool = (connectionString, useSsl) => new Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

const testConnection = async (testPool) => {
  try {
    await testPool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
};

const initializePool = async () => {
  const neonUrl = env.databaseUrl;
  const localUrl = env.localDatabaseUrl;

  if (isNeonUrl(neonUrl)) {
    console.log('[DB] Attempting Neon connection...');
    pool = createPool(neonUrl, true);
    currentDbUrl = neonUrl;
    isUsingLocal = false;

    const ok = await testConnection(pool);
    if (ok) {
      console.log('[DB] Connected to Neon (cloud)');
      return;
    }

    console.warn('[DB] Neon unavailable, falling back to local PostgreSQL...');
    await pool.end().catch(() => {});
  }

  console.log('[DB] Connecting to local PostgreSQL...');
  pool = createPool(localUrl, false);
  currentDbUrl = localUrl;
  isUsingLocal = true;

  const ok = await testConnection(pool);
  if (!ok) {
    throw new Error('Failed to connect to both Neon and local PostgreSQL');
  }
  console.log('[DB] Connected to local PostgreSQL');
};

const query = (text, params) => {
  if (!pool) throw new Error('Database not initialized. Call initializePool() first.');
  return pool.query(text, params);
};

const checkDatabase = async () => {
  const result = await query('SELECT NOW() AS now');
  return result.rows[0];
};

const closeDatabase = () => pool?.end();

const getConnectionInfo = () => ({
  url: currentDbUrl,
  isLocal: isUsingLocal,
});

module.exports = { pool, query, checkDatabase, closeDatabase, initializePool, getConnectionInfo };