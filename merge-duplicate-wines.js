/* Merge duplicate wines: keep JSON description/image + invoice price/brand */

const { Pool } = require('pg');

const NEON_URL = 'postgresql://neondb_owner:npg_VGHgzsecn9y3@ep-noisy-cloud-axhxnu7n-pooler.c-4.us-east-2.aws.neon.tech/chateau254?sslmode=require';

const pool = new Pool({ connectionString: NEON_URL, ssl: { rejectUnauthorized: false } });

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

/* Extract key wine tokens for matching */
function extractKeyTokens(name) {
  const normalized = normalizeText(name);
  const tokens = new Set();

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

  const editionMarkers = normalized.match(/\b(limited|edition|golf|reserve|riserva|gran|selezione|vintage|anniversary|special|collection|black|gold|platinum|premium|organic|bio|vegan|sup|superiore|classico|riserva|magnum)\b/g) || [];
  editionMarkers.forEach(t => tokens.add(t));

  const volume = normalized.match(/\b(75cl|750ml|75|375ml|1\.5l|1500ml|magnum)\b/g) || [];
  volume.forEach(t => tokens.add(t));

  const alcohol = normalized.match(/\b\d{1,2}\.?\d?\s*%\b/g) || [];
  alcohol.forEach(t => tokens.add(t.replace(/\s/g, '')));

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
    if (aHas && bHas) return true;
    if (aHas !== bHas) return false;
  }
  return null;
}

/* Levenshtein similarity */
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

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get all wines
    const allWines = await client.query(
      `SELECT id, name, brand, producer, price, description, image_url FROM wines ORDER BY name`
    );

    console.log(`Total wines: ${allWines.rows.length}`);

    // Group by brand (or producer if no brand)
    const byBrand = new Map();
    for (const w of allWines.rows) {
      const brand = (w.brand || w.producer || '').toLowerCase().trim();
      if (!brand) continue;
      if (!byBrand.has(brand)) byBrand.set(brand, []);
      byBrand.get(brand).push(w);
    }

    let merged = 0;
    let processed = new Set();

    for (const [brand, wines] of byBrand) {
      // Find potential duplicates within same brand
      for (let i = 0; i < wines.length; i++) {
        const w1 = wines[i];
        if (processed.has(w1.id)) continue;

        for (let j = i + 1; j < wines.length; j++) {
          const w2 = wines[j];
          if (processed.has(w2.id)) continue;

          // Check if they're the same wine
          const criticalCheck = shareCriticalTokens(w1.name, w2.name);
          if (criticalCheck === false) continue; // Definitely different

          const tokenScore = tokenJaccard(w1.name, w2.name);
          const levScore = levenshteinSimilarity(normalizeText(w1.name), normalizeText(w2.name));
          const combinedScore = tokenScore * 0.7 + levScore * 0.3;

          // High threshold for merging
          if (combinedScore >= 0.55 || levScore >= 0.85) {
            console.log(`\n🔍 Potential duplicate (score: ${combinedScore.toFixed(2)}):`);
            console.log(`  1. "${w1.name}" - price: ${w1.price}, brand: ${w1.brand}, desc: ${w1.description ? 'YES' : 'NO'}, img: ${w1.image_url ? 'YES' : 'NO'}`);
            console.log(`  2. "${w2.name}" - price: ${w2.price}, brand: ${w2.brand}, desc: ${w2.description ? 'YES' : 'NO'}, img: ${w2.image_url ? 'YES' : 'NO'}`);

            // Determine which to keep (prefer: has description + image, has brand, higher price accuracy)
            let keep = w1, remove = w2;
            
            // Prefer the one with description/image (JSON data)
            const w1HasContent = w1.description && w1.description.length > 10;
            const w2HasContent = w2.description && w2.description.length > 10;
            const w1HasImage = w1.image_url && w1.image_url.length > 10;
            const w2HasImage = w2.image_url && w2.image_url.length > 10;

            // Prefer the one with brand (invoice data)
            const w1HasBrand = w1.brand && w1.brand.length > 1;
            const w2HasBrand = w2.brand && w2.brand.length > 1;

            // Score each
            let score1 = (w1HasContent ? 3 : 0) + (w1HasImage ? 2 : 0) + (w1HasBrand ? 1 : 0);
            let score2 = (w2HasContent ? 3 : 0) + (w2HasImage ? 2 : 0) + (w2HasBrand ? 1 : 0);

            if (score2 > score1) {
              keep = w2; remove = w1;
            }

            console.log(`  → Keep: "${keep.name}" (score: ${Math.max(score1, score2)})`);
            console.log(`  → Remove: "${remove.name}" (score: ${Math.min(score1, score2)})`);

            // Merge: update keep with best of both
            const mergedName = keep.name; // Keep the canonical name (invoice name usually better)
            const mergedBrand = keep.brand || remove.brand;
            const mergedProducer = keep.producer || remove.producer;
            const mergedPrice = keep.price > 0 ? keep.price : remove.price;
            const mergedDesc = keep.description || remove.description;
            const mergedImage = keep.image_url || remove.image_url;

            await client.query(
              `UPDATE wines SET name = $1, brand = $2, producer = $3, price = $4, description = $5, image_url = $6, updated_at = NOW() WHERE id = $7`,
              [mergedName, mergedBrand, mergedProducer, mergedPrice, mergedDesc, mergedImage, keep.id]
            );

            // Delete the duplicate
            await client.query(`DELETE FROM wines WHERE id = $1`, [remove.id]);

            processed.add(remove.id);
            merged++;
            console.log(`  ✅ Merged`);
          }
        }
      }
    }

    await client.query('COMMIT');
    console.log(`\n✅ Done! Merged ${merged} duplicate pairs`);

    // Final count
    const final = await client.query('SELECT count(*) FROM wines');
    console.log(`Total wines after merge: ${final.rows[0].count}`);

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