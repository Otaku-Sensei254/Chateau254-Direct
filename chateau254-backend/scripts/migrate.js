const fs = require('fs');
const path = require('path');
const { query, initializePool, closeDatabase } = require('../config/db');

const schema = fs.readFileSync(path.join(__dirname, '..', 'database', 'schema.sql'), 'utf8');

(async () => {
  try {
    await initializePool();
    await query(schema);
    console.log('Database schema applied successfully.');
  } catch (error) {
    console.error('Could not apply database schema:', error.message);
    process.exitCode = 1;
  } finally {
    await closeDatabase();
  }
})();
