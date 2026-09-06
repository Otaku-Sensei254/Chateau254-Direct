import { useState, useEffect, useCallback } from 'react';
import { FiCheck, FiTruck, FiMapPin, FiClock, FiRefreshCw } from 'react-icons/fi';
import { useSocket } from '../../contexts/SocketContext';
import RiderMap from '../../components/RiderMap';
import { geocodeAddress } from '../../utils/geocoding';

const Tracking = ({ order, token, api, onMenu }) => {
  const [riderLocation, setRiderLocation] = useState(null);
  const [customerLocation, setCustomerLocation] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [currentOrder, setCurrentOrder] = useState(order);
  const [error, setError] = useState(null);
  const { isConnected, joinRoom, leaveRoom, on, off } = useSocket();

  const fetchOrderRoute = useCallback(async () => {
    const o = currentOrder;
    if (!o?.id || !token) return;
    setError(null);
    try {
      const response = await fetch(`${api}/orders/${o.id}/route`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch route');
      }
      const data = await response.json();
      if (data.rider) setRiderLocation(data.rider);
      if (data.customer) setCustomerLocation(data.customer);
      if (data.route) setRouteInfo(data.route);
    } catch (err) {
      setError(err.message);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrder?.id, token, api]);

  useEffect(() => {
    if (!currentOrder?.id) return;
    fetchOrderRoute();
    const interval = setInterval(fetchOrderRoute, 10000);
    return () => clearInterval(interval);
  }, [currentOrder?.id, fetchOrderRoute]);

  useEffect(() => {
    if (!isConnected || !currentOrder?.id) return;
    const room = `customer:${currentOrder.user_id || currentOrder.id}`;
    joinRoom(room);

    const handleRiderLocation = (data) => {
      setRiderLocation((prev) => ({ ...prev, latitude: data.latitude, longitude: data.longitude, name: prev?.name || 'Your rider' }));
    };
    const handleOrderStatus = (data) => {
      if (data.order?.id === currentOrder.id) {
        setCurrentOrder((prev) => ({ ...prev, status: data.order.status, updated_at: data.order.updated_at }));
      }
    };

    on('rider:location_updated', handleRiderLocation);
    on('order:status_changed', handleOrderStatus);
    return () => { leaveRoom(room); off('rider:location_updated', handleRiderLocation); off('order:status_changed', handleOrderStatus); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, currentOrder?.id]);

  useEffect(() => {
    if (!currentOrder?.delivery_address) return;
    geocodeAddress(currentOrder.delivery_address).then((result) => {
      if (result) setCustomerLocation({ latitude: result.latitude, longitude: result.longitude });
    });
  }, [currentOrder?.delivery_address]);

  const getStatusSteps = () => {
    const status = currentOrder?.status || 'pending';
    const steps = [
      { key: 'pending', label: 'Order received', time: currentOrder?.created_at },
      { key: 'preparing', label: 'Preparing', time: currentOrder?.status === 'preparing' ? currentOrder?.updated_at : null },
      { key: 'out_for_delivery', label: 'Out for delivery', time: currentOrder?.status === 'out_for_delivery' ? currentOrder?.updated_at : null },
      { key: 'completed', label: 'Delivered', time: currentOrder?.status === 'completed' ? currentOrder?.updated_at : null },
    ];
    const statusOrder = ['pending', 'preparing', 'out_for_delivery', 'completed'];
    const currentIndex = statusOrder.indexOf(status);
    return steps.map((step, index) => ({ ...step, done: index < currentIndex, current: index === currentIndex }));
  };

  const formatTime = (dateStr) => dateStr ? new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
  const formatDuration = (seconds) => { if (!seconds) return ''; const mins = Math.round(seconds / 60); return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`; };

  if (!currentOrder) {
    return <main className="content-page tracking-page"><div className="page-title"><p className="eyebrow">Order Tracking</p><h1>No order selected</h1></div><button className="primary-button full" onClick={onMenu}>Back to menu</button></main>;
  }

  const statusSteps = getStatusSteps();

  return (
    <main className="content-page tracking-page">
      <div className="page-title">
        <p className="eyebrow">Order #{currentOrder.number || currentOrder.id?.slice(0, 8)}</p>
        <h1>{currentOrder.status === 'completed' ? 'Delivered!' : currentOrder.status === 'out_for_delivery' ? 'On its way' : currentOrder.status === 'preparing' ? 'Being prepared' : 'Order placed'}<br /><em>{currentOrder.status === 'completed' ? 'Thank you.' : 'to you.'}</em></h1>
        {routeInfo && currentOrder.status === 'out_for_delivery' && (
          <span><FiClock /> Estimated arrival · {formatDuration(routeInfo.duration)}</span>
        )}
      </div>

      <div className="tracking-map-container" style={{ height: '300px', borderRadius: '12px', overflow: 'hidden', marginBottom: '1.5rem', border: '1px solid #e5e5e5' }}>
        <RiderMap riderLocation={riderLocation} customerLocation={customerLocation} orderAddress={currentOrder.delivery_address} />
      </div>

      {error && (
        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', padding: '12px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#856404' }}>{error}</span>
          <button onClick={fetchOrderRoute} style={{ background: 'none', border: 'none', color: '#856404', cursor: 'pointer', padding: '4px' }}><FiRefreshCw size={16} /></button>
        </div>
      )}

      <div className="tracking-card">
        <div className="scooter"><FiTruck size={24} /></div>
        <strong>{riderLocation?.name || (currentOrder.status === 'out_for_delivery' ? 'Your rider is on the way' : currentOrder.status === 'preparing' ? 'Your order is being prepared' : 'Waiting for rider...')}</strong>
        <p>{currentOrder.status === 'out_for_delivery' ? 'Your order is out for delivery.' : currentOrder.status === 'preparing' ? 'Your order is being prepared.' : currentOrder.status === 'completed' ? 'Your order has been delivered.' : 'Waiting for rider assignment...'}</p>

        {routeInfo && currentOrder.status === 'out_for_delivery' && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', margin: '1rem 0', padding: '0.75rem', background: '#f8f9fa', borderRadius: '8px' }}>
            <div style={{ textAlign: 'center' }}><FiMapPin size={16} color="#4CAF50" /><div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>{routeInfo.distance >= 1000 ? `${(routeInfo.distance / 1000).toFixed(1)} km` : `${Math.round(routeInfo.distance)} m`}</div></div>
            <div style={{ textAlign: 'center' }}><FiClock size={16} color="#2196F3" /><div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>{formatDuration(routeInfo.duration)}</div></div>
          </div>
        )}

        <div className="timeline">
          {statusSteps.map((step) => (
            <div key={step.key} className={step.done ? 'done' : step.current ? 'current' : ''}>
              <i>{step.done ? <FiCheck /> : step.current ? <FiTruck /> : <FiClock />}</i>
              <span>{step.label}{step.time && <small>{formatTime(step.time)}</small>}</span>
            </div>
          ))}
        </div>
      </div>

      <button className="primary-button full" onClick={onMenu}>Back to menu</button>
    </main>
  );
};

export default Tracking;
