/* Server-side cellar + wine ratings. Every call takes the session token;
   all functions throw on non-2xx so callers can decide between an error
   toast and the localStorage fallback. */

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const headers = (token) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

const request = async (path, options, token) => {
  const response = await fetch(`${API_URL}${path}`, { ...options, headers: headers(token) });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json();
};

export const fetchCellar = async (token) => {
  const data = await request('/cellar', {}, token);
  return data.bottles || [];
};

export const addBottle = (token, wineId) => request('/cellar', {
  method: 'POST',
  body: JSON.stringify({ wine_id: wineId }),
}, token);

export const removeBottle = async (token, wineId) => {
  const data = await request(`/cellar/${wineId}`, { method: 'DELETE' }, token);
  return Boolean(data.removed);
};

/* One-time move of bottles an older build kept in this browser's localStorage. */
export const importBottles = (token, wineIds) => request('/cellar/import', {
  method: 'POST',
  body: JSON.stringify({ wine_ids: wineIds }),
}, token);

export const fetchMyRatings = async (token) => {
  const data = await request('/cellar/ratings', {}, token);
  return data.ratings || {};
};

export const saveRating = (token, wineId, score) => request('/cellar/ratings', {
  method: 'POST',
  body: JSON.stringify({ wine_id: wineId, score }),
}, token);
