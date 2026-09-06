import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FiX, FiMapPin, FiArrowUp, FiArrowLeft, FiArrowRight, FiArrowDownLeft, FiArrowDownRight, FiArrowUpLeft, FiArrowUpRight, FiRotateCw, FiCheck } from 'react-icons/fi';

const createIcon = (color, size) => L.divIcon({
  className: 'nav-marker',
  html: `<div style="width:${size}px;height:${size}px;background:${color};border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);"></div>`,
  iconSize: [size, size],
  iconAnchor: [size / 2, size / 2],
});

const riderIcon = createIcon('#2196F3', 32);
const customerIcon = createIcon('#4CAF50', 36);

const FollowRider = ({ position }) => {
  const map = useMap();
  const lastCenterRef = useRef(null);
  useEffect(() => {
    if (!position) return;
    if (!lastCenterRef.current) {
      lastCenterRef.current = position;
      map.setView(position, 16);
      return;
    }
    const [lat1, lng1] = lastCenterRef.current;
    const [lat2, lng2] = position;
    const dist = Math.sqrt(Math.pow((lat2 - lat1) * 111000, 2) + Math.pow((lng2 - lng1) * 111000 * Math.cos(lat1 * Math.PI / 180), 2));
    if (dist > 50) {
      lastCenterRef.current = position;
      map.flyTo(position, map.getZoom(), { duration: 0.8 });
    }
  }, [position, map]);
  return null;
};

const maneuverIcon = (type, modifier) => {
  const key = `${type}_${modifier || ''}`;
  const icons = {
    depart_: FiArrowUp, depart_straight: FiArrowUp,
    turn_left: FiArrowLeft, turn_right: FiArrowRight,
    turn_slight_left: FiArrowUpLeft, turn_slight_right: FiArrowUpRight,
    turn_sharp_left: FiArrowDownLeft, turn_sharp_right: FiArrowDownRight,
    turn_uturn: FiRotateCw,
    continue_: FiArrowUp, continue_straight: FiArrowUp,
    continue_left: FiArrowLeft, continue_right: FiArrowRight,
    'new name_': FiArrowUp, 'new name_straight': FiArrowUp,
    'new name_left': FiArrowLeft, 'new name_right': FiArrowRight,
    merge_: FiArrowUp, merge_left: FiArrowLeft, merge_right: FiArrowRight,
    'end of road_': FiMapPin, 'end of road_left': FiArrowLeft, 'end of road_right': FiArrowRight,
    roundabout_: FiRotateCw, roundabout_left: FiRotateCw, roundabout_right: FiRotateCw,
    rotuary_: FiRotateCw, rotuary_left: FiRotateCw, rotuary_right: FiRotateCw,
    arrive_: FiMapPin, arrive_left: FiMapPin, arrive_right: FiMapPin,
  };
  return icons[key] || FiArrowUp;
};

const instructionText = (step) => {
  const { type, modifier } = step.maneuver || {};
  const name = step.name || '';
  const road = name ? ` onto ${name}` : '';

  if (type === 'depart') return `Depart${road ? road : ''}`;
  if (type === 'arrive') return `Arrive at destination`;
  if (type === 'roundabout') return `Enter roundabout${road ? `, exit onto ${road}` : ''}`;
  if (type === 'rotary') return `Enter rotary${road ? `, exit onto ${road}` : ''}`;
  if (type === 'end of road') return `At end of road, turn ${modifier || ''}${road}`;
  if (type === 'merge') return `Merge ${modifier || ''}${road}`;
  if (type === 'continue') return `Continue ${modifier || ''}${road}`;
  if (type === 'new name') return `Continue onto ${name || 'road'}`;
  if (type === 'turn') return `Turn ${modifier || ''}${road}`;
  return `Continue${road}`;
};

