import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FiRefreshCw, FiTruck, FiUser } from 'react-icons/fi';
import { useSocket } from '../contexts/SocketContext';

const createRiderIcon = (status) => {
  const color = status === 'online' ? '#4CAF50' : status === 'on_break' ? '#FF9800' : '#9E9E9E';

  return L.divIcon({
    className: 'rider-marker',
    html: `<div style="
      width: 32px;
      height: 32px;
      background-color: ${color};
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
      </svg>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

const MapUpdater = ({ center, zoom }) => {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.setView(center, zoom || map.getZoom());
    }
  }, [center, zoom, map]);

  return null;
};

const AdminFleetMap = ({ token, api }) => {
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { isConnected, joinRoom, leaveRoom, on, off } = useSocket();

  const fetchRiderLocations = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${api}/riders/locations`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch rider locations');
      }

      const data = await response.json();
      setRiders(data.locations || []);
    } catch (err) {
      console.error('Failed to fetch rider locations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, api]);

  useEffect(() => {
    fetchRiderLocations();

    const interval = setInterval(fetchRiderLocations, 10000);

    return () => clearInterval(interval);
  }, [fetchRiderLocations]);

  useEffect(() => {
    if (!isConnected) return;

    joinRoom('admin');

    const handleRiderLocation = (data) => {
      setRiders((prev) => {
        const exists = prev.find((r) => r.rider_id === data.riderId);
        if (exists) {
          return prev.map((r) =>
            r.rider_id === data.riderId
              ? { ...r, latitude: data.latitude, longitude: data.longitude, status: data.status }
              : r
          );
        }
        return prev;
      });
    };

    on('rider:location_updated', handleRiderLocation);

    return () => {
      leaveRoom('admin');
      off('rider:location_updated', handleRiderLocation);
    };
  }, [isConnected, joinRoom, leaveRoom, on, off]);

  const defaultCenter = riders.length > 0
    ? [riders[0].latitude, riders[0].longitude]
    : [-1.2921, 36.8219]; // Nairobi default

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <MapContainer
        center={defaultCenter}
        zoom={12}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapUpdater center={defaultCenter} zoom={12} />

        {riders.map((rider) => (
          <Marker
            key={rider.rider_id}
            position={[rider.latitude, rider.longitude]}
            icon={createRiderIcon(rider.status)}
          >
            <Popup>
              <div style={{ minWidth: '150px' }}>
                <strong style={{ display: 'block', marginBottom: '4px' }}>
                  <FiUser size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                  {rider.full_name}
                </strong>
                <p style={{ margin: '2px 0', fontSize: '12px', color: '#666' }}>
                  <FiTruck size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                  {rider.phone}
                </p>
                <p style={{ margin: '2px 0', fontSize: '12px', color: '#666' }}>
                  Status: <span style={{
                    color: rider.status === 'online' ? '#4CAF50' : rider.status === 'on_break' ? '#FF9800' : '#9E9E9E',
                    fontWeight: 'bold',
                  }}>
                    {rider.status}
                  </span>
                </p>
                {rider.updated_at && (
                  <p style={{ margin: '2px 0', fontSize: '11px', color: '#999' }}>
                    Last update: {formatTime(rider.updated_at)}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        background: 'white',
        padding: '8px 12px',
        borderRadius: '4px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <button
          onClick={fetchRiderLocations}
          disabled={loading}
          style={{
            background: 'none',
            border: 'none',
            cursor: loading ? 'wait' : 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <FiRefreshCw size={16} className={loading ? 'spin' : ''} />
        </button>
        <span style={{ fontSize: '12px', color: '#666' }}>
          {riders.length} rider{riders.length !== 1 ? 's' : ''} online
        </span>
      </div>

      {error && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          background: '#f8d7da',
          color: '#721c24',
          padding: '8px 12px',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          zIndex: 1000,
          fontSize: '12px',
        }}>
          {error}
        </div>
      )}

      <div style={{
        position: 'absolute',
        bottom: '10px',
        right: '10px',
        background: 'white',
        padding: '8px 12px',
        borderRadius: '4px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#4CAF50' }} />
          <span style={{ fontSize: '11px' }}>Online</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#FF9800' }} />
          <span style={{ fontSize: '11px' }}>On Break</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#9E9E9E' }} />
          <span style={{ fontSize: '11px' }}>Offline</span>
        </div>
      </div>
    </div>
  );
};

export default AdminFleetMap;
