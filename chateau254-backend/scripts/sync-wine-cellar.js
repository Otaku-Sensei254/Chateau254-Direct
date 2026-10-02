/* Backfills the Wine Cellar catalogue columns from the JSON files that used to
 * be bundled into the frontend, and inserts any cellar wine missing from the
 * database.
 *
 * Run with:
 *   DB_MODE=neon node scripts/sync-wine-cellar.js
 *   DB_MODE=local node scripts/sync-wine-cellar.js
 *
 * Admin-managed columns are never written: image_url, description, price,
 * is_available, on_offer, offer, tasting_notes, wine_type, region, category,
 * subcategory and order_index all keep whatever the database already holds.
 * Only the columns added by 2026-10-03-wine-cellar-fields.sql are written, so
 * an image edited through the admin menu survives every re-run.
 *
 * Safe to re-run: updates are matched by normalised wine name and inserts are
 * skipped when the name is already present.
 */

const path = require('path');
const fs = require('fs');

const COLLECTIONS = [
  { id: 'italian', label: 'Italy', file: 'italian_wines_producer_grouped.json' },
  { id: 'south-african', label: 'South Africa', file: 'chateau_south_african_wines.json' },
  { id: 'french', label: 'France', file: 'chateau_french_wines.json' },
];

/* "Collefrisio Primitivo", "collefrisio  primitivo" and "Collefrisio Primitivo "
 * are the same bottle. The JSON and the database spell a few names differently
 * (punctuation, doubled commas, stray whitespace), so matching on a normalised
 * key is what lets 109 of 112 rows pair up. */
const normalise = (value) => String(value || '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

/* Price ranges arrive as numbers for most wines but the string "Not available"
 * for unpriced bottles, so anything non-numeric becomes NULL rather than 0 --
 * a zero would render as "KES 0" on the card. */
const toNumeric = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const toText = (value) => {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s === '' ? null : s;
};

const loadCellarWines = () => {
  const dataDir = path.resolve(__dirname, '../../chateau245-direct/src/components/data');
  const rows = [];

  for (const collection of COLLECTIONS) {
    const file = path.join(dataDir, collection.file);
    if (!fs.existsSync(file)) {
      console.warn(`  ! missing ${collection.file}, skipping ${collection.label}`);
      continue;
    }
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const producer of parsed.producers || []) {
      for (const [index, wine] of (producer.wines || []).entries()) {
        rows.push({
          name: wine.name,
          producer: producer.producer,
          producerRegion: producer.producer_region,
          collection: collection.id,
          color: wine.color,
          categoryFilter: wine.category_filter,
          confidence: wine.confidence,
          sourceNote: wine.source_note,
          ratingSource: wine.rating?.source,
          ratingScore: wine.rating?.score,
          ratingScale: wine.rating?.scale,
          ratingCount: wine.rating?.count,
          ratingFound: typeof wine.rating?.found === 'boolean' ? wine.rating.found : null,
          ratingReason: wine.rating?.reason,
          priceMin: wine.price_range_kes?.min,
          priceMax: wine.price_range_kes?.max,
          image: wine.image,
          cellarOrder: index,
        });
      }
    }
  }
  return rows;
};

const run = async () => {
  const db = require('../config/db');
  await db.initializePool();

  const cellarWines = loadCellarWines();
  console.log(`cellar wines parsed from JSON: ${cellarWines.length}`);

  const existing = await db.query('select id, name, image_url from wines');
  const byName = new Map(existing.rows.map((row) => [normalise(row.name), row]));

  let updated = 0;
  let inserted = 0;
  let unmatched = 0;

  /* Only the new catalogue columns appear here. image_url and the other
   * admin-managed fields are deliberately absent, so an image edited through the
   * admin menu is never reverted by a re-run. Keeping this as an ordered
   * [column, value] list means the SET clause and the bind parameters are built
   * from the same source and cannot drift out of step. */
  const asFields = (w) => [
    ['producer', toText(w.producer)],
    ['producer_region', toText(w.producerRegion)],
    ['collection', toText(w.collection)],
    ['color', toText(w.color)],
    ['category_filter', toText(w.categoryFilter)],
    ['confidence', toText(w.confidence)],
    ['source_note', toText(w.sourceNote)],
    ['rating_source', toText(w.ratingSource)],
    ['rating_score', toText(w.ratingScore)],
    ['rating_scale', toText(w.ratingScale)],
    ['rating_count', toText(w.ratingCount)],
    ['rating_found', w.ratingFound],
    ['rating_reason', toText(w.ratingReason)],
    ['price_min', toNumeric(w.priceMin)],
    ['price_max', toNumeric(w.priceMax)],
    ['cellar_order', w.cellarOrder],
  ];

  for (const wine of cellarWines) {
    const match = byName.get(normalise(wine.name));
    const fields = asFields(wine);

    if (match) {
      // $1 is the id, so each catalogue field starts at $2.
      const assignments = fields.map(([column], i) => `${column} = $${i + 2}`).join(', ');
      const r = await db.query(
        `update wines set ${assignments} where id = $1`,
        [match.id, ...fields.map(([, value]) => value)],
      );
      if (r.rowCount) updated++;
      continue;
    }

    /* Not in the database. Insert the catalogue fields and leave the
     * operational ones at their starting values -- price 0, is_available true,
     * on_offer false -- so an admin still has to price it and confirm
     * availability. `price` is NOT NULL with no column default, so it has to be
     * supplied explicitly.
     *
     * image_url is carried over here but deliberately not in the update path
     * above: a row we are creating has no admin edit to protect, whereas an
     * existing row may have a freshly uploaded R2 image. Two of the three
     * original entries point at Wikimedia search URLs rather than real files;
     * the cellar page already detects those and draws a fallback bottle. */
    const columns = [
      'name', ...fields.map(([column]) => column), 'image_url', 'price', 'is_available', 'on_offer',
    ];
    const values = [
      '$1', ...fields.map((_, i) => `$${i + 2}`), `$${fields.length + 2}`, '0', 'true', 'false',
    ];
    const r = await db.query(
      `insert into wines (${columns.join(', ')}) values (${values.join(', ')}) on conflict do nothing`,
      [wine.name, ...fields.map(([, value]) => value), toText(wine.image)],
    );
    if (r.rowCount) {
      inserted++;
      console.log(`  + inserted: ${wine.name}`);
    } else {
      unmatched++;
      console.log(`  ! could not insert: ${wine.name}`);
    }
  }

  const after = await db.query(
    `select count(*)::int as total,
            count(image_url)::int as with_image,
            count(*) filter (where collection is not null)::int as with_cellar
       from wines`,
  );
  console.log('\nresult:', JSON.stringify(after.rows[0]));
  console.log(`updated ${updated}, inserted ${inserted}, skipped ${unmatched}`);

  await db.closeDatabase();
};

run().catch((error) => {
  console.error('sync-wine-cellar failed:', error.message);
  process.exit(1);
});