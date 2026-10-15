/* Wine price calculator and Neon updater */

const { Pool } = require('pg');

const NEON_URL = 'postgresql://neondb_owner:npg_VGHgzsecn9y3@ep-noisy-cloud-axhxnu7n-pooler.c-4.us-east-2.aws.neon.tech/chateau254?sslmode=require';

const pool = new Pool({ connectionString: NEON_URL, ssl: { rejectUnauthorized: false } });

/* Formula: round(base × 1.18 × 1.35, -2) */
const calcPrice = (base) => Math.round(base * 1.18 * 1.35 / 100) * 100;

/* Brand mappings - normalize brand names */
const brandMap = {
  'ASTORIA': 'Astoria',
  'BLASI CANTINA': 'Blasi Cantina',
  'BORGOFULVIA': 'Borgofulvia',
  'CANTINE TRUENTUM': 'Cantine Truentum',
  'CASTEL FIRMIAN': 'Castel Firmian',
  'COLLEFRISIO': 'Collefrisio',
  'DOMINO IMPERFECTTO': 'Domino Imperfetto',
  'IDI DI MARZO': 'Idi di Marzo',
  'LAMOLE': 'Lamole',
  'MARRAMIERO': 'Marramiero',
  'MARTOCCIA': 'Martoccia',
  'MONTE TONDO': 'Monte Tondo',
  'PAJARU': 'Pajaru',
  'PERI PERI': 'Peri Peri',
  'RIGOLOCCIO': 'Rigoloccio',
  'SALSEDINE': 'Salsedine',
  'TENUTA DI ARTIMINO': 'Tenuta di Artimino',
};

