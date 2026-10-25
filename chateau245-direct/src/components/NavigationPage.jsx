import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  FiX,
  FiMapPin,
  FiArrowUp,
  FiArrowLeft,
  FiArrowRight,
  FiArrowDownLeft,
  FiArrowDownRight,
  FiArrowUpLeft,
  FiArrowUpRight,
  FiRotateCw,
  FiCheck,
  FiList,
  FiNavigation,
} from 'react-icons/fi';

const createRiderMarker = () => L.divIcon({
  className: 'nav-rider-icon',
  html: `
    <div class="rider-marker-pin">
      <div class="rider-marker-pulse"></div>
      <div class="rider-marker-core" style="background:#1976d2;width:34px;height:34px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="3 11 22 2 13 21 11 13 3 11"/>
        </svg>
      </div>
    </div>
  `,
  iconSize: [42, 42],
  iconAnchor: [21, 21],
});

const createCustomerMarker = () => L.divIcon({
  className: 'nav-customer-icon',
  html: `
    <div class="dest-marker-pin">
      <div class="dest-marker-badge" style="background:#2e7d32;width:36px;height:36px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      </div>
      <div class="dest-marker-shadow"></div>
    </div>
  `,
  iconSize: [42, 42],
  iconAnchor: [21, 36],
});

