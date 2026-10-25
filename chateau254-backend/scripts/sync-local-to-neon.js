const db = require('../config/db');

(async () => {
  // Fetch all wines from Neon
  process.env.DB_MODE = 'neon';
  await db.initializePool();
  const neon = await db.query('SELECT * FROM wines ORDER BY name');
  await db.closeDatabase();

  // Connect to local and sync
  process.env.DB_MODE = 'local';
  await db.initializePool();

  // Delete all local wines
  await db.query('DELETE FROM wines');
  console.log('Cleared local wines');

  // Insert all Neon wines (excluding id and timestamps to let DB generate)
  let inserted = 0;
  for (const w of neon.rows) {
    const cols = Object.keys(w).filter(k => k !== 'id' && k !== 'created_at' && k !== 'updated_at');
    const vals = cols.map(c => w[c]);
    const placeholders = cols.map((_, i) => '$' + (i + 1)).join(', ');
    await db.query(`INSERT INTO wines (${cols.join(', ')}) VALUES (${placeholders})`, vals);
    inserted++;
  }
  console.log('Inserted', inserted, 'wines from Neon into local');

  const r = await db.query('SELECT COUNT(*) AS c FROM wines');
  console.log('Local total now:', r.rows[0].c);
  await db.closeDatabase();
})();
