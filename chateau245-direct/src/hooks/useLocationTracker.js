import { useState, useEffect, useCallback, useRef } from 'react';

const useLocationTracker = (api, token, enabled = true, intervalMs = 10000) => {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [accuracy, setAccuracy] = useState(null);
  const watchIdRef = useRef(null);
  const intervalRef = useRef(null);

  const sendLocation = useCallback(async (lat, lng, acc) => {
    try {
      const response = await fetch(`${api}/riders/me/location`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      });

      if (!response.ok) throw new Error('Failed to update location');

      console.log(`[GPS] ✓ Location set: ${lat.toFixed(6)}, ${lng.toFixed(6)} (±${Math.round(acc || 0)}m)`);
      setLocation({ latitude: lat, longitude: lng });
      setAccuracy(acc || null);
      setError(null);
    } catch (err) {
      console.error('[GPS] Send error:', err);
      setError(err.message);
    }
  }, [api, token]);

  const handlePosition = useCallback((position) => {
    const { latitude, longitude, accuracy } = position.coords;
    sendLocation(latitude, longitude, accuracy);
  }, [sendLocation]);

  const handleError = useCallback((err) => {
    console.error('[GPS] Error:', err.code, err.message);
    switch (err.code) {
      case 1:
        setError('Location permission denied. Enable in browser/device settings.');
        break;
      case 2:
        setError('Location unavailable. Check device GPS.');
        break;
      case 3:
        setError('GPS timed out. Retrying with low accuracy...');
        break;
      default:
        setError('Could not get location.');
    }
  }, []);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }

    console.log('[GPS] Starting tracking');
    setIsTracking(true);
    setError(null);

    const tryGetLocation = (highAccuracy) => {
      const options = {
        enableHighAccuracy: highAccuracy,
        timeout: highAccuracy ? 10000 : 30000,
        maximumAge: 5000,
      };

      console.log(`[GPS] Trying ${highAccuracy ? 'HIGH' : 'LOW'} accuracy`);

      navigator.geolocation.getCurrentPosition(
        handlePosition,
        (err) => {
          console.error(`[GPS] ${highAccuracy ? 'High' : 'Low'} accuracy failed:`, err.code);
          if (highAccuracy) {
            console.log('[GPS] Retrying with low accuracy...');
            tryGetLocation(false);
          } else {
            handleError(err);
          }
        },
        options
      );
    };

    tryGetLocation(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      () => {},
      { enableHighAccuracy: false, timeout: 30000, maximumAge: 10000 }
    );

    intervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        handlePosition,
        () => {},
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 5000 }
      );
    }, intervalMs);
  }, [handlePosition, handleError, intervalMs]);

  const stopTracking = useCallback(() => {
    setIsTracking(false);
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (enabled && token) {
      startTracking();
    } else {
      stopTracking();
    }
    return () => stopTracking();
  }, [enabled, token, startTracking, stopTracking]);

  return { location, error, isTracking, accuracy, startTracking, stopTracking };
};

export default useLocationTracker;