const formatDistance = (m) => m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
const formatDuration = (s) => { const mins = Math.round(s / 60); return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`; };

const getActiveStepIndex = (steps, riderLat, riderLng) => {
  if (!steps?.length || !riderLat) return 0;
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = steps.length - 1; i >= 0; i--) {
    const loc = steps[i]?.maneuver?.location;
    if (!loc) continue;
    const [lng, lat] = loc;
    const dlat = riderLat - lat;
    const dlng = riderLng - lng;
    const dist = Math.sqrt(dlat * dlat + dlng * dlng);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  const loc = steps[bestIdx]?.maneuver?.location;
  if (loc) {
    const [lng, lat] = loc;
    const dlat = riderLat - lat;
    const dlng = riderLng - lng;
    const distToManeuver = Math.sqrt(dlat * dlat + dlng * dlng) * 111000;
    if (distToManeuver < 30 && bestIdx < steps.length - 1) return bestIdx + 1;
  }
  return bestIdx;
};

const NavigationPage = ({ order, riderLocation, customerLocation, onClose }) => {
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const stepsListRef = useRef(null);
  const fetchedRef = useRef(false);

  const riderLat = riderLocation?.latitude;
  const riderLng = riderLocation?.longitude;
  const custLat = customerLocation?.latitude;
  const custLng = customerLocation?.longitude;

  const fetchRoute = useCallback(async () => {
    if (!riderLat || !riderLng || !custLat || !custLng || fetchedRef.current) return;
    fetchedRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${riderLng},${riderLat};${custLng},${custLat}?overview=full&geometries=geojson&steps=true`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.code === 'Ok' && data.routes?.length) {
        setRoute(data.routes[0]);
      } else {
        setError('Could not calculate route');
      }
    } catch {
      setError('Failed to load route');
    } finally {
      setLoading(false);
    }
  }, [riderLat, riderLng, custLat, custLng]);

  useEffect(() => { fetchRoute(); }, [fetchRoute]);

  const steps = route?.legs?.[0]?.steps || [];
  const geometry = route?.geometry?.coordinates || [];
  const polylineCoords = geometry.map((c) => [c[1], c[0]]);

  const activeIdx = getActiveStepIndex(steps, riderLocation?.latitude, riderLocation?.longitude);
  const remainingDistance = route?.distance || 0;
  const remainingDuration = route?.duration || 0;

  useEffect(() => {
    if (stepsListRef.current) {
      const activeEl = stepsListRef.current.querySelector(`[data-step="${activeIdx}"]`);
      if (activeEl) activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeIdx]);

  const mapCenter = useMemo(() => {
    if (riderLat && riderLng) return [riderLat, riderLng];
    if (custLat && custLng) return [custLat, custLng];
    return null;
  }, [riderLat, riderLng, custLat, custLng]);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 9999, background: '#fff',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Top bar */}
      <div className="nav-top-bar" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', background: '#1a1a2e', color: 'white',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      }}>
        <button onClick={onClose} style={{
          background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '8px',
          padding: '8px 12px', color: 'white', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px',
        }}><FiX size={16} /> Close</button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>Delivering to</div>
            <div className="nav-order" style={{ fontWeight: 600, fontSize: '14px' }}>#{order?.id?.slice(0, 8)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="nav-distance" style={{ fontSize: '20px', fontWeight: 700 }}>{formatDistance(remainingDistance)}</div>
          <div style={{ fontSize: '12px', opacity: 0.7 }}>{formatDuration(remainingDuration)}</div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Map */}
        <div style={{ flex: 1, position: 'relative' }}>
          {!riderLocation && (
            <div style={{
              position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)',
              background: 'white', padding: '12px 20px', borderRadius: '10px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)', zIndex: 1000,
              fontSize: '14px', color: '#333', textAlign: 'center',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <FiMapPin size={18} color="#2196F3" />
              <div>Getting your location...</div>
            </div>
          )}

          {loading && (
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              background: 'white', padding: '16px 24px', borderRadius: '12px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)', zIndex: 1000,
              fontSize: '14px', color: '#333',
            }}>Calculating route...</div>
          )}
          {error && (
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              background: '#fff3cd', padding: '16px 24px', borderRadius: '12px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)', zIndex: 1000,
              fontSize: '14px', color: '#856404', textAlign: 'center',
            }}>
              {error}
              <br />
              <button onClick={fetchRoute} style={{
                marginTop: '8px', padding: '6px 16px', background: '#ffc107',
                border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600,
              }}>Retry</button>
            </div>
          )}

          {mapCenter ? (
          <MapContainer center={mapCenter} zoom={16} style={{ width: '100%', height: '100%' }} zoomControl={false}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
            <FollowRider position={mapCenter} />

            {riderLocation && (
              <Marker position={[riderLocation.latitude, riderLocation.longitude]} icon={riderIcon} />
            )}
            {customerLocation && (
              <Marker position={[customerLocation.latitude, customerLocation.longitude]} icon={customerIcon} />
            )}

            {polylineCoords.length > 0 && (
              <>
                <Polyline positions={polylineCoords} color="#ccc" weight={6} opacity={0.5} />
                <Polyline positions={polylineCoords.slice(
                  (() => {
                    const stepGeomLengths = steps.slice(0, activeIdx).reduce((sum, s) => {
                      const coords = s.geometry?.coordinates || [];
                      return sum + coords.length;
                    }, 0);
                    return Math.min(stepGeomLengths, polylineCoords.length);
                  })()
                )} color="#2196F3" weight={6} opacity={0.9} />
              </>
            )}
          </MapContainer>
          ) : (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', background: '#f5f5f5',
              color: '#666', gap: '12px',
            }}>
              <FiMapPin size={40} color="#ccc" />
              <div style={{ fontSize: '16px', fontWeight: 600 }}>Waiting for location...</div>
              <div style={{ fontSize: '13px', color: '#999' }}>Enable location access to start navigation</div>
            </div>
          )}

          {/* Current instruction overlay (mobile) */}
          {steps[activeIdx] && (
            <div className="nav-instruction-overlay" style={{
              position: 'absolute', bottom: '16px', left: '16px', right: '16px',
              background: 'white', borderRadius: '12px', padding: '16px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)', zIndex: 1000,
              display: 'flex', alignItems: 'center', gap: '12px',
            }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '10px',
                background: '#e3f2fd', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {(() => {
                  const Icon = maneuverIcon(steps[activeIdx].maneuver?.type, steps[activeIdx].maneuver?.modifier);
                  return <Icon size={22} color="#1565c0" />;
                })()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '2px' }}>
                  {instructionText(steps[activeIdx])}
                </div>
                <div style={{ fontSize: '13px', color: '#666' }}>
                  in {formatDistance(steps[activeIdx].distance || 0)}
                </div>
              </div>
              <button onClick={onClose} style={{
                flexShrink: 0, width: '40px', height: '40px', borderRadius: '10px',
                background: '#e53935', color: 'white', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}><FiX size={18} /></button>
            </div>
          )}
        </div>

        {/* Directions panel (desktop) */}
        <div style={{
          width: '320px', background: '#fafafa', borderLeft: '1px solid #e0e0e0',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }} className="nav-directions-panel">
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e0e0e0', background: 'white' }}>
            <div style={{ fontSize: '13px', color: '#666' }}>Turn-by-turn directions</div>
          </div>

          <div ref={stepsListRef} style={{ flex: 1, overflowY: 'auto' }}>
            {steps.map((step, i) => {
              const isActive = i === activeIdx;
              const isDone = i < activeIdx;
              const Icon = maneuverIcon(step.maneuver?.type, step.maneuver?.modifier);
              return (
                <div
                  key={i}
                  data-step={i}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: '12px',
                    padding: '12px 16px',
                    background: isActive ? '#e3f2fd' : 'transparent',
                    borderLeft: isActive ? '3px solid #1565c0' : '3px solid transparent',
                    opacity: isDone ? 0.5 : 1,
                  }}
                >
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '8px',
                    background: isDone ? '#e8f5e9' : isActive ? '#bbdefb' : '#f0f0f0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, marginTop: '2px',
                  }}>
                    {isDone ? <FiCheck size={16} color="#4caf50" /> : <Icon size={16} color={isActive ? '#1565c0' : '#666'} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '14px', fontWeight: isActive ? 700 : 500,
                      color: isDone ? '#999' : '#333', marginBottom: '2px',
                    }}>
                      {instructionText(step)}
                    </div>
                    {step.name && (
                      <div style={{ fontSize: '12px', color: '#888' }}>{step.name}</div>
                    )}
                    <div style={{ fontSize: '12px', color: '#aaa', marginTop: '2px' }}>
                      {formatDistance(step.distance || 0)} · {formatDuration(step.duration || 0)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ padding: '12px 16px', borderTop: '1px solid #e0e0e0', background: 'white' }}>
            <button onClick={onClose} style={{
              width: '100%', padding: '12px', background: '#e53935', color: 'white',
              border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            }}><FiX size={16} /> End navigation</button>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .nav-directions-panel { display: none !important; }
          .nav-top-bar { padding: 10px 12px !important; }
          .nav-top-bar .nav-distance { font-size: 16px !important; }
          .nav-top-bar .nav-order { font-size: 12px !important; }
          .nav-instruction-overlay { bottom: 10px !important; left: 10px !important; right: 10px !important; padding: 12px !important; }
        }
      `}</style>
    </div>
  );
};

export default NavigationPage;
