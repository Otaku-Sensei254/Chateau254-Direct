const { Pool } = require('pg');
const env = require('./config/env');

const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      AND column_name LIKE '%mpesa%'
      ORDER BY column_name
    `);
    console.log('M-Pesa columns in orders table:');
    console.log(result.rows);
    
    if (result.rows.length === 0) {
      console.log('No M-Pesa columns found!');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
})();