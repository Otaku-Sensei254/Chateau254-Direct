import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const pinIcon = L.divIcon({
  className: 'location-pin',
  html: `<div style="
    width: 28px;
    height: 28px;
    background: #e53935;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    border: 3px solid white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    position: relative;
    top: -14px;
    left: -14px;
  "><div style="
    width: 10px;
    height: 10px;
    background: white;
    border-radius: 50%;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  "></div></div>`,
  iconSize: [0, 0],
  iconAnchor: [0, 0],
});

const DraggableMarker = ({ position, onPositionChange }) => {
  const markerRef = useRef(null);
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.setView(position, map.getZoom());
    }
  }, [position, map]);

  return (
    <Marker
      draggable
      position={position}
      icon={pinIcon}
      ref={markerRef}
      eventHandlers={{
        dragend: () => {
          const marker = markerRef.current;
          if (marker) {
            const newPos = marker.getLatLng();
            onPositionChange({ latitude: newPos.lat, longitude: newPos.lng });
          }
        },
      }}
    />
  );
};

const MapEvents = ({ onPositionChange }) => {
  useMapEvents({
    click: (e) => {
      onPositionChange({ latitude: e.latlng.lat, longitude: e.latlng.lng });
    },
  });
  return null;
};

const LocationPicker = ({ onLocationSelect }) => {
  const [position, setPosition] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [gpsStatus, setGpsStatus] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    const callbackRef = onLocationSelect;
    if (!navigator.geolocation) {
      setGpsStatus('unavailable');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newPos = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setPosition([newPos.latitude, newPos.longitude]);
        callbackRef(newPos);
        setGpsStatus('located');
      },
      () => {
        setGpsStatus('fallback');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [onLocationSelect]);

  const searchLocation = async (query) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=ke`,
        { headers: { 'User-Agent': 'Chateau254-App/1.0' } }
      );
      const data = await res.json();
      setSuggestions(data || []);
    } catch {
      setSuggestions([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchLocation(value), 400);
  };

  const handleSelectSuggestion = (item) => {
    const newPos = { latitude: parseFloat(item.lat), longitude: parseFloat(item.lon) };
    setPosition([newPos.latitude, newPos.longitude]);
    setSearchQuery(item.display_name);
    setSuggestions([]);
    onLocationSelect(newPos);
  };

  const handlePositionChange = (newPos) => {
    setPosition([newPos.latitude, newPos.longitude]);
    onLocationSelect(newPos);
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ position: 'relative', marginBottom: '8px' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search for a location..."
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            fontSize: '14px',
            boxSizing: 'border-box',
          }}
        />
        {searching && (
          <span style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '12px',
            color: '#999',
          }}>Searching...</span>
        )}
        {suggestions.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'white',
            border: '1px solid #ddd',
            borderTop: 'none',
            borderRadius: '0 0 8px 8px',
            maxHeight: '180px',
            overflowY: 'auto',
            zIndex: 1000,
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
          }}>
            {suggestions.map((item, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSelectSuggestion(item)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px 12px',
                  textAlign: 'left',
                  background: 'white',
                  border: 'none',
                  borderBottom: '1px solid #f0f0f0',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#333',
                }}
                onMouseEnter={(e) => e.target.style.background = '#f5f5f5'}
                onMouseLeave={(e) => e.target.style.background = 'white'}
              >
                {item.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {gpsStatus === 'located' && (
        <p style={{ fontSize: '12px', color: '#4CAF50', marginBottom: '6px' }}>
          GPS located. Search, drag pin, or tap map to adjust.
        </p>
      )}
      {gpsStatus === 'fallback' && (
        <p style={{ fontSize: '12px', color: '#FF9800', marginBottom: '6px' }}>
          Search for your location, drag pin, or tap map.
        </p>
      )}

      <div style={{
        height: '250px',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid #ddd',
      }}>
        <MapContainer
          center={position || [-1.2864, 36.8172]}
          zoom={position ? 15 : 12}
          style={{ width: '100%', height: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapEvents onPositionChange={handlePositionChange} />
          {position && <DraggableMarker position={position} onPositionChange={handlePositionChange} />}
        </MapContainer>
      </div>
    </div>
  );
};

export default LocationPicker;
