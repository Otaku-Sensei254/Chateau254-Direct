/* Enriches the invoice-inserted wines (brand set, description empty) with
 * the catalogue fields the cellar page shows — colour, subcategory,
 * category_filter, wine_type, grape, region, producer_region — plus a
 * hand-written description, collection and rating placeholders. Also
 * normalises legacy lowercase colour/category_filter values table-wide.
 *
 * Facts come from scripts/lib/classify-wine.js (rule-based, derived from
 * the wine name) with curated exceptions in scripts/data/wine-overrides.js
 * and the descriptions in scripts/data/invoice-wine-details.js.
 *
 * Run with:
 *   npm run wines:enrich                 # dry-run: prints the derived table
 *   npm run wines:enrich -- --apply      # writes in one transaction
 *   DB_MODE=neon npm run wines:enrich -- --apply
 *
 * Never touches price, image_url, is_available, on_offer, offer,
 * tasting_notes or anything else outside the catalogue columns listed in
 * UPDATE_COLUMNS. LOW-confidence classifications are flagged, not written.
 * Safe to re-run: matched by wine name, writes are idempotent.
 */

const db = require('../config/db');
const { classify, normaliseKey } = require('./lib/classify-wine');
const DETAILS = require('./data/invoice-wine-details');

const SOURCE_NOTE = 'Revised supplier invoice (Oct 2026)';
const RATING_REASON = "Searched Vivino, Wine-Searcher, Falstaff, Delectable, VertdeVin, Wine Spectator and James Suckling — no individually tracked rating exists for this specific bottling. Common for small-batch, cooperative, or private-label wines.";

/* Columns the script is allowed to write. Anything not in this list —
 * price, image, availability, offers — is never touched. */
const UPDATE_COLUMNS = [
  'color', 'subcategory', 'category_filter', 'wine_type',
  'grape', 'region', 'producer_region',
  'description', 'collection', 'source_note', 'producer',
  'rating_source', 'rating_score', 'rating_scale', 'rating_count',
  'rating_found', 'rating_reason',
];

const SELECT_COLUMNS = [
  'id', 'name', 'brand', 'color', 'subcategory', 'category_filter',
  'wine_type', 'grape', 'region', 'producer', 'producer_region',
  'description', 'collection', 'source_note',
  'rating_source', 'rating_found',
];

const OPTIONAL_COLUMNS = [
  'brand', 'grape', 'region', 'producer_region', 'collection',
  'source_note', 'wine_type', 'subcategory',
  'rating_source', 'rating_score', 'rating_scale', 'rating_count',
  'rating_found', 'rating_reason', 'producer',
];

const pad = (value, width) => String(value == null ? '' : value).padEnd(width).slice(0, width);