/* Invoice data: [brand, wine_name, base_price] */
const wines = [
  /* ASTORIA */
  ['ASTORIA', 'Prosecco DOC Treviso Butterfly 75cl', 1750],
  ['ASTORIA', 'Prosecco DOC Treviso Rosé 75cl', 1600],
  ['ASTORIA', 'Valpolicella Ripasso DOC AS 75cl', 2750],
  ['ASTORIA', 'Amarone della Valpolicella AS 75cl', 5350],
  ['ASTORIA', 'Rosé Veneto Mina IGT 75cl', 1700],
  ['ASTORIA', 'Casa Vittorino Prosecco Sup 75cl', 2500],
  ['ASTORIA', 'Clamore Sauvignon Blanc Brut 75cl', 1550],
  ['ASTORIA', 'Suade Sauvignon Blanc IGT 75cl', 1700],
  ['ASTORIA', 'Pinot Grigio Alisia DOC 75cl', 1800],
  ['ASTORIA', 'Prosecco Valdobbiadene Superiore DOCG Brut 75cl', 1990],

  /* BLASI CANTINA */
  ['BLASI CANTINA', 'Umbria Chardonnay Sauvignon IGP 2024 750ml', 1850],
  ['BLASI CANTINA', 'Altotiberini Rosso Bio Cervo Rosso', 1850],

  /* BORGOFULVIA */
  ['BORGOFULVIA', 'Lambrusco Rosso Dolce IGT 75cl', 1550],
  ['BORGOFULVIA', 'Pinot Grigio IGT BF 75cl', 1300],

  /* CANTINE TRUENTUM */
  ['CANTINE TRUENTUM', 'Montepulciano d\'Abruzzo Malamore 75cl', 2450],

  /* CASTEL FIRMIAN */
  ['CASTEL FIRMIAN', 'Moscato Giallo 75cl Trentino DOC', 1450],

  /* COLLEFRISIO */
  ['COLLEFRISIO', 'In&Out Black Edition', 7600],
  ['COLLEFRISIO', 'In&Out Montepulciano', 5550],
  ['COLLEFRISIO', 'Bianco Terre di Chieti d\'Abruzzo IGT 75cl', 2250],
  ['COLLEFRISIO', 'Terre d\'Abruzzo IGT Pecorino 13.5% In&Out', 4500],
  ['COLLEFRISIO', 'Montepulciano d\'Abruzzo Golf Limited Edition 15% 75cl', 5400],
  ['COLLEFRISIO', 'Montepulciano d\'Abruzzo Semis 15% 75cl', 4400],

  /* DOMINO IMPERFECTTO */
  ['DOMINO IMPERFECTTO', 'Queen Rhapsody Organic Wine 75cl', 1800],
  ['DOMINO IMPERFECTTO', 'Perfectly Imperfect Organic Wine 75cl', 2460],

  /* IDI DI MARZO */
  ['IDI DI MARZO', 'Rosso Terre di Chieti IGT 1910 75cl', 1350],
  ['IDI DI MARZO', 'Appassimento Vino Rosso Carnalis 75cl', 2550],

  /* LAMOLE */
  ['LAMOLE', 'Chianti Classico Maggiolo Bio 75cl 14%', 3300],
  ['LAMOLE', 'Lareale Bio Chianti Classico DOCG Riserva', 4200],
  ['LAMOLE', 'Vigna Grosoli Chianti Classico Gran Selezione', 7400],

  /* MARRAMIERO */
  ['MARRAMIERO', 'Montepulciano d\'Abruzzo Marra 75', 1980],
  ['MARRAMIERO', 'Montepulciano d\'Abruzzo Incanto 14% 75cl', 2650],
  ['MARRAMIERO', 'Trebbiano d\'Abruzzo Marra 75cl', 1800],
  ['MARRAMIERO', 'Pecorino Terre d\'Abruzzo Marra', 1750],

  /* MARTOCCIA */
  ['MARTOCCIA', 'Poggia Apricale Toscana 75cl', 1950],
  ['MARTOCCIA', 'Rosso di Montalcino DOC Mart 76cl', 3500],

  /* MONTE TONDO */
  ['MONTE TONDO', 'Corvina Veneto IGT 75cl', 1550],
  ['MONTE TONDO', 'Valpolicella Superiore San Pietro MT 75cl', 2600],
  ['MONTE TONDO', 'Valpolicella Ripasso DOC Sup MT 75cl', 3100],
  ['MONTE TONDO', 'Amarone della Valpolicella MT 75cl', 6500],
  ['MONTE TONDO', 'Soave DOC Mito 75cl', 1550],

  /* PAJARU */
  ['PAJARU', 'Negroamaro IGT Puglia Paritaru Organic 75cl', 2450],
  ['PAJARU', 'Nero di Troia IGT Puglia Auru Organic 75cl', 2450],
  ['PAJARU', 'Primitivo IGT Puglia Picurarru', 2950],

  /* PERI PERI */
  ['PERI PERI', 'Toto Nero d\'Avola IGT Terre Siciliane Organic 75cl', 1550],
  ['PERI PERI', 'Nini Grillo Bianco IGT Terre Siciliane Organic 75cl', 1500],

  /* RIGOLOCCIO */
  ['RIGOLOCCIO', 'Costa Toscana Rosso Sorvegliante IGT 75cl', 2160],

  /* SALSEDINE */
  ['SALSEDINE', 'Salsedine Negroamaro Puglia IGT 75cl', 1990],
  ['SALSEDINE', 'Salsedine Primitivo Puglia IGT 75cl', 2200],

  /* TENUTA DI ARTIMINO */
  ['TENUTA DI ARTIMINO', 'Artumes Toscana Bianco IGT 75cl', 2200],
  ['TENUTA DI ARTIMINO', 'Poggilarca Carmignano DOCG 75cl', 3750],
  ['TENUTA DI ARTIMINO', 'Campo al Rio Toscana IGT 75cl', 2100],
];

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const [brandKey, wineName, basePrice] of wines) {
      const brand = brandMap[brandKey];
      const finalPrice = calcPrice(basePrice);

      // Normalize wine name for matching
      const normalizedName = wineName.trim();

      // Try to find existing wine by name (case-insensitive)
      const existing = await client.query(
        `SELECT id, name, brand, price FROM wines WHERE LOWER(name) = LOWER($1) LIMIT 1`,
        [normalizedName]
      );

      if (existing.rowCount > 0) {
        // Update existing
        await client.query(
          `UPDATE wines SET price = $1, brand = $2, updated_at = NOW() WHERE id = $3`,
          [finalPrice, brand, existing.rows[0].id]
        );
        console.log(`✅ Updated: ${normalizedName} (${basePrice} → ${finalPrice}) [${brand}]`);
      } else {
        // Insert new - need to set required fields
        await client.query(
          `INSERT INTO wines (name, brand, price, color, category, category_filter, confidence, is_available, created_at, updated_at)
           VALUES ($1, $2, $3, 'red', 'wine', 'wine', 'confirmed', true, NOW(), NOW())`,
          [normalizedName, brand, finalPrice]
        );
        console.log(`➕ Inserted: ${normalizedName} (${basePrice} → ${finalPrice}) [${brand}]`);
      }
    }

    await client.query('COMMIT');
    console.log('\n✅ All done!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

main();