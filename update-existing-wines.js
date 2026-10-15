/* Match existing wines to invoice list and update them */

const { Pool } = require('pg');

const NEON_URL = 'postgresql://neondb_owner:npg_VGHgzsecn9y3@ep-noisy-cloud-axhxnu7n-pooler.c-4.us-east-2.aws.neon.tech/chateau254?sslmode=require';

const pool = new Pool({ connectionString: NEON_URL, ssl: { rejectUnauthorized: false } });

const calcPrice = (base) => Math.round(base * 1.18 * 1.35 / 100) * 100;

/* Invoice list with normalized names for matching */
const invoiceWines = [
  /* ASTORIA */
  { brand: 'Astoria', invoiceName: 'Prosecco DOC Treviso Butterfly 75cl', basePrice: 1750, correctName: 'Prosecco DOC Treviso Butterfly 75cl' },
  { brand: 'Astoria', invoiceName: 'Prosecco DOC Treviso Rosé 75cl', basePrice: 1600, correctName: 'Prosecco DOC Treviso Rosé 75cl' },
  { brand: 'Astoria', invoiceName: 'Valpolicella Ripasso DOC AS 75cl', basePrice: 2750, correctName: 'Valpolicella Ripasso DOC AS 75cl' },
  { brand: 'Astoria', invoiceName: 'Amarone della Valpolicella AS 75cl', basePrice: 5350, correctName: 'Amarone della Valpolicella AS 75cl' },
  { brand: 'Astoria', invoiceName: 'Rosé Veneto Mina IGT 75cl', basePrice: 1700, correctName: 'Rosé Veneto Mina IGT 75cl' },
  { brand: 'Astoria', invoiceName: 'Casa Vittorino Prosecco Sup 75cl', basePrice: 2500, correctName: 'Casa Vittorino Prosecco Sup 75cl' },
  { brand: 'Astoria', invoiceName: 'Clamore Sauvignon Blanc Brut 75cl', basePrice: 1550, correctName: 'Clamore Sauvignon Blanc Brut 75cl' },
  { brand: 'Astoria', invoiceName: 'Suade Sauvignon Blanc IGT 75cl', basePrice: 1700, correctName: 'Suade Sauvignon Blanc IGT 75cl' },
  { brand: 'Astoria', invoiceName: 'Pinot Grigio Alisia DOC 75cl', basePrice: 1800, correctName: 'Pinot Grigio Alisia DOC 75cl' },
  { brand: 'Astoria', invoiceName: 'Prosecco Valdobbiadene Superiore DOCG Brut 75cl', basePrice: 1990, correctName: 'Prosecco Valdobbiadene Superiore DOCG Brut 75cl' },

  /* BLASI CANTINA */
  { brand: 'Blasi Cantina', invoiceName: 'Umbria Chardonnay Sauvignon IGP 2024 750ml', basePrice: 1850, correctName: 'Umbria Chardonnay Sauvignon IGP 2024 750ml' },
  { brand: 'Blasi Cantina', invoiceName: 'Altotiberini Rosso Bio Cervo Rosso', basePrice: 1850, correctName: 'Altotiberini Rosso Bio Cervo Rosso' },

  /* BORGOFULVIA */
  { brand: 'Borgofulvia', invoiceName: 'Lambrusco Rosso Dolce IGT 75cl', basePrice: 1550, correctName: 'Lambrusco Rosso Dolce IGT 75cl' },
  { brand: 'Borgofulvia', invoiceName: 'Pinot Grigio IGT BF 75cl', basePrice: 1300, correctName: 'Pinot Grigio IGT BF 75cl' },

  /* CANTINE TRUENTUM */
  { brand: 'Cantine Truentum', invoiceName: 'Montepulciano d\'Abruzzo Malamore 75cl', basePrice: 2450, correctName: 'Montepulciano d\'Abruzzo Malamore 75cl' },

  /* CASTEL FIRMIAN */
  { brand: 'Castel Firmian', invoiceName: 'Moscato Giallo 75cl Trentino DOC', basePrice: 1450, correctName: 'Moscato Giallo 75cl Trentino DOC' },

  /* COLLEFRISIO */
  { brand: 'Collefrisio', invoiceName: 'In&Out Black Edition', basePrice: 7600, correctName: 'In&Out Black Edition' },
  { brand: 'Collefrisio', invoiceName: 'In&Out Montepulciano', basePrice: 5550, correctName: 'In&Out Montepulciano d\'Abruzzo (Limited Edition – Golf)' },
  { brand: 'Collefrisio', invoiceName: 'Bianco Terre di Chieti d\'Abruzzo IGT 75cl', basePrice: 2250, correctName: 'Bianco Terre di Chieti d\'Abruzzo IGT 75cl' },
  { brand: 'Collefrisio', invoiceName: 'Terre d\'Abruzzo IGT Pecorino 13.5% In&Out', basePrice: 4500, correctName: 'Terre d\'Abruzzo IGT Pecorino 13.5% In&Out' },
  { brand: 'Collefrisio', invoiceName: 'Montepulciano d\'Abruzzo Golf Limited Edition 15% 75cl', basePrice: 5400, correctName: 'Montepulciano d\'Abruzzo Golf Limited Edition 15% 75cl' },
  { brand: 'Collefrisio', invoiceName: 'Montepulciano d\'Abruzzo Semis 15% 75cl', basePrice: 4400, correctName: 'Montepulciano d\'Abruzzo Semis 15% 75cl' },

  /* DOMINO IMPERFECTTO */
  { brand: 'Domino Imperfetto', invoiceName: 'Queen Rhapsody Organic Wine 75cl', basePrice: 1800, correctName: 'Queen Rhapsody Organic Wine 75cl' },
  { brand: 'Domino Imperfetto', invoiceName: 'Perfectly Imperfect Organic Wine 75cl', basePrice: 2460, correctName: 'Perfectly Imperfect Organic Wine 75cl' },

  /* IDI DI MARZO */
  { brand: 'Idi di Marzo', invoiceName: 'Rosso Terre di Chieti IGT 1910 75cl', basePrice: 1350, correctName: 'Rosso Terre di Chieti IGT 1910 75cl' },
  { brand: 'Idi di Marzo', invoiceName: 'Appassimento Vino Rosso Carnalis 75cl', basePrice: 2550, correctName: 'Appassimento Vino Rosso Carnalis 75cl' },

  /* LAMOLE */
  { brand: 'Lamole', invoiceName: 'Chianti Classico Maggiolo Bio 75cl 14%', basePrice: 3300, correctName: 'Chianti Classico Maggiolo Bio 75cl 14%' },
  { brand: 'Lamole', invoiceName: 'Lareale Bio Chianti Classico DOCG Riserva', basePrice: 4200, correctName: 'Lareale Bio Chianti Classico DOCG Riserva' },
  { brand: 'Lamole', invoiceName: 'Vigna Grosoli Chianti Classico Gran Selezione', basePrice: 7400, correctName: 'Vigna Grosoli Chianti Classico Gran Selezione' },

  /* MARRAMIERO */
  { brand: 'Marramiero', invoiceName: 'Montepulciano d\'Abruzzo Marra 75', basePrice: 1980, correctName: 'Montepulciano d\'Abruzzo Marra 75' },
  { brand: 'Marramiero', invoiceName: 'Montepulciano d\'Abruzzo Incanto 14% 75cl', basePrice: 2650, correctName: 'Montepulciano d\'Abruzzo Incanto 14% 75cl' },
  { brand: 'Marramiero', invoiceName: 'Trebbiano d\'Abruzzo Marra 75cl', basePrice: 1800, correctName: 'Trebbiano d\'Abruzzo Marra 75cl' },
  { brand: 'Marramiero', invoiceName: 'Pecorino Terre d\'Abruzzo Marra', basePrice: 1750, correctName: 'Pecorino Terre d\'Abruzzo Marra' },

  /* MARTOCCIA */
  { brand: 'Martoccia', invoiceName: 'Poggia Apricale Toscana 75cl', basePrice: 1950, correctName: 'Poggia Apricale Toscana 75cl' },
  { brand: 'Martoccia', invoiceName: 'Rosso di Montalcino DOC Mart 76cl', basePrice: 3500, correctName: 'Rosso di Montalcino DOC Mart 76cl' },

  /* MONTE TONDO */
  { brand: 'Monte Tondo', invoiceName: 'Corvina Veneto IGT 75cl', basePrice: 1550, correctName: 'Corvina Veneto IGT 75cl' },
  { brand: 'Monte Tondo', invoiceName: 'Valpolicella Superiore San Pietro MT 75cl', basePrice: 2600, correctName: 'Valpolicella Superiore San Pietro MT 75cl' },
  { brand: 'Monte Tondo', invoiceName: 'Valpolicella Ripasso DOC Sup MT 75cl', basePrice: 3100, correctName: 'Valpolicella Ripasso DOC Sup MT 75cl' },
  { brand: 'Monte Tondo', invoiceName: 'Amarone della Valpolicella MT 75cl', basePrice: 6500, correctName: 'Amarone della Valpolicella MT 75cl' },
  { brand: 'Monte Tondo', invoiceName: 'Soave DOC Mito 75cl', basePrice: 1550, correctName: 'Soave DOC Mito 75cl' },

  /* PAJARU */
  { brand: 'Pajaru', invoiceName: 'Negroamaro IGT Puglia Paritaru Organic 75cl', basePrice: 2450, correctName: 'Negroamaro IGT Puglia Paritaru Organic 75cl' },
  { brand: 'Pajaru', invoiceName: 'Nero di Troia IGT Puglia Auru Organic 75cl', basePrice: 2450, correctName: 'Nero di Troia IGT Puglia Auru Organic 75cl' },
  { brand: 'Pajaru', invoiceName: 'Primitivo IGT Puglia Picurarru', basePrice: 2950, correctName: 'Primitivo IGT Puglia Picurarru' },

  /* PERI PERI */
  { brand: 'Peri Peri', invoiceName: 'Toto Nero d\'Avola IGT Terre Siciliane Organic 75cl', basePrice: 1550, correctName: 'Toto Nero d\'Avola IGT Terre Siciliane Organic 75cl' },
  { brand: 'Peri Peri', invoiceName: 'Nini Grillo Bianco IGT Terre Siciliane Organic 75cl', basePrice: 1500, correctName: 'Nini Grillo Bianco IGT Terre Siciliane Organic 75cl' },

  /* RIGOLOCCIO */
  { brand: 'Rigoloccio', invoiceName: 'Costa Toscana Rosso Sorvegliante IGT 75cl', basePrice: 2160, correctName: 'Costa Toscana Rosso Sorvegliante IGT 75cl' },

  /* SALSEDINE */
  { brand: 'Salsedine', invoiceName: 'Salsedine Negroamaro Puglia IGT 75cl', basePrice: 1990, correctName: 'Salsedine Negroamaro Puglia IGT 75cl' },
  { brand: 'Salsedine', invoiceName: 'Salsedine Primitivo Puglia IGT 75cl', basePrice: 2200, correctName: 'Salsedine Primitivo Puglia IGT 75cl' },

  /* TENUTA DI ARTIMINO */
  { brand: 'Tenuta di Artimino', invoiceName: 'Artumes Toscana Bianco IGT 75cl', basePrice: 2200, correctName: 'Artumes Toscana Bianco IGT 75cl' },
  { brand: 'Tenuta di Artimino', invoiceName: 'Poggilarca Carmignano DOCG 75cl', basePrice: 3750, correctName: 'Poggilarca Carmignano DOCG 75cl' },
  { brand: 'Tenuta di Artimino', invoiceName: 'Campo al Rio Toscana IGT 75cl', basePrice: 2100, correctName: 'Campo al Rio Toscana IGT 75cl' },
];

