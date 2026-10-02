import { useCallback, useEffect, useMemo, useState } from 'react';

/* Wine Cellar data source.
   The cellar page used to render three JSON files bundled into the frontend,
   which meant an image edited through the admin menu never appeared here. It
   now reads the `wines` table through the same /api/menu endpoint the rest of
   the site uses, and reshapes the rows into the shape the page already renders
   (snake_case rating and price_range_kes objects, producer siblings). */

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/* `rating` arrives as discrete columns; the page reads it as one object with a
   `found` flag, so keep that shape rather than leaking the column layout. */
const toRating = (wine) => {
  if (!wine.ratingFound) return null;
  return {
    source: wine.ratingSource || '',
    score: wine.ratingScore || '',
    scale: wine.ratingScale || '',
    count: wine.ratingCount || '',
    found: true,
    reason: wine.ratingReason || '',
  };
};

/* Price ranges are nullable: unpriced bottles have no range at all, and the page
   hides the block entirely rather than rendering "KES 0". */
const toPriceRange = (wine) => {
  const min = wine.priceMin;
  const max = wine.priceMax;
  if (min === null || min === undefined || max === null || max === undefined) return null;
  return { min: Number(min), max: Number(max) };
};

export const normalizeCellarWine = (wine) => ({
  id: wine.id,
  name: wine.name || '',
  /* The cellar page labels this field `backstory`; the column is `description`,
     which already holds the same prose. */
  backstory: wine.description || '',
  color: wine.color || '',
  category_filter: wine.categoryFilter || '',
  confidence: wine.confidence || '',
  source_note: wine.sourceNote || '',
  grape: wine.grape || '',
  region: wine.region || '',
  producer: wine.producer || '',
  producerRegion: wine.producerRegion || '',
  collection: wine.collection || '',
  image: wine.image || '',
  rating: toRating(wine),
  price_range_kes: toPriceRange(wine),
  cellarOrder: wine.cellarOrder ?? 0,
});

export const useWineCellar = () => {
  const [wines, setWines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      /* `menu_type` is the param the endpoint filters on -- passing `type` is silently
   ignored and the whole payload (food included) comes back. The client-side
   filter below is a second guard so that mistake cannot leak food rows here. */
      const response = await fetch(`${API_URL}/menu?menu_type=wine`);
      if (!response.ok) throw new Error('The wine cellar could not be loaded');
      const data = await response.json();
      /* Keep only wine rows: a server that ignored menu_type would otherwise
         hand back dine-in, take-out and lunchbox items too. */
      const rows = (data.items || []).filter((item) => item.menuType === 'wine');
      setWines(rows.map(normalizeCellarWine));
    } catch (requestError) {
      setError(requestError.message || 'The wine cellar could not be loaded');
      setWines([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* Group into the producer collections the page renders. Ordering follows
     cellar_order, which was captured from the curated JSON sequence during the
     database migration, so the page lists wines in the same order as before. */
  const collections = useMemo(() => {
    const byCollection = new Map();
    for (const wine of wines) {
      const id = wine.collection || 'other';
      if (!byCollection.has(id)) byCollection.set(id, []);
      byCollection.get(id).push(wine);
    }

    const LABELS = {
      italian: { name: 'Italian Wines', icon: '🇮🇹' },
      'south-african': { name: 'South African Wines', icon: '🇿🇦' },
      french: { name: 'French Wines', icon: '🇫🇷' },
      other: { name: 'Other Wines', icon: '🍷' },
    };

    return Array.from(byCollection.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([id, list]) => {
        const sorted = [...list].sort((a, b) => a.cellarOrder - b.cellarOrder);
        const byProducer = new Map();
        for (const wine of sorted) {
          const key = wine.producer || 'Unattributed';
          if (!byProducer.has(key)) byProducer.set(key, []);
          byProducer.get(key).push(wine);
        }
        const producers = Array.from(byProducer.entries()).map(([name, producerWines]) => ({
          producer: name,
          producer_region: producerWines[0].producerRegion || '',
          wines: producerWines.map((wine, index) => ({ ...wine, producerIndex: index })),
        }));
        return { id, ...(LABELS[id] || LABELS.other), producers };
      })
      .filter((collection) => collection.producers.length > 0);
  }, [wines]);

  /* Flatten back out for the card grid, carrying the sibling list and producer
     position so the detail view can page between wines from the same producer
     without re-deriving them. */
  const allWines = useMemo(() => collections.flatMap((collection) => (
    collection.producers.flatMap((producer) => (
      producer.wines.map((wine) => ({ ...wine, siblings: producer.wines, collection: collection.id }))
    ))
  )), [collections]);

  return { wines: allWines, collections, loading, error, reload: load };
};

export default useWineCellar;