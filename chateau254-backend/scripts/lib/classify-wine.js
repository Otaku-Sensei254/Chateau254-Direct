/* Rule-based classifier for Italian wine names coming off supplier invoices.
 *
 * classify(brand, name) derives the catalogue fields the cellar page shows —
 * colour, subcategory, category_filter, wine_type, grape, region and
 * producer_region — from tokens in the wine name, with a small curated
 * override table for labels that carry no geographic or varietal information.
 *
 * Precedence for every field:
 *   1. OVERRIDES (exact wine name, see scripts/data/wine-overrides.js)
 *   2. Special-case signals (lambrusco, sparkling, rosé, bianco/rosso)
 *   3. Known grape tokens (also supply region when the grape is regional)
 *   4. Appellation tokens (Chianti, Valpolicella, Terre di Chieti, ...)
 *   5. Zone tokens (Puglia, Toscana, Veneto, ...)
 *   6. Brand fallback region (BRAND_PRODUCER_REGION)
 *
 * confidence: 'override' | 'high' | 'medium' | 'low'
 *   high   — colour + grape + region all derived from the name
 *   medium — colour + region derived, grape unknown
 *   low    — something essential missing; the enrich script flags these
 *            for manual review instead of writing them silently
 */

const OVERRIDES = require('../data/wine-overrides');

/* Display conventions copied from the existing catalogue rows:
 *   producer_region = "<Area>, Italy"
 *   region          = "<Area>, Italy, Italy"   (producer_region + country) */

const COLOUR_META = {
  Red:                    { subcategory: 'Red',     categoryFilter: 'RED' },
  White:                  { subcategory: 'White',   categoryFilter: 'WHITE' },
  'Rosé':                 { subcategory: 'Rosé',    categoryFilter: 'ROSE' },
  Sparkling:              { subcategory: 'Sparkling', categoryFilter: 'SPARKLING' },
  'Sparkling Rosé':       { subcategory: 'Sparkling', categoryFilter: 'SPARKLING' },
  'Red (lightly sparkling)': { subcategory: 'Red',  categoryFilter: 'SPARKLING' },
};

/* Order matters: 'nero di troia' before 'nero d avola'-style tokens is
 * handled by checking longer/more specific patterns first where needed. */
/* Patterns are matched against normaliseKey(name), so they contain no
 * apostrophes or punctuation ("nero d avola", not "nero d'avola"). */
const GRAPES = [
  { pattern: 'nero di troia',       grape: 'Nero di Troia',        colour: 'Red',   area: 'Puglia' },
  { pattern: 'nero d avola',        grape: "Nero d'Avola",         colour: 'Red',   area: 'Sicily' },
  { pattern: 'negroamaro',          grape: 'Negroamaro',           colour: 'Red',   area: 'Puglia' },
  { pattern: 'primitivo',           grape: 'Primitivo',            colour: 'Red',   area: 'Puglia' },
  { pattern: 'montepulciano',       grape: 'Montepulciano',        colour: 'Red',   area: null },
  { pattern: 'sangiovese',          grape: 'Sangiovese',           colour: 'Red',   area: 'Tuscany' },
  { pattern: 'corvina',             grape: 'Corvina',              colour: 'Red',   area: 'Veneto' },
  { pattern: 'lambrusco',           grape: 'Lambrusco',            colour: 'Red (lightly sparkling)', area: 'Emilia-Romagna' },
  { pattern: 'pecorino',            grape: 'Pecorino',             colour: 'White', area: 'Abruzzo' },
  { pattern: 'trebbiano',           grape: 'Trebbiano',            colour: 'White', area: 'Abruzzo' },
  { pattern: 'grillo',              grape: 'Grillo',               colour: 'White', area: 'Sicily' },
  { pattern: 'garganega',           grape: 'Garganega',            colour: 'White', area: 'Veneto' },
  { pattern: 'chardonnay',          grape: 'Chardonnay',           colour: 'White', area: null },
  { pattern: 'sauvignon blanc',     grape: 'Sauvignon Blanc',      colour: 'White', area: null },
  { pattern: 'sauvignon',           grape: 'Sauvignon Blanc',      colour: 'White', area: null },
  { pattern: 'pinot grigio',        grape: 'Pinot Grigio',         colour: 'White', area: null },
  { pattern: 'moscato giallo',      grape: 'Moscato Giallo',       colour: 'White', area: 'Trentino' },
  { pattern: 'glera',               grape: 'Glera',                colour: 'Sparkling', area: 'Veneto' },
];

/* Appellations supply grape + colour + area together. A more specific
 * appellation (Chianti Classico) should be listed before a broader one
 * if both would match the same name. */
