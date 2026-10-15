/* Merge: match by producer + critical tokens (not name similarity) */

const { Pool } = require('pg');

const LOCAL_URL = 'postgresql://postgres:dtechpsql@localhost:5432/chateau254';

const pool = new Pool({ connectionString: LOCAL_URL, ssl: false });

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

/* Check if two names share SAME critical wine identity tokens */
function shareSameCriticalTokens(a, b) {
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

  // Check if they share at least one critical token
  let sharedCritical = false;
  for (const crit of critical) {
    if (tokensA.has(crit) && tokensB.has(crit)) {
      sharedCritical = true;
      break;
    }
  }
  
  if (!sharedCritical) return false;

  // Also ensure they DON'T have conflicting critical tokens
  for (const crit of critical) {
    const aHas = tokensA.has(crit);
    const bHas = tokensB.has(crit);
    if (aHas !== bHas) return false;
  }

  return true;
}

/* Check if producer/brand match */
function producerMatch(producerA, brandA, producerB, brandB) {
  const a = (brandA || producerA || '').toLowerCase().trim();
  const b = (brandB || producerB || '').toLowerCase().trim();
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  const wordsA = new Set(a.split(' ').filter(w => w.length > 2));
  const wordsB = new Set(b.split(' ').filter(w => w.length > 2));
  let overlap = 0;
  for (const w of wordsA) if (wordsB.has(w)) overlap++;
  return overlap >= 1;
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

    // Separate JSON wines (has image, price=0, no brand) and Invoice wines (has brand, price>0, no image)
    const jsonWines = [];
    const invoiceWines = [];

    for (const w of allWines.rows) {
      const hasBrand = w.brand && w.brand.length > 1;
      const hasImage = w.image_url && w.image_url.length > 10;
      const pricePositive = w.price && w.price > 100;

      if (hasImage && !hasBrand && !pricePositive) {
        jsonWines.push(w);
      } else if (hasBrand && pricePositive && !hasImage) {
        invoiceWines.push(w);
      } else if (hasBrand && pricePositive && hasImage) {
        invoiceWines.push(w); // Already merged
      } else {
        jsonWines.push(w);
      }
    }

    console.log(`JSON wines (image, no brand): ${jsonWines.length}`);
    console.log(`Invoice wines (brand, price): ${invoiceWines.length}`);

    // Match invoice wines to JSON wines by: same producer + SAME critical tokens
    let merged = 0;
    const matchedJsonIds = new Set();
    const matchedInvoiceIds = new Set();

    for (const inv of invoiceWines) {
      if (matchedInvoiceIds.has(inv.id)) continue;

      let bestJson = null;

      for (const json of jsonWines) {
        if (matchedJsonIds.has(json.id)) continue;

        // Must have matching producer/brand
        if (!producerMatch(json.producer, json.brand, inv.producer, inv.brand)) continue;

        // Must share SAME critical wine tokens
        if (!shareSameCriticalTokens(inv.name, json.name)) continue;

        // Found match!
        bestJson = json;
        break;
      }

      if (bestJson) {
        console.log(`\n✅ MATCH by producer + critical tokens:`);
        console.log(`  Invoice: "${inv.name}" [${inv.brand}] - ${inv.price}`);
        console.log(`  JSON:    "${bestJson.name}" [${bestJson.producer}] - has image: YES`);

        // Use a temp name to avoid unique constraint, then update
        const tempName = `__MERGE_TEMP_${inv.id}__`;
        
        // First rename invoice to temp
        await client.query(`UPDATE wines SET name = $1 WHERE id = $2`, [tempName, inv.id]);
        
        // Then update JSON record with invoice data
        await client.query(
          `UPDATE wines SET 
            name = $1, brand = $2, producer = $3, price = $4, 
            description = $5, image_url = $6, updated_at = NOW() 
           WHERE id = $7`,
          [inv.name, inv.brand, inv.brand, inv.price, bestJson.description, bestJson.image_url, bestJson.id]
        );

        // Delete invoice duplicate (now has temp name)
        await client.query(`DELETE FROM wines WHERE id = $1`, [inv.id]);

        matchedJsonIds.add(bestJson.id);
        matchedInvoiceIds.add(inv.id);
        merged++;
        console.log(`  → Merged into JSON record (id: ${bestJson.id})`);
      } else {
        console.log(`\n❓ No JSON match for: "${inv.name}" [${inv.brand}] - keeping as-is`);
      }
    }

    await client.query('COMMIT');
    console.log(`\n✅ Done! Merged ${merged} invoice wines into JSON records`);

    // Final count
    const final = await client.query('SELECT count(*) FROM wines');
    console.log(`Total wines after merge: ${final.rows[0].count}`);

    // Show result
    const r = await client.query('SELECT name, brand, producer, price, description, image_url FROM wines ORDER BY brand, name');
    console.log('\nFinal wines:');
    r.rows.forEach(w => {
      const hasDesc = w.description && w.description.length > 10;
      const hasImg = w.image_url && w.image_url.length > 10;
      console.log(`  [${w.brand || w.producer || 'NULL'}] ${w.name} - ${w.price} - desc: ${hasDesc ? 'YES' : 'NO'} - img: ${hasImg ? 'YES' : 'NO'}`);
    });

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