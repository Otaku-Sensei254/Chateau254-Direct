/* Improved wine matching: brand-first filtering + token-based key phrase matching */

const { Pool } = require('pg');

const NEON_URL = 'postgresql://neondb_owner:npg_VGHgzsecn9y3@ep-noisy-cloud-axhxnu7n-pooler.c-4.us-east-2.aws.neon.tech/chateau254?sslmode=require';
const LOCAL_URL = 'postgresql://postgres:postgres@localhost:5432/chateau254';

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
const invoiceWines = [
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

/* Normalize text for comparison */
function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[®™©]/g, '')
    .replace(/[&]/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* Extract key wine tokens: varietal, region, vintage, special edition markers */
function extractKeyTokens(name) {
  const normalized = normalizeText(name);
  const tokens = new Set();

  /* Multi-word key phrases (order matters) - comprehensive wine terms */
  const keyPhrases = [
    'montepulciano d abruzzo',
    'valpolicella ripasso',
    'valpolicella superiore',
    'valpolicella',
    'amarone della valpolicella',
    'amarone',
    'chianti classico riserva',
    'chianti classico gran selezione',
    'chianti classico',
    'chianti',
    'brunello di montalcino',
    'rosso di montalcino',
    'vino nobile di montepulciano',
    'montepulciano',
    'terre di chieti',
    'terre d abruzzo',
    'valdobbiadene superiore',
    'valdobbiadene',
    'prosecco docg',
    'prosecco doc',
    'prosecco',
    'nero d avola',
    'nero davola',
    'negroamaro',
    'primitivo',
    'aglianico',
    'fiano',
    'greco di tufo',
    'falanghina',
    'pecorino',
    'trebbiano d abruzzo',
    'trebbiano',
    'soave',
    'bardolino superiore',
    'bardolino',
    'corvina veronese',
    'corvina',
    'rondinella',
    'moscato giallo',
    'moscato',
    'gavi',
    'gavi docg',
    'barbaresco',
    'barolo',
    'nebbiolo',
    'dolcetto',
    'barbera',
    'carmignano',
    'roero arneis',
    'roero',
    'langhe',
    'sangiovese',
    'cabernet sauvignon',
    'cabernet franc',
    'cabernet',
    'sauvignon blanc',
    'sauvignon',
    'merlot',
    'pinot grigio',
    'pinot gris',
    'pinot noir',
    'pinot blanc',
    'chardonnay',
    'riesling',
    'gewurztraminer',
    'gewurz',
    'shiraz',
    'syrah',
    'malbec',
    'carmenere',
    'petit verdot',
    'zinfandel',
    'tempranillo',
    'garnacha',
    'grenache',
    'mourvedre',
    'carignan',
    'cinsault',
  ];

  for (const phrase of keyPhrases) {
    if (normalized.includes(phrase)) {
      tokens.add(phrase);
    }
  }

  /* Edition markers */
  const editionMarkers = normalized.match(/\b(limited|edition|golf|reserve|riserva|gran|selezione|vintage|anniversary|special|collection|black|gold|platinum|premium|organic|bio|vegan|sup|superiore|classico|riserva|magnum)\b/g) || [];
  editionMarkers.forEach(t => tokens.add(t));

  /* Volume markers */
  const volume = normalized.match(/\b(75cl|750ml|75|375ml|1\.5l|1500ml|magnum)\b/g) || [];
  volume.forEach(t => tokens.add(t));

  /* Alcohol % */
  const alcohol = normalized.match(/\b\d{1,2}\.?\d?\s*%\b/g) || [];
  alcohol.forEach(t => tokens.add(t.replace(/\s/g, '')));

  /* Vintage years */
  const vintage = normalized.match(/\b(20\d{2}|19\d{2})\b/g) || [];
  vintage.forEach(t => tokens.add(t));

  return Array.from(tokens);
}

/* Calculate Jaccard similarity on key tokens */
function tokenJaccard(a, b) {
  const tokensA = new Set(extractKeyTokens(a));
  const tokensB = new Set(extractKeyTokens(b));

  if (tokensA.size === 0 && tokensB.size === 0) return 0;
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++;
  }
  const union = tokensA.size + tokensB.size - intersection;
  return intersection / union;
}