/* Fuzzy matching function */
function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/\s+/g, '');
}

function similarity(a, b) {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.9;
  // Levenshtein-like check
  let matches = 0;
  for (let i = 0; i < na.length; i++) {
    if (nb.includes(na[i])) matches++;
  }
  return matches / Math.max(na.length, nb.length);
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get all wines without brands
    const existing = await client.query(
      `SELECT id, name, price FROM wines WHERE brand IS NULL OR brand = ''`
    );

    console.log(`Found ${existing.rows.length} wines without brands`);

    let matched = 0;
    let updated = 0;

    for (const wine of existing.rows) {
      let bestMatch = null;
      let bestScore = 0;

      for (const inv of invoiceWines) {
        const score = similarity(wine.name, inv.invoiceName);
        if (score > bestScore && score > 0.7) {
          bestScore = score;
          bestMatch = inv;
        }
      }

      if (bestMatch) {
        const finalPrice = calcPrice(bestMatch.basePrice);
        
        // Check if corrected name already exists (from new inserts)
        const existingName = await client.query(
          `SELECT id FROM wines WHERE name = $1 AND id != $2`,
          [bestMatch.correctName, wine.id]
        );
        
        if (existingName.rowCount > 0) {
          // Corrected name already exists - merge by deleting the old one and keeping the new one
          const existingId = existingName.rows[0].id;
          await client.query(
            `UPDATE wines 
             SET brand = $1, price = $2, updated_at = NOW() 
             WHERE id = $3`,
            [bestMatch.brand, calcPrice(bestMatch.basePrice), existingId]
          );
          // Delete the old duplicate
          await client.query(`DELETE FROM wines WHERE id = $1`, [wine.id]);
          console.log(`🔀 Merged duplicate: "${wine.name}" → "${bestMatch.correctName}" (${wine.price} → ${calcPrice(bestMatch.basePrice)}) [${bestMatch.brand}]`);
        } else {
          await client.query(
            `UPDATE wines 
             SET name = $1, brand = $2, price = $3, updated_at = NOW() 
             WHERE id = $4`,
            [bestMatch.correctName, bestMatch.brand, calcPrice(bestMatch.basePrice), wine.id]
          );
          console.log(`✅ Updated: "${wine.name}" → "${bestMatch.correctName}" (${wine.price} → ${calcPrice(bestMatch.basePrice)}) [${bestMatch.brand}] score: ${bestScore.toFixed(2)}`);
        }
        matched++;
        updated++;
      } else {
        console.log(`⏭️  No match: "${wine.name}"`);
      }
    }

    await client.query('COMMIT');
    console.log(`\n✅ Done! Matched and updated: ${matched} wines`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

main();