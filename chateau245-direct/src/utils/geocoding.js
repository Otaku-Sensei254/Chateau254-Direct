const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

const geocodeCache = new Map();

export const geocodeAddress = async (address) => {
  const cacheKey = address.toLowerCase().trim();
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }

  try {
    const response = await fetch(
      `${NOMINATIM_BASE_URL}/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=ke`,
      {
        headers: {
          'User-Agent': 'Chateau254-Delivery-App/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Geocoding request failed');
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      return null;
    }

    const result = {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
      displayName: data[0].display_name,
    };

    geocodeCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
};

export const reverseGeocode = async (latitude, longitude) => {
  const cacheKey = `${latitude},${longitude}`;
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }

  try {
    const response = await fetch(
      `${NOMINATIM_BASE_URL}/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Chateau254-Delivery-App/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Reverse geocoding request failed');
    }

    const data = await response.json();

    if (!data || !data.display_name) {
      return null;
    }

    const result = {
      address: data.display_name,
      latitude: parseFloat(data.lat),
      longitude: parseFloat(data.lon),
    };

    geocodeCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
};

export const getRouteFromOSRM = async (startLat, startLng, endLat, endLng) => {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Route calculation failed');
    }

    const data = await response.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      return null;
    }

    const route = data.routes[0];
    return {
      geometry: route.geometry,
      distance: route.distance,
      duration: route.duration,
      steps: route.legs[0]?.steps || [],
    };
  } catch (error) {
    console.error('OSRM routing error:', error);
    return null;
  }
};

export const getMultiStopRoute = async (coordinates) => {
  if (coordinates.length < 2) {
    return null;
  }

  try {
    const coordString = coordinates
      .map((coord) => `${coord.longitude},${coord.latitude}`)
      .join(';');

    const url = `https://router.project-osrm.org/trip/v1/driving/${coordString}?overview=full&geometries=geojson&steps=true&source=first`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Multi-stop route calculation failed');
    }

    const data = await response.json();

    if (data.code !== 'Ok' || !data.trips || data.trips.length === 0) {
      return null;
    }

    const trip = data.trips[0];
    return {
      geometry: trip.geometry,
      distance: trip.distance,
      duration: trip.duration,
      legs: trip.legs.map((leg) => ({
        distance: leg.distance,
        duration: leg.duration,
        steps: leg.steps || [],
      })),
      waypoints: data.waypoints || [],
    };
  } catch (error) {
    console.error('OSRM trip error:', error);
    return null;
  }
};
