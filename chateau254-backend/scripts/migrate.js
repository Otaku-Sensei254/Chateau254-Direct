const fs = require('fs');
const path = require('path');
const { query, closeDatabase } = require('../config/db');

const schema = fs.readFileSync(path.join(__dirname, '..', 'database', 'schema.sql'), 'utf8');

query(schema)
  .then(() => console.log('Database schema applied successfully.'))
  .catch((error) => {
    console.error('Could not apply database schema:', error.message);
    process.exitCode = 1;
  })
  .finally(closeDatabase);
