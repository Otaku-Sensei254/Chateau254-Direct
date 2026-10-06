const { Pool } = require('pg');
const env = require('./config/env');

const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    const result = await pool.query('SELECT id, full_name, email FROM users LIMIT 5');
    console.log('Existing users:');
    console.log(result.rows);
    
    if (result.rows.length === 0) {
      console.log('No users found. Creating test user...');
      const testUserId = '536dc7f2-72d8-473c-bcf5-d784d246f6c1';
      await pool.query(
        'INSERT INTO users (id, full_name, email, password_hash) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
        [testUserId, 'Test User', 'test@example.com', 'test123']
      );
      console.log('Test user created with ID:', testUserId);
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
})();