import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiCheck, FiClock, FiLogOut, FiMapPin, FiMenu, FiPhone, FiTruck, FiX, FiRefreshCw, FiChevronRight, FiNavigation, FiAlertTriangle } from 'react-icons/fi';
import { useSocket } from '../../contexts/SocketContext';
import useLocationTracker from '../../hooks/useLocationTracker';
import RiderMap from '../../components/RiderMap';
import NavigationPage from '../../components/NavigationPage';
import { geocodeAddress } from '../../utils/geocoding';

const RiderDashboard = ({ user, token, api, onLogout }) => {
  const [rider, setRider] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [activeTab, setActiveTab] = useState('deliveries');
  const [error, setError] = useState(null);
  const [customerLocations, setCustomerLocations] = useState({});
  const [routeInfo, setRouteInfo] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [navigating, setNavigating] = useState(false);

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }), [token]);
  const { isConnected, joinRoom, leaveRoom, on, off } = useSocket();
  const { location: riderLocation, error: gpsError, accuracy } = useLocationTracker(api, token, rider?.status === 'online');

  const fetchRiderProfile = useCallback(async () => {
    const res = await fetch(`${api}/riders/me`, { headers });
    if (!res.ok) throw new Error('Failed to load rider profile');
    const data = await res.json();
    setRider(data.rider);
    return data.rider;
  }, [api, headers]);

  const fetchActiveOrders = useCallback(async () => {
    const res = await fetch(`${api}/riders/me/orders`, { headers });
    if (!res.ok) throw new Error('Failed to load orders');
    const data = await res.json();
    setDeliveries(data.orders || []);
    setSelectedId((prev) => {
      if (prev && data.orders?.some((o) => o.id === prev)) return prev;
      return data.orders?.[0]?.id || null;
    });
  }, [api, headers]);

  const fetchCompletedOrders = useCallback(async () => {
    const res = await fetch(`${api}/riders/me/orders/completed`, { headers });
    if (!res.ok) throw new Error('Failed to load history');
    const data = await res.json();
    setCompleted(data.orders || []);
  }, [api, headers]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchRiderProfile(), fetchActiveOrders(), fetchCompletedOrders()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchRiderProfile, fetchActiveOrders, fetchCompletedOrders]);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    if (!isConnected || !rider?.id) return;
    const room = `rider:${rider.id}`;
    joinRoom(room);

    const handleOrderAssigned = () => fetchActiveOrders();
    const handleOrderStatusChanged = () => { fetchActiveOrders(); fetchCompletedOrders(); };

    on('order:assigned', handleOrderAssigned);
    on('order:status_changed', handleOrderStatusChanged);
    return () => { leaveRoom(room); off('order:assigned', handleOrderAssigned); off('order:status_changed', handleOrderStatusChanged); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, rider?.id]);

  const geocodeCustomerAddresses = useCallback(async () => {
    const locations = {};
    for (const delivery of deliveries) {
      if (delivery.delivery_address && !customerLocations[delivery.id]) {
        const result = await geocodeAddress(delivery.delivery_address);
        if (result) {
          locations[delivery.id] = { latitude: result.latitude, longitude: result.longitude };
        }
      }
    }
    if (Object.keys(locations).length > 0) {
      setCustomerLocations((prev) => ({ ...prev, ...locations }));
    }
  }, [deliveries, customerLocations]);

  useEffect(() => { if (deliveries.length > 0) geocodeCustomerAddresses(); }, [deliveries.length, geocodeCustomerAddresses]);

  const fetchRoute = useCallback(async (orderId) => {
    if (!orderId || !riderLocation) return;
    setRouteLoading(true);
    setRouteInfo(null);
    try {
      const res = await fetch(`${api}/orders/${orderId}/route`, { headers });
      if (res.ok) {
        const data = await res.json();
        setRouteInfo(data.route || null);
        if (data.customer && !customerLocations[orderId]) {
          setCustomerLocations((prev) => ({ ...prev, [orderId]: data.customer }));
        }
      }
    } catch {
      // Route may not be available yet
    } finally {
      setRouteLoading(false);
    }
  }, [api, headers, riderLocation, customerLocations]);

  useEffect(() => {
    if (selectedId && activeTab === 'deliveries') {
      fetchRoute(selectedId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, activeTab, riderLocation?.latitude]);

  const updateStatus = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`${api}/riders/me/orders/${orderId}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      if (newStatus === 'completed') {
        setDeliveries((prev) => prev.filter((o) => o.id !== orderId));
        setCompleted((prev) => [deliveries.find((o) => o.id === orderId), ...prev].filter(Boolean));
        setSelectedId((prev) => (prev === orderId ? deliveries.find((o) => o.id !== orderId)?.id || null : prev));
      } else {
        setDeliveries((prev) => prev.map((o) => o.id === orderId ? { ...o, status: newStatus } : o));
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleOnlineStatus = async () => {
    if (!rider) return;
    const newStatus = rider.status === 'online' ? 'offline' : 'online';
    try {
      const res = await fetch(`${api}/riders/me/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      const data = await res.json();
      setRider(data.rider);
    } catch (err) {
      alert(err.message);
    }
  };

  const selectedDelivery = deliveries.find((o) => o.id === selectedId) || null;
  const selectedLocation = selectedId ? customerLocations[selectedId] : null;

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };
  const formatCurrency = (amount) => `KES ${Number(amount).toLocaleString()}`;
  const formatDistance = (m) => m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
  const formatDuration = (s) => { const mins = Math.round(s / 60); return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`; };

  if (loading) return <div className="rider-layout"><section className="rider-content"><div className="rider-page"><div style={{ textAlign: 'center', padding: '4rem 2rem' }}><FiRefreshCw className="spin" size={32} /><p>Loading...</p></div></div></section></div>;
  if (error) return <div className="rider-layout"><section className="rider-content"><div className="rider-page"><div style={{ textAlign: 'center', padding: '4rem 2rem' }}><p>{error}</p><button onClick={loadAll}>Retry</button></div></div></section></div>;

  return <div className="rider-layout">
    <button className="rider-mobile-toggle" onClick={() => setSidebarOpen(true)} aria-label="Open rider navigation"><FiMenu /></button>
    {sidebarOpen && <button className="rider-scrim" onClick={() => setSidebarOpen(false)} />}
    <aside className={`rider-sidebar ${sidebarOpen ? 'open' : ''}`}>
      <div className="rider-sidebar-brand"><span className="rider-brand-mark">♜</span><span>CHÂTEAU<span>254</span><small>RIDER PORTAL</small></span><button onClick={() => setSidebarOpen(false)}><FiX /></button></div>
      <div className="rider-profile">
        <div className="rider-avatar">{rider?.full_name?.slice(0, 2).toUpperCase() || 'RD'}</div>
        <div>
          <strong>{rider?.full_name || 'Rider'}</strong>
          <small>{rider?.status === 'online' ? 'Online' : rider?.status === 'on_break' ? 'On break' : 'Offline'}</small>
        </div>
      </div>
      <nav className="rider-nav">
        <button className={activeTab === 'deliveries' ? 'active' : ''} onClick={() => setActiveTab('deliveries')}><FiTruck /> Deliveries <b>{deliveries.length}</b></button>
        <button className={activeTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')}><FiClock /> History</button>
      </nav>
      <div style={{ padding: '0 1rem' }}>
        <div className="rider-status" onClick={toggleOnlineStatus} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '8px', background: rider?.status === 'online' ? '#e8f5e9' : '#f5f5f5', border: `1px solid ${rider?.status === 'online' ? '#4CAF50' : '#ddd'}` }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: rider?.status === 'online' ? '#4CAF50' : '#999' }} />
          <span style={{ fontSize: '14px', fontWeight: 500 }}>{rider?.status === 'online' ? 'Online — Accepting deliveries' : 'Go online'}</span>
        </div>
        {rider?.status === 'online' && (
          <div style={{ marginTop: '8px', padding: '8px 12px', borderRadius: '8px', background: gpsError ? '#fff3e0' : riderLocation ? '#e8f5e9' : '#fff8e1', border: `1px solid ${gpsError ? '#FF9800' : riderLocation ? '#4CAF50' : '#FFC107'}`, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {gpsError ? (
              <><FiAlertTriangle size={14} color="#FF9800" /><span style={{ color: '#e65100' }}>GPS: {gpsError}</span></>
            ) : riderLocation ? (
              <><FiMapPin size={14} color="#4CAF50" /><span style={{ color: '#2e7d32' }}>GPS active{accuracy ? ` (~${Math.round(accuracy)}m)` : ''}</span></>
            ) : (
              <><FiRefreshCw className="spin" size={14} color="#F9A825" /><span style={{ color: '#f57f17' }}>Getting GPS fix...</span></>
            )}
          </div>
        )}
      </div>
      <button className="rider-logout" onClick={onLogout}><FiLogOut /> Sign out</button>
    </aside>

    <section className="rider-content">
      <div className="rider-page" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {activeTab === 'deliveries' && <>
          <div style={{ display: 'grid', gridTemplateColumns: selectedDelivery ? 'var(--rider-grid-cols)' : '1fr', gap: '1rem', minHeight: 'calc(100vh - 140px)' }}>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p className="eyebrow">Active deliveries</p>
                  <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{deliveries.length} order{deliveries.length !== 1 ? 's' : ''} assigned</h2>
                </div>
                <button onClick={() => fetchActiveOrders()} style={{ background: 'none', border: '1px solid #ddd', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}><FiRefreshCw size={14} /> Refresh</button>
              </div>

              {!deliveries.length ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#999', background: '#fafafa', borderRadius: '12px', border: '1px dashed #ddd' }}>
                  <FiCheck size={40} style={{ marginBottom: '0.75rem', opacity: 0.3 }} />
                  <h3 style={{ margin: '0 0 0.25rem', color: '#333' }}>No active deliveries</h3>
                  <p style={{ margin: 0, fontSize: '14px' }}>Go online to start receiving orders</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {deliveries.map((order) => {
                    const isSelected = order.id === selectedId;
                    const isPreparing = order.status === 'preparing';
                    return (
                      <div
                        key={order.id}
                        onClick={() => { setSelectedId(order.id); setActiveTab('deliveries'); }}
                        style={{
                          padding: '14px 16px',
                          borderRadius: '10px',
                          border: `2px solid ${isSelected ? '#e53935' : '#e8e8e8'}`,
                          background: isSelected ? '#fff5f5' : 'white',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#e53935', background: '#ffebee', padding: '2px 8px', borderRadius: '4px' }}>#{order.id.slice(0, 8)}</span>
                            <span style={{ marginLeft: '8px', fontSize: '12px', color: isPreparing ? '#FF9800' : '#4CAF50', fontWeight: 500 }}>{isPreparing ? 'Ready for pickup' : 'Out for delivery'}</span>
                          </div>
                          <FiChevronRight size={16} color={isSelected ? '#e53935' : '#ccc'} />
                        </div>
                        <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: '14px' }}>{order.customer_name || 'Customer'}</p>
                        <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#666', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <FiMapPin size={12} /> {order.delivery_address?.slice(0, 50) || 'No address'}{order.delivery_address?.length > 50 ? '...' : ''}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600 }}>{formatCurrency(order.total_amount)}</span>
                          <span style={{ fontSize: '12px', color: '#999' }}>{formatTime(order.created_at)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedDelivery && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e8e8e8', overflow: 'hidden' }}>
                  <div className="rider-map-container" style={{ height: '300px' }}>
                    <RiderMap
                      riderLocation={riderLocation}
                      customerLocation={selectedLocation}
                      orderAddress={selectedDelivery.delivery_address}
                    />
                  </div>
                </div>

                {routeLoading && (
                  <div style={{ textAlign: 'center', padding: '0.75rem', color: '#666', fontSize: '13px' }}>
                    <FiRefreshCw className="spin" size={14} style={{ marginRight: '6px' }} /> Calculating route...
                  </div>
                )}

                {routeInfo && (
                  <div className="rider-route-info" style={{ display: 'flex', gap: '0.75rem' }}>
                    <div style={{ flex: 1, background: '#f8f9fa', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                      <FiNavigation size={16} color="#2196F3" style={{ marginBottom: '4px' }} />
                      <div style={{ fontSize: '18px', fontWeight: 700 }}>{formatDistance(routeInfo.distance)}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>Distance</div>
                    </div>
                    <div style={{ flex: 1, background: '#f8f9fa', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                      <FiClock size={16} color="#4CAF50" style={{ marginBottom: '4px' }} />
                      <div style={{ fontSize: '18px', fontWeight: 700 }}>{formatDuration(routeInfo.duration)}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>ETA</div>
                    </div>
                  </div>
                )}

                <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e8e8e8', padding: '16px' }}>
                  <h3 style={{ margin: '0 0 12px', fontSize: '14px' }}>Order Details</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}><span style={{ color: '#666' }}>Customer</span><span style={{ fontWeight: 600 }}>{selectedDelivery.customer_name || '—'}</span></div>
                    {selectedDelivery.customer_phone && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span style={{ color: '#666' }}>Phone</span>
                        <a href={`tel:${selectedDelivery.customer_phone}`} style={{ fontWeight: 600, color: '#e53935', textDecoration: 'none' }}>{selectedDelivery.customer_phone}</a>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}><span style={{ color: '#666' }}>Address</span><span style={{ fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>{selectedDelivery.delivery_address || '—'}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}><span style={{ color: '#666' }}>Total</span><span style={{ fontWeight: 700 }}>{formatCurrency(selectedDelivery.total_amount)}</span></div>
                  </div>
                </div>

                <div className="rider-action-buttons" style={{ display: 'flex', gap: '0.5rem' }}>
                  {selectedLocation && (
                    <button onClick={() => setNavigating(true)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '12px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                      <FiNavigation size={16} /> Navigate
                    </button>
                  )}
                  {selectedDelivery.customer_phone && (
                    <a href={`tel:${selectedDelivery.customer_phone}`} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '12px', background: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: '10px', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>
                      <FiPhone size={16} /> Call
                    </a>
                  )}
                  <button
                    disabled={updatingId === selectedDelivery.id}
                    onClick={() => {
                      if (selectedDelivery.status === 'preparing') updateStatus(selectedDelivery.id, 'out_for_delivery');
                      else updateStatus(selectedDelivery.id, 'completed');
                    }}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '12px', background: selectedDelivery.status === 'preparing' ? '#FF9800' : '#4CAF50', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    <FiCheck size={16} /> {updatingId === selectedDelivery.id ? 'Updating...' : selectedDelivery.status === 'preparing' ? 'Pick up order' : 'Mark delivered'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>}

        {activeTab === 'history' && <>
          <div>
            <p className="eyebrow">Past deliveries</p>
            <h2 style={{ margin: '0 0 1rem', fontSize: '1.25rem' }}>{completed.length} completed</h2>
          </div>
          {completed.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {completed.map((order) => (
                <div key={order.id} style={{ padding: '14px 16px', borderRadius: '10px', border: '1px solid #e8e8e8', background: 'white' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#4CAF50', background: '#e8f5e9', padding: '2px 8px', borderRadius: '4px' }}>#{order.id.slice(0, 8)}</span>
                    <span style={{ fontSize: '12px', color: '#4CAF50', fontWeight: 500 }}><FiCheck size={12} /> Completed</span>
                  </div>
                  <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: '14px' }}>{order.customer_name || 'Customer'}</p>
                  <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#666' }}><FiMapPin size={12} /> {order.delivery_address || 'N/A'}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>{formatCurrency(order.total_amount)}</span>
                    <span style={{ fontSize: '12px', color: '#999' }}>{formatTime(order.updated_at || order.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>
              <FiClock size={40} style={{ marginBottom: '0.75rem', opacity: 0.3 }} />
              <p>No completed deliveries yet</p>
            </div>
          )}
        </>}

      </div>
    </section>

    {navigating && selectedDelivery && selectedLocation && (
      <NavigationPage
        order={selectedDelivery}
        riderLocation={riderLocation}
        customerLocation={selectedLocation}
        onClose={() => setNavigating(false)}
      />
    )}
  </div>;
};

export default RiderDashboard;