const APPELLATIONS = [
  { pattern: 'amarone',             grape: 'Corvina, Rondinella (dried-grape blend)', colour: 'Red', area: 'Veneto' },
  { pattern: 'valpolicella',        grape: 'Corvina, Rondinella',                      colour: 'Red', area: 'Veneto' },
  { pattern: 'soave',               grape: 'Garganega',                                colour: 'White', area: 'Veneto' },
  { pattern: 'prosecco',            grape: 'Glera',                                    colour: 'Sparkling', area: 'Veneto' },
  { pattern: 'valdobbiadene',       grape: 'Glera',                                    colour: 'Sparkling', area: 'Veneto' },
  { pattern: 'chianti',             grape: 'Sangiovese',                               colour: 'Red', area: 'Tuscany' },
  { pattern: 'carmignano',          grape: 'Sangiovese, Cabernet',                     colour: 'Red', area: 'Tuscany' },
  { pattern: 'montalcino',          grape: 'Sangiovese',                               colour: 'Red', area: 'Tuscany' },
  { pattern: 'terre di chieti',     grape: 'Montepulciano',                            colour: 'Red', area: 'Abruzzo' },
  { pattern: 'terre d abruzzo',     grape: 'Montepulciano',                            colour: 'Red', area: 'Abruzzo' },
  { pattern: 'altotiberini',        grape: 'Sangiovese',                               colour: 'Red', area: 'Umbria' },
];

/* Zones only contribute an area (and a default colour when nothing else
 * has decided one). More specific zones first. */
const ZONES = [
  { pattern: 'maremma',       area: 'Maremma, Tuscany', defaultColour: 'Red' },
  { pattern: 'montalcino',    area: 'Montalcino, Tuscany', defaultColour: 'Red' },
  { pattern: 'toscana',       area: 'Tuscany', defaultColour: 'Red' },
  { pattern: 'tuscany',       area: 'Tuscany', defaultColour: 'Red' },
  { pattern: 'chianti',       area: 'Tuscany', defaultColour: 'Red' },
  { pattern: 'carmignano',    area: 'Tuscany', defaultColour: 'Red' },
  { pattern: 'umbria',        area: 'Umbria', defaultColour: null },
  { pattern: 'altotiberini',  area: 'Umbria', defaultColour: 'Red' },
  { pattern: 'puglia',        area: 'Puglia', defaultColour: 'Red' },
  { pattern: 'abruzzo',       area: 'Abruzzo', defaultColour: 'Red' },
  { pattern: 'terre di chieti', area: 'Abruzzo', defaultColour: 'Red' },
  { pattern: 'terre siciliane', area: 'Sicily', defaultColour: null },
  { pattern: 'sicilia',       area: 'Sicily', defaultColour: null },
  { pattern: 'sicily',        area: 'Sicily', defaultColour: null },
  { pattern: 'veneto',        area: 'Veneto', defaultColour: 'Red' },
  { pattern: 'valpolicella',  area: 'Veneto', defaultColour: 'Red' },
  { pattern: 'prosecco',      area: 'Veneto', defaultColour: 'Sparkling' },
  { pattern: 'valdobbiadene', area: 'Veneto', defaultColour: 'Sparkling' },
  { pattern: 'soave',         area: 'Veneto', defaultColour: 'White' },
  { pattern: 'treviso',       area: 'Veneto', defaultColour: 'Sparkling' },
  { pattern: 'emilia',        area: 'Emilia-Romagna', defaultColour: 'Red' },
  { pattern: 'romagna',       area: 'Emilia-Romagna', defaultColour: 'Red' },
  { pattern: 'piacenza',      area: 'Emilia-Romagna', defaultColour: null },
  { pattern: 'lambrusco',     area: 'Emilia-Romagna', defaultColour: 'Red (lightly sparkling)' },
];

/* Brand fallback when the name itself says nothing. Values mirror the
 * producer_region convention used by the existing cellar rows. */
const BRAND_PRODUCER_REGION = {
  astoria: 'Veneto, Italy',
  'blasi cantina': 'Umbertide, Umbria, Italy',
  borgofulvia: 'Emilia-Romagna, Italy',
  collefrisio: 'Abruzzo, Italy',
  'domino imperfetto': null, // origin unconfirmed — see overrides
  'idi di marzo': 'Abruzzo, Italy',
  lamole: 'Tuscany, Italy',
  marramiero: 'Abruzzo, Italy',
  martoccia: 'Montalcino, Tuscany, Italy',
  'monte tondo': 'Veneto, Italy',
  pajaru: 'Puglia, Italy',
  'peri peri': 'Sicily, Italy',
  rigoloccio: 'Maremma, Tuscany, Italy',
  salsedine: 'Puglia, Italy',
  'tenuta di artimino': 'Tuscany, Italy',
  'cantine truentum': 'Abruzzo, Italy',
  'castel firmian': 'Trentino, Italy',
};

const normaliseKey = (value) => String(value || '')
  .normalize('NFD')                       // decompose accents: é -> e + ́
  .replace(/[̀-ͯ]/g, '')        // strip combining marks
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const SPARKLING_SIGNALS = ['brut', 'spumante', 'prosecco', 'frizzante', 'valdobbiadene', 'sparkling'];

