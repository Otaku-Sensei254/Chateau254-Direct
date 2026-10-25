import { useEffect, useState, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FiMapPin, FiCrosshair, FiMaximize2, FiMinimize2, FiLayers } from 'react-icons/fi';
import { getRouteFromOSRM } from '../utils/geocoding';

const createRiderMarker = () => L.divIcon({
  className: 'custom-rider-icon',
  html: `
    <div class="rider-marker-pin">
      <div class="rider-marker-pulse"></div>
      <div class="rider-marker-core">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="3 11 22 2 13 21 11 13 3 11"/>
        </svg>
      </div>
    </div>
  `,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
});

const createCustomerMarker = () => L.divIcon({
  className: 'custom-customer-icon',
  html: `
    <div class="dest-marker-pin">
      <div class="dest-marker-badge">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      </div>
      <div class="dest-marker-shadow"></div>
    </div>
  `,
  iconSize: [38, 38],
  iconAnchor: [19, 32],
});

const createRestaurantMarker = () => L.divIcon({
  className: 'custom-restaurant-icon',
  html: `
    <div class="dest-marker-pin">
      <div class="dest-marker-badge" style="background: var(--brand, #761329);">
        <span style="font-size: 15px; font-weight: bold; line-height: 1;">♜</span>
      </div>
      <div class="dest-marker-shadow"></div>
    </div>
  `,
  iconSize: [38, 38],
  iconAnchor: [19, 32],
});

const riderIcon = createRiderMarker();
const customerIcon = createCustomerMarker();
const restaurantIcon = createRestaurantMarker();

const MapController = ({ riderLocation, customerLocation, recenterSignal, fitBoundsSignal }) => {
  const map = useMap();

  useEffect(() => {
    if (riderLocation && customerLocation) {
      const bounds = L.latLngBounds([
        [riderLocation.latitude, riderLocation.longitude],
        [customerLocation.latitude, customerLocation.longitude],
      ]);
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 16 });
    } else if (riderLocation) {
      map.setView([riderLocation.latitude, riderLocation.longitude], 15);
    } else if (customerLocation) {
      map.setView([customerLocation.latitude, customerLocation.longitude], 15);
    }
  }, [riderLocation, customerLocation, map]);

  useEffect(() => {
    if (!recenterSignal || !riderLocation) return;
    map.flyTo([riderLocation.latitude, riderLocation.longitude], 16, { duration: 0.6 });
  }, [recenterSignal, riderLocation, map]);

  useEffect(() => {
    if (!fitBoundsSignal) return;
    if (riderLocation && customerLocation) {
      const bounds = L.latLngBounds([
        [riderLocation.latitude, riderLocation.longitude],
        [customerLocation.latitude, customerLocation.longitude],
      ]);
      map.flyToBounds(bounds, { padding: [48, 48], maxZoom: 16, duration: 0.6 });
    }
  }, [fitBoundsSignal, riderLocation, customerLocation, map]);

  return null;
};