/* Check if two names share critical wine identity tokens */
function shareCriticalTokens(a, b) {
  const tokensA = new Set(extractKeyTokens(a));
  const tokensB = new Set(extractKeyTokens(b));

  /* Critical tokens that MUST match for same wine (varietal+region combos) */
  const critical = [
    'montepulciano d abruzzo',
    'valpolicella ripasso',
    'valpolicella superiore',
    'valpolicella',
    'amarone della valpolicella',
    'amarone',
    'chianti classico riserva',
    'chianti classico gran selezione',
    'chianti classico',
    'chianti',
    'brunello di montalcino',
    'rosso di montalcino',
    'vino nobile di montepulciano',
    'terre di chieti',
    'terre d abruzzo',
    'valdobbiadene superiore',
    'valdobbiadene',
    'prosecco docg',
    'prosecco doc',
    'prosecco',
    'nero d avola',
    'negroamaro',
    'primitivo',
    'aglianico',
    'falanghina',
    'pecorino',
    'trebbiano d abruzzo',
    'trebbiano',
    'soave',
    'bardolino superiore',
    'bardolino',
    'corvina',
    'moscato giallo',
    'moscato',
    'gavi',
    'barbaresco',
    'barolo',
    'nebbiolo',
    'carmignano',
    'sangiovese',
    'cabernet sauvignon',
    'cabernet franc',
    'merlot',
    'pinot grigio',
    'pinot noir',
    'chardonnay',
  ];

  for (const crit of critical) {
    const aHas = tokensA.has(crit);
    const bHas = tokensB.has(crit);
    if (aHas && bHas) return true; // Both have same critical token = likely same wine
    if (aHas !== bHas) return false; // One has it, other doesn't = different wine
  }
  return null; // No critical tokens to decide
}

/* Levenshtein distance for fallback */
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function levenshteinSimilarity(a, b) {
  const dist = levenshtein(a, b);
  return 1 - dist / Math.max(a.length, b.length);
}