const toDisplayArea = (area) => {
  if (!area) return null;
  // Areas that already carry a comma (e.g. "Maremma, Tuscany") still just
  // get the country appended for producer_region.
  return `${area}, Italy`;
};

const classify = (brand, name) => {
  const key = normaliseKey(name);
  const brandKey = normaliseKey(brand);

  const matchedBy = [];

  // ---- 1. Curated overrides --------------------------------------------
  if (OVERRIDES[key]) {
    const o = OVERRIDES[key];
    const colour = o.colour;
    const meta = COLOUR_META[colour];
    return {
      colour,
      subcategory: meta.subcategory,
      categoryFilter: meta.categoryFilter,
      wineType: colour,
      grape: o.grape || null,
      region: o.region !== undefined ? o.region : (o.producerRegion ? `${o.producerRegion}, Italy` : null),
      producerRegion: o.producerRegion || null,
      confidence: 'override',
      matchedBy: ['override'],
    };
  }

  // ---- 2. Colour signals from the name ---------------------------------
  let colour = null;
  const hasLambrusco = key.includes('lambrusco');
  const hasSparklingSignal = SPARKLING_SIGNALS.some((s) => key.includes(s));
  const hasRoseSignal = /\b(rose|rosé|rosato)\b/.test(key) || key.includes(' rosé') || key.includes(' rose ');
  const hasBiancoSignal = key.includes('bianco') || key.includes('bianca');
  const hasRossoSignal = key.includes('rosso') || key.includes('rossa');

  if (hasLambrusco) {
    colour = 'Red (lightly sparkling)';
    matchedBy.push('lambrusco');
  } else if (hasSparklingSignal && hasRoseSignal) {
    colour = 'Sparkling Rosé';
    matchedBy.push('sparkling+rose');
  } else if (hasSparklingSignal) {
    colour = 'Sparkling';
    matchedBy.push('sparkling');
  } else if (hasRoseSignal) {
    colour = 'Rosé';
    matchedBy.push('rose');
  }

  // ---- 3. Grapes --------------------------------------------------------
  let grape = null;
  let grapeArea = null;
  for (const g of GRAPES) {
    if (key.includes(g.pattern)) {
      if (!grape) { grape = g.grape; matchedBy.push(`grape:${g.grape}`); }
      if (!grapeArea && g.area) grapeArea = g.area;
      if (!colour) colour = g.colour;
    }
  }
  // Two different grapes found (e.g. "chardonnay sauvignon") — join them.
  if (grape) {
    const extras = GRAPES.filter((g) => key.includes(g.pattern) && g.grape !== grape)
      .map((g) => g.grape);
    if (extras.length) grape = [grape, ...new Set(extras)].join(', ');
  }

  // bianco/rosso resolve colour when nothing more specific has decided,
  // but never downgrade a grape-derived "Red (lightly sparkling)".
  if (!colour && hasBiancoSignal) { colour = 'White'; matchedBy.push('bianco'); }
  if (!colour && hasRossoSignal) { colour = 'Red'; matchedBy.push('rosso'); }

  // ---- 4. Appellations --------------------------------------------------
  let appellationArea = null;
  for (const a of APPELLATIONS) {
    if (key.includes(a.pattern)) {
      if (!grape) { grape = a.grape; matchedBy.push(`appellation:${a.pattern}`); }
      if (!appellationArea && a.area) appellationArea = a.area;
      if (!colour) colour = a.colour;
      break;
    }
  }

  // ---- 5. Zones ---------------------------------------------------------
  let zoneArea = null;
  for (const z of ZONES) {
    if (key.includes(z.pattern)) {
      if (!zoneArea && z.area) zoneArea = z.area;
      if (!colour && z.defaultColour) { colour = z.defaultColour; matchedBy.push(`zone:${z.pattern}`); }
      break;
    }
  }

  // ---- 6. Brand fallback ------------------------------------------------
  let producerRegion = null;
  const mostSpecificArea = appellationArea || grapeArea || zoneArea;
  if (mostSpecificArea) {
    producerRegion = toDisplayArea(mostSpecificArea);
  } else if (BRAND_PRODUCER_REGION[brandKey]) {
    producerRegion = BRAND_PRODUCER_REGION[brandKey];
    matchedBy.push('brand');
  }

  if (!colour) {
    // Last resort: nothing in the name or brand tells us the colour.
    colour = null;
  }

  const meta = colour ? COLOUR_META[colour] : null;

  // ---- Confidence -------------------------------------------------------
  let confidence;
  if (colour && grape && producerRegion) confidence = 'high';
  else if (colour && producerRegion) confidence = 'medium';
  else confidence = 'low';

  return {
    colour,
    subcategory: meta ? meta.subcategory : null,
    categoryFilter: meta ? meta.categoryFilter : null,
    wineType: colour,
    grape,
    region: producerRegion ? `${producerRegion}, Italy` : null,
    producerRegion,
    confidence,
    matchedBy,
  };
};

module.exports = { classify, COLOUR_META, normaliseKey };
