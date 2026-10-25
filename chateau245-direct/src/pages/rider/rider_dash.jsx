import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FiCheck,
  FiClock,
  FiLogOut,
  FiMapPin,
  FiMenu,
  FiPhone,
  FiTruck,
  FiX,
  FiRefreshCw,
  FiNavigation,
  FiAlertTriangle,
  FiExternalLink,
  FiCopy,
  FiPackage,
  FiRadio,
} from 'react-icons/fi';
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
  const [copiedId, setCopiedId] = useState(null);

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

  const handleCopyAddress = (text, id) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const selectedDelivery = deliveries.find((o) => o.id === selectedId) || null;
  const selectedLocation = selectedId ? customerLocations[selectedId] : null;

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };
  const formatCurrency = (amount) => `KES ${Number(amount).toLocaleString()}`;
  const formatDistance = (m) => (!m ? '—' : m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`);
  const formatDuration = (s) => {
    if (!s) return '—';
    const mins = Math.round(s / 60);
    return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`;
  };

  if (loading) {
    return (
      <div className="rider-layout">
        <section className="rider-content">
          <div className="rider-page" style={{ textAlign: 'center', padding: '6rem 2rem' }}>
            <FiRefreshCw className="spin" size={36} color="var(--gold-deep)" />
            <h3 style={{ marginTop: '16px', color: 'var(--text-strong)' }}>Loading Rider Dispatch...</h3>
          </div>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rider-layout">
        <section className="rider-content">
          <div className="rider-page" style={{ textAlign: 'center', padding: '6rem 2rem' }}>
            <FiAlertTriangle size={42} color="var(--warning)" style={{ marginBottom: '12px' }} />
            <h3 style={{ color: 'var(--text-strong)', margin: '0 0 8px' }}>Connection Error</h3>
            <p style={{ color: 'var(--text-muted)', margin: '0 0 16px' }}>{error}</p>
            <button className="rider-refresh-btn" onClick={loadAll}>
              <FiRefreshCw size={14} /> Retry Connection
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="rider-layout">
      {/* Mobile Sidebar Hamburger Toggle */}
      <button
        className="rider-mobile-toggle"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open Rider Navigation"
      >
        <FiMenu />
      </button>

      {/* Scrim Overlay */}
      {sidebarOpen && (
        <button
          className="rider-scrim"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close Navigation"
        />
      )}

      {/* Left Sidebar */}
      <aside className={`rider-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="rider-sidebar-brand">
          <span className="rider-brand-mark">♜</span>
          <div className="brand-text">
            <span>CHÂTEAU <span className="brand-gold">254</span></span>
            <small>Rider Dispatch Portal</small>
          </div>
          <button
            className="rider-sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close Sidebar"
          >
            <FiX />
          </button>
        </div>

        {/* Rider Profile Card */}
        <div className="rider-profile-card">
          <div className="rider-avatar">
            {rider?.full_name?.slice(0, 2).toUpperCase() || 'RD'}
          </div>
          <div className="rider-profile-info">
            <span className="rider-profile-name">{rider?.full_name || user?.full_name || 'Rider'}</span>
            <span className="rider-profile-badge">
              <span className={`dot ${rider?.status === 'online' ? 'online' : 'offline'}`} />
              {rider?.status === 'online' ? 'Online & Active' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="rider-nav">
          <button
            type="button"
            className={`rider-nav-btn ${activeTab === 'deliveries' ? 'active' : ''}`}
            onClick={() => { setActiveTab('deliveries'); setSidebarOpen(false); }}
          >
            <FiTruck size={17} />
            <span>Active Deliveries</span>
            {deliveries.length > 0 && <span className="rider-nav-badge">{deliveries.length}</span>}
          </button>
          <button
            type="button"
            className={`rider-nav-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => { setActiveTab('history'); setSidebarOpen(false); }}
          >
            <FiClock size={17} />
            <span>Delivery History</span>
            {completed.length > 0 && (
              <span className="rider-nav-badge" style={{ background: 'var(--surface-muted)', color: 'var(--text-on-dark-muted)' }}>
                {completed.length}
              </span>
            )}
          </button>
        </nav>

        {/* Status Switch & GPS Diagnostics */}
        <div className="rider-sidebar-controls">
          <div
            className={`rider-status-switch ${rider?.status === 'online' ? 'online' : 'offline'}`}
            onClick={toggleOnlineStatus}
            role="button"
            tabIndex={0}
            title="Toggle online availability"
          >
            <span className="rider-status-switch-label">
              <span className="rider-status-pulse-dot" />
              {rider?.status === 'online' ? 'Online · Accepting Orders' : 'Go Online'}
            </span>
            <span style={{ fontSize: '11px', opacity: 0.8 }}>
              {rider?.status === 'online' ? 'Active' : 'Offline'}
            </span>
          </div>

          {rider?.status === 'online' && (
            <div className={`rider-gps-pill ${gpsError ? 'warning' : riderLocation ? 'active' : ''}`}>
              {gpsError ? (
                <>
                  <FiAlertTriangle size={15} color="#ffb74d" />
                  <span>GPS Error: {gpsError}</span>
                </>
              ) : riderLocation ? (
                <>
                  <FiRadio size={15} color="#81c784" />
                  <span>GPS Connected {accuracy ? `(±${Math.round(accuracy)}m)` : ''}</span>
                </>
              ) : (
                <>
                  <FiRefreshCw className="spin" size={14} color="var(--gold-deep)" />
                  <span>Acquiring satellite fix...</span>
                </>
              )}
            </div>
          )}

          <button type="button" className="rider-logout-btn" onClick={onLogout}>
            <FiLogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main Delivery Cockpit Section */}
      <section className="rider-content">
        <div className="rider-page">
          {/* Top Header Bar */}
          <header className="rider-page-header">
            <div className="rider-header-left">
              <p className="eyebrow">Delivery Cockpit</p>
              <h1>{activeTab === 'deliveries' ? 'Active Dispatch & Routes' : 'Past Delivery History'}</h1>
            </div>

            <div className="rider-header-actions">
              <div className={`rider-live-chip ${isConnected ? 'connected' : ''}`}>
                <span className="rider-live-chip-dot" />
                <span>{isConnected ? 'Live Sync' : 'Reconnecting...'}</span>
              </div>
              <button
                type="button"
                className="rider-refresh-btn"
                onClick={() => { fetchActiveOrders(); fetchCompletedOrders(); }}
              >
                <FiRefreshCw size={14} /> Refresh
              </button>
            </div>
          </header>

          {/* DELIVERIES TAB */}
          {activeTab === 'deliveries' && (
            <div className={`rider-dispatch-grid ${!selectedDelivery ? 'single-column' : ''}`}>
              {/* Left Column: Assigned Orders Dispatch Queue */}
              <div className="rider-queue-panel">
                <div className="rider-queue-header">
                  <h3>Assigned Orders</h3>
                  <span className="rider-queue-count">{deliveries.length}</span>
                </div>

                {!deliveries.length ? (
                  <div className="rider-empty-queue">
                    <div className="rider-empty-queue-icon">
                      <FiTruck />
                    </div>
                    <h3>No Active Deliveries</h3>
                    <p>You have no pending orders. Stay online to receive incoming drop-offs in real time.</p>
                    {rider?.status !== 'online' && (
                      <button
                        type="button"
                        className="rider-act-btn nav-primary"
                        onClick={toggleOnlineStatus}
                        style={{ minWidth: '180px' }}
                      >
                        Go Online Now
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="rider-queue-list">
                    {deliveries.map((order) => {
                      const isSelected = order.id === selectedId;
                      const isPreparing = order.status === 'preparing';

                      return (
                        <div
                          key={order.id}
                          className={`rider-order-card ${isSelected ? 'selected' : ''}`}
                          onClick={() => { setSelectedId(order.id); setActiveTab('deliveries'); }}
                        >
                          <div className="rider-card-top-row">
                            <span className="rider-order-id-badge">#{order.id.slice(0, 8)}</span>
                            <span className={`rider-status-pill ${isPreparing ? 'status-pickup' : 'status-delivery'}`}>
                              {isPreparing ? <FiPackage size={12} /> : <FiTruck size={12} />}
                              {isPreparing ? 'Ready for Pickup' : 'Out for Delivery'}
                            </span>
                          </div>

                          <h4 className="rider-card-customer">{order.customer_name || 'Customer'}</h4>

                          <p className="rider-card-address">
                            <FiMapPin size={14} />
                            <span>{order.delivery_address || 'No address provided'}</span>
                          </p>

                          <div className="rider-card-bottom-row">
                            <span className="rider-card-price">{formatCurrency(order.total_amount)}</span>
                            <span className="rider-card-time">{formatTime(order.created_at)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Column: Live Map Cockpit & Action Controls */}
              {selectedDelivery && (
                <div className="rider-cockpit">
                  {/* Cockpit Top Bar */}
                  <div className="rider-cockpit-bar">
                    <div className="rider-cockpit-dest">
                      <div className="rider-cockpit-dest-icon">
                        <FiMapPin size={20} />
                      </div>
                      <div className="rider-cockpit-dest-text">
                        <strong>{selectedDelivery.customer_name || 'Customer'}</strong>
                        <span>{selectedDelivery.delivery_address || 'Address pending...'}</span>
                      </div>
                    </div>

                    <div className="rider-cockpit-tools">
                      {selectedDelivery.delivery_address && (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedDelivery.delivery_address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rider-external-map-btn"
                          title="Open navigation in Google Maps app"
                        >
                          <FiExternalLink size={14} />
                          <span>Google Maps</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Route Quick Metrics */}
                  <div className="rider-metrics-bar">
                    <div className="rider-metric-item">
                      <div className="rider-metric-icon blue">
                        <FiNavigation size={18} />
                      </div>
                      <div className="rider-metric-text">
                        <span className="rider-metric-value">
                          {routeLoading ? (
                            <FiRefreshCw className="spin" size={15} style={{ verticalAlign: 'middle' }} />
                          ) : (
                            formatDistance(routeInfo?.distance)
                          )}
                        </span>
                        <span className="rider-metric-label">Route Distance</span>
                      </div>
                    </div>

                    <div className="rider-metric-item">
                      <div className="rider-metric-icon green">
                        <FiClock size={18} />
                      </div>
                      <div className="rider-metric-text">
                        <span className="rider-metric-value">
                          {routeLoading ? (
                            <FiRefreshCw className="spin" size={15} style={{ verticalAlign: 'middle' }} />
                          ) : (
                            formatDuration(routeInfo?.duration)
                          )}
                        </span>
                        <span className="rider-metric-label">Estimated ETA</span>
                      </div>
                    </div>

                    <div className="rider-metric-item">
                      <div className="rider-metric-icon gold">
                        {selectedDelivery.status === 'preparing' ? <FiPackage size={18} /> : <FiTruck size={18} />}
                      </div>
                      <div className="rider-metric-text">
                        <span className="rider-metric-value" style={{ fontSize: '15px' }}>
                          {selectedDelivery.status === 'preparing' ? 'At Kitchen' : 'En Route'}
                        </span>
                        <span className="rider-metric-label">Current Stage</span>
                      </div>
                    </div>
                  </div>

                  {/* The Interactive Route Map */}
                  <RiderMap
                    riderLocation={riderLocation}
                    customerLocation={selectedLocation}
                    orderAddress={selectedDelivery.delivery_address}
                    onRouteCalculated={(calculatedRoute) => {
                      if (calculatedRoute && !routeInfo) {
                        setRouteInfo(calculatedRoute);
                      }
                    }}
                  />

                  {/* Order Details Card */}
                  <div className="rider-details-card">
                    <h4>Delivery Details</h4>
                    <div className="rider-details-grid">
                      <div className="rider-detail-row">
                        <span className="rider-detail-label">Recipient</span>
                        <span className="rider-detail-value">{selectedDelivery.customer_name || 'Guest'}</span>
                      </div>

                      {selectedDelivery.customer_phone && (
                        <div className="rider-detail-row">
                          <span className="rider-detail-label">Direct Contact</span>
                          <a href={`tel:${selectedDelivery.customer_phone}`} className="rider-detail-value phone-link">
                            <FiPhone size={14} /> {selectedDelivery.customer_phone}
                          </a>
                        </div>
                      )}

                      <div className="rider-detail-row" style={{ gridColumn: '1 / -1' }}>
                        <span className="rider-detail-label">Drop-off Address</span>
                        <div className="rider-address-copy-row">
                          <span className="rider-detail-value">{selectedDelivery.delivery_address || '—'}</span>
                          {selectedDelivery.delivery_address && (
                            <button
                              type="button"
                              className="rider-copy-btn"
                              onClick={() => handleCopyAddress(selectedDelivery.delivery_address, selectedDelivery.id)}
                            >
                              <FiCopy size={12} /> {copiedId === selectedDelivery.id ? 'Copied!' : 'Copy'}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="rider-detail-row">
                        <span className="rider-detail-label">Total Payment</span>
                        <span className="rider-detail-value" style={{ color: 'var(--brand)', fontSize: '16px' }}>
                          {formatCurrency(selectedDelivery.total_amount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tactile Big Action Command Buttons */}
                  <div className="rider-actions-bar">
                    {selectedLocation && (
                      <button
                        type="button"
                        className="rider-act-btn nav-primary"
                        onClick={() => setNavigating(true)}
                      >
                        <FiNavigation size={18} />
                        <span>Start Turn-by-Turn</span>
                      </button>
                    )}

                    {selectedDelivery.customer_phone && (
                      <a
                        href={`tel:${selectedDelivery.customer_phone}`}
                        className="rider-act-btn call-secondary"
                      >
                        <FiPhone size={17} />
                        <span>Call Customer</span>
                      </a>
                    )}

                    <button
                      type="button"
                      disabled={updatingId === selectedDelivery.id}
                      className={`rider-act-btn ${selectedDelivery.status === 'preparing' ? 'stage-pickup' : 'stage-complete'}`}
                      onClick={() => {
                        if (selectedDelivery.status === 'preparing') {
                          updateStatus(selectedDelivery.id, 'out_for_delivery');
                        } else {
                          updateStatus(selectedDelivery.id, 'completed');
                        }
                      }}
                    >
                      {updatingId === selectedDelivery.id ? (
                        <FiRefreshCw className="spin" size={17} />
                      ) : (
                        <FiCheck size={18} />
                      )}
                      <span>
                        {updatingId === selectedDelivery.id
                          ? 'Updating Status...'
                          : selectedDelivery.status === 'preparing'
                          ? 'Pick Up Order'
                          : 'Mark as Delivered'}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            <div>
              {completed.length ? (
                <div className="rider-history-list">
                  {completed.map((order) => (
                    <div key={order.id} className="rider-history-card">
                      <div className="rider-history-main">
                        <div className="rider-history-top">
                          <span className="rider-history-id">#{order.id.slice(0, 8)}</span>
                          <span className="rider-status-pill status-delivery">
                            <FiCheck size={12} /> Delivered
                          </span>
                          <span className="rider-history-time">
                            {formatTime(order.updated_at || order.created_at)}
                          </span>
                        </div>
                        <h4 className="rider-history-customer">{order.customer_name || 'Customer'}</h4>
                        <p className="rider-history-address">{order.delivery_address || 'N/A'}</p>
                      </div>
                      <div className="rider-history-amount">
                        {formatCurrency(order.total_amount)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rider-empty-queue">
                  <div className="rider-empty-queue-icon">
                    <FiClock />
                  </div>
                  <h3>No Delivered Orders Yet</h3>
                  <p>Completed drop-offs from your shift will be recorded here.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Turn-by-Turn Fullscreen Navigation HUD */}
      {navigating && selectedDelivery && selectedLocation && (
        <NavigationPage
          order={selectedDelivery}
          riderLocation={riderLocation}
          customerLocation={selectedLocation}
          onClose={() => setNavigating(false)}
        />
      )}
    </div>
  );
};

export default RiderDashboard;