/* Check if producer names match (fuzzy) */
function producersMatch(producerA, producerB) {
  if (!producerA || !producerB) return false;
  const a = normalizeText(producerA);
  const b = normalizeText(producerB);
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  // Check word overlap
  const wordsA = new Set(a.split(' ').filter(w => w.length > 2));
  const wordsB = new Set(b.split(' ').filter(w => w.length > 2));
  let overlap = 0;
  for (const w of wordsA) if (wordsB.has(w)) overlap++;
  return overlap >= 1; // At least one significant word in common
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get all wines from DB with producer (used as brand proxy)
    const existing = await client.query(
      `SELECT id, name, producer, price FROM wines ORDER BY name`
    );

    console.log(`Found ${existing.rows.length} wines in database`);

    // Build producer->wines map for brand-first matching
    const byProducer = new Map();
    for (const w of existing.rows) {
      const prod = (w.producer || '').toLowerCase().trim();
      if (!byProducer.has(prod)) byProducer.set(prod, []);
      byProducer.get(prod).push(w);
    }

    let matched = 0;
    let inserted = 0;
    let updated = 0;
    const unmatched = [];

    for (const [brandKey, invoiceName, basePrice] of invoiceWines) {
      const brand = brandMap[brandKey];
      const finalPrice = calcPrice(basePrice);
      const normalizedInvoice = normalizeText(invoiceName);

      // First, try exact name match
      const exactMatch = await client.query(
        `SELECT id, name, producer, price FROM wines WHERE LOWER(name) = LOWER($1) LIMIT 1`,
        [invoiceName]
      );

      if (exactMatch.rowCount > 0) {
        const w = exactMatch.rows[0];
        await client.query(
          `UPDATE wines SET price = $1, brand = $2, updated_at = NOW() WHERE id = $3`,
          [finalPrice, brand, w.id]
        );
        console.log(`✅ Exact match: "${invoiceName}" → ${finalPrice} [${brand}]`);
        matched++;
        updated++;
        continue;
      }

      // Get candidate wines from same producer/brand
      const brandLower = brand.toLowerCase();
      let candidates = byProducer.get(brandLower) || [];

      // Also check for partial producer name matches
      if (candidates.length === 0) {
        for (const [prod, wines] of byProducer) {
          if (prod.includes(brandLower) || brandLower.includes(prod) || producersMatch(prod, brand)) {
            candidates = candidates.concat(wines);
          }
        }
      }

      // If still no candidates, use all wines (but this should be rare)
      if (candidates.length === 0) {
        candidates = existing.rows;
      }

      // Score candidates using token-based matching
      let bestMatch = null;
      let bestScore = 0;

      for (const cand of candidates) {
        // Check critical token compatibility first
        const criticalCheck = shareCriticalTokens(invoiceName, cand.name);
        if (criticalCheck === false) {
          continue; // Definitely different wines
        }

        const tokenScore = tokenJaccard(invoiceName, cand.name);
        const levScore = levenshteinSimilarity(normalizedInvoice, normalizeText(cand.name));

        // Weighted score: 70% token Jaccard, 30% Levenshtein
        const combinedScore = tokenScore * 0.7 + levScore * 0.3;

        if (combinedScore > bestScore) {
          bestScore = combinedScore;
          bestMatch = cand;
        }
      }

      // Threshold: require good token overlap (0.45) OR very high string similarity (0.8)
      const THRESHOLD = 0.45;
      const HIGH_STRING_THRESHOLD = 0.8;

      if (bestMatch && (bestScore >= THRESHOLD || levenshteinSimilarity(normalizedInvoice, normalizeText(bestMatch.name)) >= HIGH_STRING_THRESHOLD)) {
        // Check if corrected name already exists
        const correctedName = invoiceName; // Use invoice name as canonical
        const existingName = await client.query(
          `SELECT id FROM wines WHERE name = $1 AND id != $2`,
          [correctedName, bestMatch.id]
        );

        if (existingName.rowCount > 0) {
          // Merge: update the existing correct entry, delete the duplicate
          const existingId = existingName.rows[0].id;
          await client.query(
            `UPDATE wines SET price = $1, producer = $2, updated_at = NOW() WHERE id = $3`,
            [finalPrice, brand, existingId]
          );
          await client.query(`DELETE FROM wines WHERE id = $1`, [bestMatch.id]);
          console.log(`🔀 Merged: "${bestMatch.name}" → "${correctedName}" (${bestMatch.price} → ${finalPrice}) [${brand}] score:${bestScore.toFixed(2)}`);
        } else {
          // Update existing wine
          await client.query(
            `UPDATE wines SET name = $1, price = $2, producer = $3, updated_at = NOW() WHERE id = $4`,
            [correctedName, finalPrice, brand, bestMatch.id]
          );
          console.log(`✅ Updated: "${bestMatch.name}" → "${correctedName}" (${bestMatch.price} → ${finalPrice}) [${brand}] score:${bestScore.toFixed(2)}`);
        }
        matched++;
        updated++;
      } else {
        // No good match - insert as new wine
        unmatched.push({ brand, invoiceName, basePrice, finalPrice });
        console.log(`❓ No match (best: ${bestScore.toFixed(2)}): "${invoiceName}" [${brand}]`);
      }
    }

    // Insert unmatched wines
    for (const w of unmatched) {
      const r = await client.query(
        `INSERT INTO wines (name, producer, price, color, category, category_filter, confidence, is_available, created_at, updated_at)
         VALUES ($1, $2, $3, 'red', 'wine', 'wine', 'confirmed', true, NOW(), NOW())
         ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price, producer = EXCLUDED.producer, updated_at = NOW()
         RETURNING id`,
        [w.invoiceName, w.brand, w.finalPrice]
      );
      if (r.rowCount > 0) {
        console.log(`➕ Inserted: "${w.invoiceName}" (${w.basePrice} → ${w.finalPrice}) [${w.brand}]`);
        inserted++;
      }
    }

    await client.query('COMMIT');
    console.log(`\n✅ Done! Matched/Updated: ${matched}, Inserted: ${inserted}, Unmatched: ${unmatched.length}`);
    if (unmatched.length > 0) {
      console.log('\nUnmatched wines (inserted as new):');
      unmatched.forEach(w => console.log(`  - ${w.invoiceName} [${w.brand}]`));
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', err.message);
    console.error(err.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

main();