const RiderMap = ({
  riderLocation,
  customerLocation,
  restaurantLocation,
  orderAddress,
  onRouteCalculated,
}) => {
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [recenterSignal, setRecenterSignal] = useState(0);
  const [fitBoundsSignal, setFitBoundsSignal] = useState(0);

  const calculateRoute = useCallback(async () => {
    if (!riderLocation?.latitude || !customerLocation?.latitude) return;

    setLoading(true);
    try {
      const routeData = await getRouteFromOSRM(
        riderLocation.latitude,
        riderLocation.longitude,
        customerLocation.latitude,
        customerLocation.longitude
      );
      setRoute(routeData);
      if (onRouteCalculated && routeData) {
        onRouteCalculated(routeData);
      }
    } catch (error) {
      console.error('Failed to calculate route:', error);
    } finally {
      setLoading(false);
    }
  }, [riderLocation, customerLocation, onRouteCalculated]);

  useEffect(() => {
    calculateRoute();
  }, [calculateRoute]);

  const defaultCenter = useMemo(() => {
    if (riderLocation?.latitude && riderLocation?.longitude) {
      return [riderLocation.latitude, riderLocation.longitude];
    }
    if (customerLocation?.latitude && customerLocation?.longitude) {
      return [customerLocation.latitude, customerLocation.longitude];
    }
    return [-1.2921, 36.8219]; // Default Nairobi
  }, [riderLocation, customerLocation]);

  const routeCoordinates = useMemo(() => {
    return route?.geometry?.coordinates?.map((coord) => [coord[1], coord[0]]) || [];
  }, [route]);

  const formatDistance = (meters) => {
    if (!meters) return '—';
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(meters)} m`;
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '—';
    const mins = Math.round(seconds / 60);
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remainMins = mins % 60;
      return `${hours}h ${remainMins}m`;
    }
    return `${mins} min`;
  };

  return (
    <div className={`rider-map-card ${isFullscreen ? 'fullscreen' : ''}`}>
      {!riderLocation && !customerLocation && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', background: 'var(--surface-sunken)',
          color: 'var(--text-soft)', zIndex: 1000, gap: '10px',
        }}>
          <FiMapPin size={32} color="var(--gold-deep)" />
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-strong)' }}>Acquiring Live Coordinates...</div>
          <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>Waiting for rider GPS or delivery destination</div>
        </div>
      )}

      {/* Floating in-map HUD chip */}
      {route && (
        <div className="rider-map-hud-chip">
          <div className="rider-hud-stat">
            <span className="val">{formatDistance(route.distance)}</span>
            <span className="lbl">Distance</span>
          </div>
          <div className="rider-hud-divider" />
          <div className="rider-hud-stat">
            <span className="val">{formatDuration(route.duration)}</span>
            <span className="lbl">Est. Time</span>
          </div>
          {loading && (
            <div style={{ fontSize: '11px', color: 'var(--gold-deep)', fontWeight: 600 }}>
              Updating...
            </div>
          )}
        </div>
      )}

      {/* Floating control buttons */}
      <div className="rider-map-control-group">
        {riderLocation && (
          <button
            type="button"
            className="rider-map-ctrl-btn"
            onClick={() => setRecenterSignal((s) => s + 1)}
            title="Recenter on my location"
            aria-label="Recenter on my location"
          >
            <FiCrosshair size={18} />
          </button>
        )}
        {riderLocation && customerLocation && (
          <button
            type="button"
            className="rider-map-ctrl-btn"
            onClick={() => setFitBoundsSignal((s) => s + 1)}
            title="Fit route to screen"
            aria-label="Fit route to screen"
          >
            <FiLayers size={18} />
          </button>
        )}
        <button
          type="button"
          className="rider-map-ctrl-btn"
          onClick={() => setIsFullscreen((prev) => !prev)}
          title={isFullscreen ? 'Exit fullscreen' : 'Expand map view'}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Expand map view'}
        >
          {isFullscreen ? <FiMinimize2 size={18} /> : <FiMaximize2 size={18} />}
        </button>
      </div>

      <div className="rider-map-viewport">
        <MapContainer
          center={defaultCenter}
          zoom={14}
          style={{ width: '100%', height: '100%' }}
          scrollWheelZoom={true}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapController
            riderLocation={riderLocation}
            customerLocation={customerLocation}
            recenterSignal={recenterSignal}
            fitBoundsSignal={fitBoundsSignal}
          />

          {riderLocation?.latitude && riderLocation?.longitude && (
            <Marker
              position={[riderLocation.latitude, riderLocation.longitude]}
              icon={riderIcon}
            >
              <Popup>
                <div style={{ fontWeight: 700, fontSize: '13px' }}>Your Location (Rider)</div>
                <div style={{ fontSize: '11.5px', color: '#666', marginTop: '2px' }}>
                  {riderLocation.name || 'Live GPS Active'}
                </div>
              </Popup>
            </Marker>
          )}

          {customerLocation?.latitude && customerLocation?.longitude && (
            <Marker
              position={[customerLocation.latitude, customerLocation.longitude]}
              icon={customerIcon}
            >
              <Popup>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#2e7d32' }}>
                  Delivery Destination
                </div>
                {orderAddress && (
                  <div style={{ fontSize: '12px', color: '#333', marginTop: '3px' }}>
                    {orderAddress}
                  </div>
                )}
              </Popup>
            </Marker>
          )}

          {restaurantLocation?.latitude && restaurantLocation?.longitude && (
            <Marker
              position={[restaurantLocation.latitude, restaurantLocation.longitude]}
              icon={restaurantIcon}
            >
              <Popup>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#761329' }}>
                  Château 254 Cellar & Kitchen
                </div>
              </Popup>
            </Marker>
          )}

          {/* Dual-layer route polyline for high contrast visibility */}
          {routeCoordinates.length > 0 && (
            <>
              {/* Outer casing */}
              <Polyline
                positions={routeCoordinates}
                color="#0d47a1"
                weight={7}
                opacity={0.35}
                lineCap="round"
                lineJoin="round"
              />
              {/* Inner vibrant route line */}
              <Polyline
                positions={routeCoordinates}
                color="#2196F3"
                weight={4.5}
                opacity={0.95}
                lineCap="round"
                lineJoin="round"
              />
            </>
          )}
        </MapContainer>
      </div>
    </div>
  );
};

export default RiderMap;