const detectColumns = async (client) => {
  const { rows } = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'wines'`
  );
  const present = new Set(rows.map((r) => r.column_name));
  const missing = OPTIONAL_COLUMNS.filter((c) => !present.has(c));
  if (missing.length) {
    console.log(`  ! wines table is missing optional columns: ${missing.join(', ')} (will be skipped)`);
  }
  return present;
};

const buildSelect = (present) => {
  const cols = SELECT_COLUMNS
    .filter((c) => present.has(c) || ['id', 'name', 'color', 'description'].includes(c))
    .map((c) => (present.has(c) ? `w.${c}` : `NULL AS ${c}`));
  return `SELECT ${cols.join(', ')} FROM wines w`;
};

const main = async () => {
  const apply = process.argv.includes('--apply');
  await db.initializePool();
  const info = db.getConnectionInfo();
  console.log(`[enrich] ${apply ? 'APPLY' : 'DRY-RUN'} against ${info.isLocal ? 'LOCAL' : info.url}`);

  const client = await db.pool.connect();
  try {
    const present = await detectColumns(client);

    // ---- Load wines ------------------------------------------------------
    const { rows: wines } = await client.query(
      `${buildSelect(present)} ORDER BY name`
    );
    const byExactName = new Map();
    const byKey = new Map();
    for (const w of wines) {
      byExactName.set(w.name.trim(), w);
      byKey.set(normaliseKey(w.name), w);
    }

    // ---- Classify every wine named in the details file -------------------
    const plan = [];
    const missing = [];
    const flagged = [];
    for (const [detailName, detail] of Object.entries(DETAILS)) {
      const wine = byExactName.get(detailName) || byKey.get(normaliseKey(detailName));
      if (!wine) {
        missing.push(detailName);
        continue;
      }
      const facts = classify(wine.brand, wine.name);
      if (facts.confidence === 'low') {
        flagged.push({ name: wine.name, facts });
        continue;
      }
      plan.push({ wine, facts, detail });
    }

    // ---- Dry-run / apply table -------------------------------------------
    console.log('');
    console.log(`${pad('WINE', 48)} ${pad('COLOUR', 22)} ${pad('FILTER', 10)} ${pad('GRAPE', 42)} ${pad('REGION', 28)} ${pad('CONF', 8)} MATCHED`);
    console.log('-'.repeat(180));
    for (const { wine, facts } of plan) {
      console.log(
        `${pad(wine.name, 48)} ${pad(facts.colour, 22)} ${pad(facts.categoryFilter, 10)} ` +
        `${pad(facts.grape, 42)} ${pad(facts.producerRegion, 28)} ${pad(facts.confidence, 8)} ${facts.matchedBy.join(', ')}`
      );
    }

    if (missing.length) {
      console.log(`\n! ${missing.length} description(s) have no matching wine row:`);
      missing.forEach((n) => console.log(`    - ${n}`));
    }
    if (flagged.length) {
      console.log(`\n! ${flagged.length} wine(s) classified LOW confidence — NOT written, review manually:`);
      flagged.forEach(({ name, facts }) => console.log(`    - ${name} (colour=${facts.colour}, region=${facts.producerRegion})`));
    }

    console.log(`\n${plan.length} wine(s) ready, ${flagged.length} flagged, ${missing.length} missing.`);

    if (!apply) {
      console.log('\nDRY-RUN only. Re-run with --apply to write these values.');
      return;
    }

    // ---- Apply -----------------------------------------------------------
    await client.query('BEGIN');
    try {
      let enriched = 0;
      for (const { wine, facts, detail } of plan) {
        const sets = [];
        const params = [];
        const push = (col, value) => {
          params.push(value);
          sets.push(`${col} = $${params.length}`);
        };

        push('color', facts.colour);
        push('subcategory', facts.subcategory);
        push('category_filter', facts.categoryFilter);
        push('wine_type', facts.wineType);
        if (facts.grape) push('grape', facts.grape);
        if (facts.region) push('region', facts.region);
        if (facts.producerRegion) push('producer_region', facts.producerRegion);
        if (!wine.description || wine.description === '') push('description', detail);
        if (present.has('collection') && (!wine.collection || wine.collection === '')) push('collection', 'italian');
        if (present.has('source_note') && (!wine.source_note || wine.source_note === '')) push('source_note', SOURCE_NOTE);
        if (present.has('producer') && (!wine.producer || wine.producer === '')) push('producer', wine.brand);

        // Rating placeholders — only when the row has none yet.
        if (present.has('rating_source') && (!wine.rating_source || wine.rating_source === '')) {
          push('rating_source', 'Not rated');
          if (present.has('rating_score')) push('rating_score', 'Not rated');
          if (present.has('rating_scale')) push('rating_scale', 'N/A');
          if (present.has('rating_count')) push('rating_count', 'N/A');
          if (present.has('rating_found')) push('rating_found', false);
          if (present.has('rating_reason')) push('rating_reason', RATING_REASON);
        }

        params.push(wine.id);
        await client.query(
          `UPDATE wines SET ${sets.join(', ')} WHERE id = $${params.length}`,
          params
        );
        enriched += 1;
      }

      // ---- Normalisation of legacy lowercase values ----------------------
      const norm = async (sql) => {
        const res = await client.query(sql);
        return res.rowCount;
      };
      const normalised = {
        color_red: present.has('color') ? await norm(`UPDATE wines SET color = 'Red' WHERE color = 'red'`) : 0,
        color_white: present.has('color') ? await norm(`UPDATE wines SET color = 'White' WHERE color = 'white'`) : 0,
        color_rose: present.has('color') ? await norm(`UPDATE wines SET color = 'Rosé' WHERE color = 'rose'`) : 0,
        filter_red: await norm(`UPDATE wines SET category_filter = 'RED' WHERE category_filter = 'red'`),
        filter_white: await norm(`UPDATE wines SET category_filter = 'WHITE' WHERE category_filter = 'white'`),
        filter_rose: await norm(`UPDATE wines SET category_filter = 'ROSE' WHERE category_filter = 'rose'`),
      };

      await client.query('COMMIT');

      console.log(`\nEnriched ${enriched} wine(s).`);
      console.log('Normalisation:', JSON.stringify(normalised));

      // ---- Post-apply checks ---------------------------------------------
      const { rows: leftovers } = await client.query(
        `SELECT count(*)::int AS n FROM wines WHERE brand IS NOT NULL AND brand <> '' AND (description IS NULL OR description = '')`
      );
      const { rows: badFilters } = await client.query(
        `SELECT count(*)::int AS n FROM wines WHERE category_filter IN ('wine', 'red', 'white', 'rose')`
      );
      const { rows: badColors } = await client.query(
        `SELECT count(*)::int AS n FROM wines WHERE color IN ('red', 'white', 'rose')`
      );
      console.log(`Branded wines still missing description: ${leftovers[0].n} (expect 0)`);
      console.log(`Rows with legacy lowercase category_filter: ${badFilters[0].n} (expect 0)`);
      console.log(`Rows with legacy lowercase color: ${badColors[0].n} (expect 0)`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } finally {
    client.release();
    await db.closeDatabase();
  }
};

main().catch((err) => {
  console.error('[enrich] failed:', err);
  process.exit(1);
});
