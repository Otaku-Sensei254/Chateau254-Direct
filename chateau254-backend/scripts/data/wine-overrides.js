/* Curated facts for invoice wines whose names carry no grape or region
 * information, plus a few where the generic rules would be less precise
 * than what the winery publishes. Keys are normaliseKey(name) output —
 * lowercase, alphanumeric only. See scripts/lib/classify-wine.js.
 *
 * Every entry may set: colour, grape, producerRegion, region.
 * producerRegion follows the house convention "<Area>, Italy" (region is
 * derived as producerRegion + ", Italy" when region is omitted). */

module.exports = {
  // Dominio Imperfetto (spelled "Domino Imperfetto" on the invoice).
  // Queen Rhapsody is listed by importers as an ORGANIC ROSÉ, not a red
  // (Hudson Wine Co., Petite Cellars). Origin not yet confirmed.
  'queen rhapsody organic wine 75cl': {
    colour: 'Rosé',
    grape: null,
    producerRegion: 'Italy (unconfirmed)',
  },
  'perfectly imperfect organic wine 75cl': {
    colour: 'Red',
    grape: null,
    producerRegion: 'Italy (unconfirmed)',
  },

  // Idi di Marzo — Villamagna, Abruzzo (Famiglia De Cerchio).
  'appassimento vino rosso carnalis 75cl': {
    colour: 'Red',
    grape: 'Montepulciano',
    producerRegion: 'Abruzzo, Italy',
  },

  // Astoria Mina — Veneto sparkling rosé aged in Scotch whisky barrels;
  // grapes published by retailers (Spirit House): Cabernet Franc,
  // Cabernet Sauvignon, Marzemino, Merlot.
  'rose veneto mina igt 75cl': {
    colour: 'Sparkling Rosé',
    grape: 'Cabernet Franc, Cabernet Sauvignon, Marzemino, Merlot',
    producerRegion: 'Veneto, Italy',
  },

  // Blasi Cantina — Umbertide, Umbria (house JSON producer_region).
  'umbria chardonnay sauvignon igp 2024 750ml': {
    colour: 'White',
    grape: 'Chardonnay, Sauvignon Blanc',
    producerRegion: 'Umbertide, Umbria, Italy',
  },
  'altotiberini rosso bio cervo rosso': {
    colour: 'Red',
    grape: 'Sangiovese',
    producerRegion: 'Umbertide, Umbria, Italy',
  },

  // Collefrisio — the "bianco" of Terre di Chieti is Trebbiano/Pecorino,
  // NOT the Montepulciano the appellation rule would otherwise imply.
  'bianco terre di chieti d abruzzo igt 75cl': {
    colour: 'White',
    grape: 'Trebbiano, Pecorino',
    producerRegion: 'Abruzzo, Italy',
  },

  // Martoccia (Luca Brunelli, Montalcino) — tech sheet: 85% Sangiovese
  // Grosso, 10% Merlot, 5% Colorino (August Imports).
  'poggia apricale toscana 75cl': {
    colour: 'Red',
    grape: 'Sangiovese, Merlot, Colorino',
    producerRegion: 'Montalcino, Tuscany, Italy',
  },

  // Tenuta di Artimino.
  'campo al rio toscana igt 75cl': {
    colour: 'Red',
    grape: 'Sangiovese, Merlot',
    producerRegion: 'Tuscany, Italy',
  },
  'artumes toscana bianco igt 75cl': {
    colour: 'White',
    grape: 'Trebbiano, Chardonnay',
    producerRegion: 'Tuscany, Italy',
  },

  // Rigoloccio "Il Sorvegliante" — Maremma, Bordeaux-style blend
  // (Cabernet Sauvignon, Cabernet Franc, Petit Verdot, Merlot per
  // winery listings; NOT Sangiovese).
  'costa toscana rosso sorvegliante igt 75cl': {
    colour: 'Red',
    grape: 'Cabernet Sauvignon, Cabernet Franc, Petit Verdot, Merlot',
    producerRegion: 'Maremma, Tuscany, Italy',
  },
};
