/* Hand-written cellar descriptions for the wines on the revised supplier
 * invoice (chateau245-direct/REVISED WINES INVOICE.txt). Keys must match
 * the wines.name column exactly. Facts cross-checked against winery and
 * retailer listings where the invoice carried no region or grape:
 *   - Queen Rhapsody is an organic ROSÉ (Hudson Wine Co., Petite Cellars)
 *   - Astoria Mina is a Sparkling Rosé aged in Scotch whisky barrels
 *   - Rigoloccio Il Sorvegliante is a Maremma Bordeaux-style blend
 *   - Martoccia Poggia Apricale is 85% Sangiovese Grosso / 10% Merlot /
 *     5% Colorino (August Imports tech sheet)
 *   - Borgofulvia is a Piacenza house (Cantine 4 Valli, Emilia-Romagna)
 *   - Idi di Marzo is Villamagna, Abruzzo (Famiglia De Cerchio)
 *
 * Written in the same voice as the existing catalogue backstories: one
 * fact, one character note, no marketing hype. */

module.exports = {
  'Casa Vittorino Prosecco Sup 75cl':
    "Astoria's 'Casa Vittorino' is a Prosecco Superiore from the Conegliano-Valdobbiadene hills — finer bubbles, green apple and white flowers, the house's step up from everyday DOC fizz.",
  'Clamore Sauvignon Blanc Brut 75cl':
    "Astoria's unusual sparkling Sauvignon Blanc — 100% Sauvignon, Charmat method, elderberry and citrus wrapped in fine bubbles. An aperitif that refuses to be ordinary.",
  'Pinot Grigio Alisia DOC 75cl':
    "Astoria's 'Alisia' Pinot Grigio — pear, white peach and a dry, almond-tinged finish. Unfussy and versatile.",
  'Prosecco DOC Treviso Butterfly 75cl':
    "Treviso-grown Glera with fine, persistent fizz — fresh pear, white flowers and a clean, dry finish. The house's easy everyday sparkler.",
  'Prosecco DOC Treviso Rosé 75cl':
    "A pink take on Treviso Prosecco, with Pinot Nero for wild-strawberry colour and red-berry lift. Built for aperitivo.",
  'Prosecco Valdobbiadene Superiore DOCG Brut 75cl':
    "From the hilly Valdobbiadene zone, the top tier of Prosecco — finer bubbles, green apple and honeysuckle, bone-dry in Brut style.",
  'Rosé Veneto Mina IGT 75cl':
    "A Veneto sparkling rosé with a twist — Astoria ages this blend of Cabernet, Marzemino and Merlot in Scotch whisky barrels. Red berry fruit with a lifted, faintly smoky finish.",
  'Suade Sauvignon Blanc IGT 75cl':
    "Still Sauvignon Blanc from the Veneto — gooseberry, citrus peel and a crisp, mineral snap. A lively partner for fish.",
  'Valpolicella Ripasso DOC AS 75cl':
    "Ripasso means the wine is re-fermented over Amarone skins — Valpolicella with added muscle. Sour cherry, spice and a soft, warming finish.",
  'Altotiberini Rosso Bio Cervo Rosso':
    "Organic rosso from the Colli Altotiberini, east of Perugia — Sangiovese-led, with sour cherry, dried herbs and soft tannins.",
  'Umbria Chardonnay Sauvignon IGP 2024 750ml':
    "An Umbrian blend that pairs Chardonnay's weight with Sauvignon Blanc's lift — stone fruit, citrus and a clean, dry finish.",
  'Lambrusco Rosso Dolce IGT 75cl':
    "Piacenza's three-century Ferrari & Perini family makes this best-known export — Emilia's classic lightly sparkling red, in the sweet style. Jammy berry, low tannin; built for cured meats, pizza and company.",
  'Pinot Grigio IGT BF 75cl':
    "Borgofulvia's straight-up Pinot Grigio from Piacenza — citrus, pear and a dry, clean finish. An everyday white that asks nothing of the occasion.",
  "Bianco Terre di Chieti d'Abruzzo IGT 75cl":
    "Trebbiano and Pecorino from Abruzzo's Terre di Chieti — crisp, faintly saline and made for antipasti or grilled fish.",
  'In&Out Montepulciano':
    "From Collefrisio's limited In&Out range — a bold, modern Montepulciano with dark berry fruit and a generous, warming finish.",
  'Montepulciano d\'Abruzzo Semis 15% 75cl':
    "A modern, fruit-forward Montepulciano — black cherry, cocoa and smooth tannins at 15%. Approachable young.",
  'Terre d\'Abruzzo IGT Pecorino 13.5% In&Out':
    "Pecorino from the In&Out line — the grape's signature herbal, saline edge with real texture at 13.5%. Drink with pecorino cheese, naturally.",
  'Perfectly Imperfect Organic Wine 75cl':
    "The 'perfectly imperfect' organic red — a characterful bottling that prefers charm over polish. Ripe dark fruit and soft tannins, made for the table.",
  'Queen Rhapsody Organic Wine 75cl':
    "An organic rosé from the Dominio Imperfetto range — pale pink, red berry fruit and a dry, easy finish. Playful label, unfussy drinking; best served cold with antipasti.",
  'Appassimento Vino Rosso Carnalis 75cl':
    "Idi di Marzo's appassimento red — Montepulciano partially dried before fermentation, in the Amarone manner — concentrated black fruit, dried fig and a velvety, warming finish.",
  'Rosso Terre di Chieti IGT 1910 75cl':
    "The '1910' marks when the De Cerchio family planted its first vines at Villamagna. Organic Montepulciano from Abruzzo's Terre di Chieti — sour cherry, earth, bright acidity. Vegan.",
  'Chianti Classico Maggiolo Bio 75cl 14%':
    "Organic Chianti Classico from Lamole's high hills — Sangiovese with sour cherry, violet and the zone's firm, food-friendly structure.",
  'Vigna Grosoli Chianti Classico Gran Selezione':
    "The top of Lamole's Chianti Classico ladder — a single-vineyard Gran Selezione, Sangiovese with depth, fine tannin and ageing potential.",
  'Montepulciano d\'Abruzzo Incanto 14% 75cl':
    "Marramiero's 'Incanto' — a more polished Montepulciano, with blackberry, liquorice and rounded tannins at 14%.",
  'Montepulciano d\'Abruzzo Marra 75':
    "The 'Marra' bottling — an honest, everyday Montepulciano d'Abruzzo with dark fruit, herbs and an easy finish.",
  'Pecorino Terre d\'Abruzzo Marra':
    "Abruzzo's native Pecorino in Marramiero's Marra line — crisp, herbal and faintly saline; a natural with fried fish or young cheese.",
  'Poggia Apricale Toscana 75cl':
    "The everyday bottling from high-altitude Brunello producer Luca Brunelli — bright, unoaked Toscana rosso built on Sangiovese with Merlot and Colorino. Cherry, sage, warm terracotta.",
  'Corvina Veneto IGT 75cl':
    "Pure Corvina from Monte Tondo — sour cherry, violet and a light, juicy frame. Chill slightly for a picnic red.",
  'Soave DOC Mito 75cl':
    "Monte Tondo's Soave from Garganega — citrus, almond and a mineral snap. The zone's answer to an everyday white.",
  'Valpolicella Ripasso DOC Sup MT 75cl':
    "Monte Tondo's Ripasso — Valpolicella re-fermented on Amarone skins for extra depth; cherry, spice and real grip for the price.",
  'Valpolicella Superiore San Pietro MT 75cl':
    "The 'San Pietro' Valpolicella Superiore — a step up in concentration, with red cherry, herbs and a firm, dry finish.",
  'Negroamaro IGT Puglia Paritaru Organic 75cl':
    "Organic Negroamaro from Pajaru — the grape's signature dark, bitter-cherry profile, savoury and warm.",
  'Nero di Troia IGT Puglia Auru Organic 75cl':
    "Organic Nero di Troia, Puglia's proud native — plum, violet and firm tannin; less known, worth knowing.",
  'Nini Grillo Bianco IGT Terre Siciliane Organic 75cl':
    "'Nini' — organic Grillo, Sicily's white workhorse: citrus, peach and a saline edge. Made for seafood.",
  'Toto Nero d\'Avola IGT Terre Siciliane Organic 75cl':
    "'Toto' — organic Nero d'Avola from Sicily: blackberry, cocoa and warm, sun-ripened fruit in a generous red.",
  'Costa Toscana Rosso Sorvegliante IGT 75cl':
    "'Il Sorvegliante' is named for the foremen of the old mines in the Metalliferous Hills — a coastal Maremma red in the Bordeaux manner, Cabernet with Petit Verdot aged in barrique. Dark berry, Mediterranean scrub, firm tannins.",
  'Salsedine Negroamaro Puglia IGT 75cl':
    "Salsedine's Negroamaro — deep, sun-dried dark fruit with the variety's bitter twist. Puglia in a glass.",
  'Salsedine Primitivo Puglia IGT 75cl':
    "Salsedine's Primitivo — plum jam, spice and a soft, warming finish. Pairs with grilled meats.",
  'Artumes Toscana Bianco IGT 75cl':
    "Tenuta di Artimino's white — Trebbiano and Chardonnay, pear and citrus with a dry, gently creamy finish.",
  'Campo al Rio Toscana IGT 75cl':
    "Artimino's everyday red — Sangiovese with Merlot for roundness; cherry, plum and soft tannins.",
  'Poggilarca Carmignano DOCG 75cl':
    "Carmignano is Tuscany's oldest DOCG and one of the few allowed to blend Cabernet with Sangiovese — Poggilarca is Artimino's expression of that tradition: red cherry, cassis and fine tannin.",
};