const riderIcon = createRiderMarker();
const customerIcon = createCustomerMarker();

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
    const dist = Math.sqrt(
      Math.pow((lat2 - lat1) * 111000, 2) +
      Math.pow((lng2 - lng1) * 111000 * Math.cos((lat1 * Math.PI) / 180), 2)
    );
    if (dist > 40) {
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
  const { type, modifier } = step?.maneuver || {};
  const name = step?.name || '';
  const road = name ? ` onto ${name}` : '';

  if (type === 'depart') return `Depart${road || ''}`;
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

const formatDistance = (m) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`);
const formatDuration = (s) => {
  const mins = Math.round(s / 60);
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`;
};

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
  const [showDrawer, setShowDrawer] = useState(false);
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

  useEffect(() => {
    fetchRoute();
  }, [fetchRoute]);

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

  const currentStep = steps[activeIdx];
  const NextManeuverIcon = currentStep
    ? maneuverIcon(currentStep.maneuver?.type, currentStep.maneuver?.modifier)
    : FiNavigation;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      zIndex: 9999, background: '#121212',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'inherit',
      width: '100vw', maxWidth: '100vw',
      overflowX: 'hidden', boxBox: 'border-box',
    }}>
      {/* Top Navigation HUD Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px clamp(10px, 3vw, 18px)', background: '#1c1b18', color: '#f7f3ef',
        borderBottom: '1px solid #332d26', boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        zIndex: 10, width: '100%', boxSizing: 'border-box', flexWrap: 'wrap', gap: '8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px', padding: '7px 12px', color: '#f7f3ef', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12.5px', fontWeight: 600,
              flexShrink: 0,
            }}
          >
            <FiX size={16} /> Exit
          </button>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '10px', color: '#bc9660', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Delivering
            </div>
            <div style={{ fontWeight: 800, fontSize: '14.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              #{order?.id?.slice(0, 8)}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#f7f3ef', lineHeight: 1.1 }}>
              {formatDistance(remainingDistance)}
            </div>
            <div style={{ fontSize: '11px', color: '#4caf50', fontWeight: 600 }}>
              ETA {formatDuration(remainingDuration)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowDrawer((prev) => !prev)}
            style={{
              background: showDrawer ? '#bc9660' : 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px', padding: '8px', color: showDrawer ? '#14100a' : '#f7f3ef',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            title="Toggle turn-by-turn directions"
          >
            <FiList size={18} />
          </button>
        </div>
      </div>

      {/* Main Map View Area */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden', width: '100%', maxWidth: '100%' }}>
        <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
          {loading && (
            <div style={{
              position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(20, 18, 16, 0.94)', backdropFilter: 'blur(8px)',
              padding: '10px 18px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)',
              color: '#f7f3ef', zIndex: 1000, fontSize: '12.5px', fontWeight: 600,
              whiteSpace: 'nowrap',
            }}>
              Calculating optimal route...
            </div>
          )}

          {error && (
            <div style={{
              position: 'absolute', top: '20px', left: '12px', right: '12px',
              maxWidth: '360px', margin: '0 auto',
              background: '#b71c1c', padding: '10px 16px', borderRadius: '10px',
              color: '#ffffff', zIndex: 1000, fontSize: '12px', fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
            }}>
              <span>{error}</span>
              <button
                type="button"
                onClick={fetchRoute}
                style={{
                  background: '#ffffff', color: '#b71c1c', border: 0,
                  borderRadius: '5px', padding: '3px 8px', fontWeight: 700, cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                Retry
              </button>
            </div>
          )}

          {mapCenter && (
            <MapContainer
              center={mapCenter}
              zoom={16}
              style={{ width: '100%', height: '100%' }}
              zoomControl={false}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap'
              />
              <FollowRider position={mapCenter} />

              {riderLocation && (
                <Marker
                  position={[riderLocation.latitude, riderLocation.longitude]}
                  icon={riderIcon}
                />
              )}
              {customerLocation && (
                <Marker
                  position={[customerLocation.latitude, customerLocation.longitude]}
                  icon={customerIcon}
                />
              )}

              {polylineCoords.length > 0 && (
                <>
                  <Polyline positions={polylineCoords} color="#0d47a1" weight={8} opacity={0.4} />
                  <Polyline
                    positions={polylineCoords.slice(
                      (() => {
                        const stepGeomLengths = steps.slice(0, activeIdx).reduce((sum, s) => {
                          const coords = s.geometry?.coordinates || [];
                          return sum + coords.length;
                        }, 0);
                        return Math.min(stepGeomLengths, polylineCoords.length);
                      })()
                    )}
                    color="#2196F3"
                    weight={5}
                    opacity={0.95}
                  />
                </>
              )}
            </MapContainer>
          )}

          {/* Current Turn-by-Turn Instruction Banner */}
          {currentStep && (
            <div style={{
              position: 'absolute', top: '12px', left: '10px', right: '10px',
              maxWidth: '480px', margin: '0 auto',
              background: 'rgba(20, 18, 16, 0.94)', backdropFilter: 'blur(10px)',
              borderRadius: '14px', padding: '12px 16px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 6px 24px rgba(0,0,0,0.4)', zIndex: 900,
              display: 'flex', alignItems: 'center', gap: '12px', color: '#f7f3ef',
              boxSizing: 'border-box',
            }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '10px',
                background: 'linear-gradient(135deg, #1976d2, #1565c0)',
                display: 'grid', placeItems: 'center', flexShrink: 0,
                color: '#ffffff', boxShadow: '0 3px 10px rgba(25, 118, 210, 0.4)',
              }}>
                <NextManeuverIcon size={22} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: 800, fontSize: '15px', lineHeight: 1.25, marginBottom: '2px',
                  wordBreak: 'break-word', overflowWrap: 'anywhere',
                }}>
                  {instructionText(currentStep)}
                </div>
                <div style={{ fontSize: '12.5px', color: '#bc9660', fontWeight: 600 }}>
                  in {formatDistance(currentStep.distance || 0)}
                </div>
              </div>
            </div>
          )}

          {/* Bottom Destination HUD Card */}
          <div style={{
            position: 'absolute', bottom: '12px', left: '10px', right: '10px',
            maxWidth: '480px', margin: '0 auto',
            background: 'rgba(20, 18, 16, 0.94)', backdropFilter: 'blur(10px)',
            borderRadius: '14px', padding: '12px 16px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 6px 24px rgba(0,0,0,0.4)', zIndex: 900,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: '10px', color: '#f7f3ef', boxSizing: 'border-box',
          }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '10px', color: '#bc9660', fontWeight: 700, textTransform: 'uppercase' }}>
                Delivery Destination
              </div>
              <div style={{
                fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap',
                overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {order?.delivery_address || 'Destination'}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'linear-gradient(135deg, #2e7d32, #1b5e20)',
                color: '#ffffff', border: 0, borderRadius: '10px',
                padding: '10px 15px', fontWeight: 700, fontSize: '13px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
                flexShrink: 0,
              }}
            >
              <FiCheck size={16} /> Arrived
            </button>
          </div>
        </div>

        {/* Turn-by-Turn Steps Side/Overlay Drawer */}
        {showDrawer && (
          <div style={{
            position: 'absolute', top: 0, bottom: 0, right: 0,
            width: 'min(340px, 100vw)', maxWidth: '100vw',
            background: '#1c1b18', borderLeft: '1px solid #332d26',
            display: 'flex', flexDirection: 'column', zIndex: 950,
            boxShadow: '-4px 0 24px rgba(0,0,0,0.5)',
          }}>
            <div style={{
              padding: '12px 16px', borderBottom: '1px solid #332d26',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              color: '#f7f3ef',
            }}>
              <span style={{ fontSize: '13.5px', fontWeight: 700 }}>Turn-by-Turn Instructions</span>
              <button
                type="button"
                onClick={() => setShowDrawer(false)}
                style={{ background: 'transparent', border: 0, color: '#f7f3ef', cursor: 'pointer', padding: '4px' }}
              >
                <FiX size={18} />
              </button>
            </div>

            <div ref={stepsListRef} style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
              {steps.map((step, i) => {
                const isActive = i === activeIdx;
                const isDone = i < activeIdx;
                const Icon = maneuverIcon(step.maneuver?.type, step.maneuver?.modifier);

                return (
                  <div
                    key={i}
                    data-step={i}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '10px',
                      padding: '10px 14px',
                      background: isActive ? 'rgba(188, 150, 96, 0.12)' : 'transparent',
                      borderLeft: isActive ? '3px solid #bc9660' : '3px solid transparent',
                      opacity: isDone ? 0.45 : 1,
                    }}
                  >
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '7px',
                      background: isDone ? '#2e7d32' : isActive ? '#1976d2' : 'rgba(255,255,255,0.06)',
                      display: 'grid', placeItems: 'center', color: '#ffffff', flexShrink: 0,
                    }}>
                      {isDone ? <FiCheck size={14} /> : <Icon size={14} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, color: '#f7f3ef' }}>
                      <div style={{
                        fontSize: '13px', fontWeight: isActive ? 700 : 500,
                        wordBreak: 'break-word', overflowWrap: 'anywhere',
                      }}>
                        {instructionText(step)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#a0958e', marginTop: '2px' }}>
                        {formatDistance(step.distance || 0)} · {formatDuration(step.duration || 0)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NavigationPage;
