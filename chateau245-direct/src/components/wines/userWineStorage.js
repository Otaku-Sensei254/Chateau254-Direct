const getUserKey = (user) => user?.id || user?.email || null;

const readJson = (key, fallback) => {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

const cellarStorageKey = (user) => {
  const userKey = getUserKey(user);
  return userKey ? `chateau254-cellar:${userKey}` : null;
};

const ratingStorageKey = (user) => {
  const userKey = getUserKey(user);
  return userKey ? `chateau254-wine-ratings:${userKey}` : null;
};

export const getUserCellar = (user) => {
  const key = cellarStorageKey(user);
  if (!key) return [];
  const bottles = readJson(key, []);
  return Array.isArray(bottles) ? bottles : [];
};

export const addWineToUserCellar = (user, wine) => {
  const key = cellarStorageKey(user);
  if (!key) return { ok: false, added: false };
  const bottles = getUserCellar(user);
  if (bottles.some((bottle) => bottle.id === wine.id)) return { ok: true, added: false, bottles };

  const bottle = {
    id: wine.id,
    name: wine.name,
    subname: wine.grape || wine.category_filter || 'Wine',
    color: wine.color || 'Red',
    region: wine.producerRegion || wine.region || '',
    vintage: wine.vintage || '',
    image: wine.image || '',
    addedOn: new Date().toISOString(),
  };
  const nextBottles = [...bottles, bottle];
  const ok = writeJson(key, nextBottles);
  return { ok, added: ok, bottles: ok ? nextBottles : bottles };
};

export const removeWineFromUserCellar = (user, wineId) => {
  const key = cellarStorageKey(user);
  if (!key) return false;
  const bottles = getUserCellar(user);
  return writeJson(key, bottles.filter((bottle) => bottle.id !== wineId));
};

export const getUserWineRating = (user, wineId) => {
  const key = ratingStorageKey(user);
  if (!key) return null;
  const ratings = readJson(key, {});
  return ratings && typeof ratings === 'object' ? ratings[wineId] || null : null;
};

export const saveUserWineRating = (user, wineId, score) => {
  const key = ratingStorageKey(user);
  if (!key) return false;
  const ratings = readJson(key, {});
  return writeJson(key, { ...ratings, [wineId]: { score, updatedAt: new Date().toISOString() } });
};
