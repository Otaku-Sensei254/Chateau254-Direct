import { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FiMapPin } from 'react-icons/fi';
import { getRouteFromOSRM } from '../utils/geocoding';

const createIcon = (color, size = 32) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      background-color: ${color};
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const stepIcon = (type, modifier) => {
  const arrows = {
    depart: '&#8593;', arrive: '&#9679;',
    turn_left: '&#8592;', turn_right: '&#8594;',
    turn_slight_left: '&#8617;', turn_slight_right: '&#8618;',
    turn_sharp_left: '&#8617;', turn_sharp_right: '&#8618;',
    turn_uturn: '&#8634;',
    continue: '&#8593;', merge: '&#8593;',
    roundabout: '&#8635;', rotary: '&#8635;',
    'end of road': '&#8593;',
    'new name': '&#8593;',
  };
  const key = type + (modifier ? `_${modifier}` : '');
  const symbol = arrows[key] || arrows[type] || '&#8593;';
  return L.divIcon({
    className: 'step-marker',
    html: `<div style="
      width:22px;height:22px;background:#1565c0;color:white;border-radius:50%;
      display:flex;align-items:center;justify-content:center;font-size:12px;
      border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);
    ">${symbol}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
};

const riderIcon = createIcon('#2196F3', 36);
const customerIcon = createIcon('#4CAF50', 36);
const restaurantIcon = createIcon('#FF9800', 32);

const MapUpdater = ({ center, zoom }) => {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.setView(center, zoom || map.getZoom());
    }
  }, [center, zoom, map]);

  return null;
};

const RiderMap = ({ riderLocation, customerLocation, restaurantLocation, orderAddress, steps }) => {
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);

  const calculateRoute = useCallback(async () => {
    if (!riderLocation || !customerLocation) return;

    setLoading(true);
    try {
      const routeData = await getRouteFromOSRM(
        riderLocation.latitude,
        riderLocation.longitude,
        customerLocation.latitude,
        customerLocation.longitude
      );
      setRoute(routeData);
    } catch (error) {
      console.error('Failed to calculate route:', error);
    } finally {
      setLoading(false);
    }
  }, [riderLocation, customerLocation]);

  useEffect(() => {
    calculateRoute();
  }, [calculateRoute]);

  const defaultCenter = riderLocation
    ? [riderLocation.latitude, riderLocation.longitude]
    : customerLocation
    ? [customerLocation.latitude, customerLocation.longitude]
    : null;

  const routeCoordinates = route?.geometry?.coordinates?.map((coord) => [coord[1], coord[0]]) || [];

  const formatDistance = (meters) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(meters)} m`;
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remainMins = mins % 60;
      return `${hours}h ${remainMins}m`;
    }
    return `${mins} min`;
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {!defaultCenter && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', background: '#f5f5f5',
          color: '#666', zIndex: 1000, gap: '8px',
        }}>
          <FiMapPin size={28} color="#999" />
          <div style={{ fontSize: '14px', fontWeight: 600 }}>Waiting for GPS...</div>
          <div style={{ fontSize: '12px', color: '#999' }}>Allow location access to continue</div>
        </div>
      )}

      {defaultCenter ? (
      <MapContainer
        center={defaultCenter}
        zoom={14}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapUpdater center={defaultCenter} zoom={14} />

        {riderLocation && (
          <Marker
            position={[riderLocation.latitude, riderLocation.longitude]}
            icon={riderIcon}
          >
            <Popup>
              <strong>Rider</strong>
              {riderLocation.name && <p>{riderLocation.name}</p>}
            </Popup>
          </Marker>
        )}

        {customerLocation && (
          <Marker
            position={[customerLocation.latitude, customerLocation.longitude]}
            icon={customerIcon}
          >
            <Popup>
              <strong>Delivery Location</strong>
              {orderAddress && <p>{orderAddress}</p>}
            </Popup>
          </Marker>
        )}

        {restaurantLocation && (
          <Marker
            position={[restaurantLocation.latitude, restaurantLocation.longitude]}
            icon={restaurantIcon}
          >
            <Popup>
              <strong>Restaurant</strong>
              <p>Château254</p>
            </Popup>
          </Marker>
        )}

        {steps && steps.map((step, i) => {
          const loc = step.maneuver?.location;
          if (!loc) return null;
          const [lng, lat] = loc;
          if (!lat || !lng) return null;
          const isEndpoint = step.maneuver?.type === 'depart' || step.maneuver?.type === 'arrive';
          if (isEndpoint) return null;
          return (
            <Marker
              key={i}
              position={[lat, lng]}
              icon={stepIcon(step.maneuver?.type, step.maneuver?.modifier)}
            >
              <Popup><small>{step.maneuver?.type} {step.maneuver?.modifier || ''}</small></Popup>
            </Marker>
          );
        })}

        {routeCoordinates.length > 0 && (
          <Polyline
            positions={routeCoordinates}
            color="#2196F3"
            weight={4}
            opacity={0.7}
          />
        )}
      </MapContainer>
      ) : null}

      {loading && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'white',
          padding: '8px 12px',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          zIndex: 1000,
        }}>
          Calculating route...
        </div>
      )}

      {route && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          background: 'white',
          padding: '12px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          zIndex: 1000,
          maxWidth: '200px',
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Route Info</div>
          <div style={{ fontSize: '14px', color: '#666' }}>
            <p style={{ margin: '2px 0' }}>Distance: {formatDistance(route.distance)}</p>
            <p style={{ margin: '2px 0' }}>Duration: {formatDuration(route.duration)}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiderMap;
