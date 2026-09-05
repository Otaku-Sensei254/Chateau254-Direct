import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiCheck, FiClock, FiDollarSign, FiGrid, FiList, FiLogOut, FiMapPin, FiMenu, FiPhone, FiShoppingBag, FiTruck, FiX, FiRefreshCw } from 'react-icons/fi';

const RiderDashboard = ({ user, token, api, onLogout }) => {
  const [rider, setRider] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [error, setError] = useState(null);

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }), [token]);

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
      } else {
        setDeliveries((prev) => prev.map((o) => o.id === orderId ? { ...o, status: newStatus } : o));
      }
      setSelectedId((prev) => {
        if (prev !== orderId) return prev;
        return deliveries.find((o) => o.id !== orderId)?.id || null;
      });
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

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const formatCurrency = (amount) => `KES ${Number(amount).toLocaleString()}`;

  if (loading) return <div className="rider-layout"><section className="rider-content"><div className="rider-page"><div style={{ textAlign: 'center', padding: '4rem 2rem' }}><FiRefreshCw className="spin" size={32} /><p>Loading rider dashboard...</p></div></div></section></div>;

  if (error) return <div className="rider-layout"><section className="rider-content"><div className="rider-page"><div style={{ textAlign: 'center', padding: '4rem 2rem' }}><FiRefreshCw size={32} /><p>{error}</p><button onClick={loadAll} style={{ marginTop: '1rem', padding: '0.5rem 1.5rem' }}>Retry</button></div></div></section></div>;

  return <div className="rider-layout">
    <button className="rider-mobile-toggle" onClick={() => setSidebarOpen(true)} aria-label="Open rider navigation"><FiMenu /></button>
    {sidebarOpen && <button className="rider-scrim" onClick={() => setSidebarOpen(false)} aria-label="Close rider navigation" />}
    <aside className={`rider-sidebar ${sidebarOpen ? 'open' : ''}`}>
      <div className="rider-sidebar-brand"><span className="rider-brand-mark">♜</span><span>CHÂTEAU<span>254</span><small>RIDER PORTAL</small></span><button onClick={() => setSidebarOpen(false)} aria-label="Close rider navigation"><FiX /></button></div>
      <div className="rider-profile">
        <div className="rider-avatar">{rider?.full_name?.slice(0, 2).toUpperCase() || 'RD'}</div>
        <div>
          <strong>{rider?.full_name || user?.full_name || 'Rider'}</strong>
          <small>{rider?.status === 'online' ? 'Online' : rider?.status === 'on_break' ? 'On break' : 'Offline'}</small>
        </div>
      </div>
      <nav className="rider-nav">
        <button className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}><FiGrid /> Dashboard</button>
        <button className={activeTab === 'deliveries' ? 'active' : ''} onClick={() => setActiveTab('deliveries')}><FiList /> My deliveries <b>{deliveries.length}</b></button>
        <button className={activeTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')}><FiClock /> Delivery history</button>
      </nav>
      <button className="rider-logout" onClick={onLogout}><FiLogOut /> Sign out</button>
    </aside>
    <section className="rider-content"><div className="rider-page">
    <div className="rider-heading">
      <div>
        <p className="eyebrow">Delivery partner workspace</p>
        <h2>Welcome, {rider?.full_name || user?.full_name || 'Rider'}</h2>
        <p>Complete your active deliveries and keep customers updated.</p>
      </div>
      <div className="rider-status" onClick={toggleOnlineStatus} style={{ cursor: 'pointer' }}>
        <i /><span>{rider?.status === 'online' ? 'Online' : 'Offline'}</span>
      </div>
    </div>

    <div className="rider-stats">
      <div><FiTruck /><span><strong>{deliveries.length}</strong> active deliveries</span></div>
      <div><FiCheck /><span><strong>{completed.length}</strong> completed today</span></div>
      <div><FiClock /><span><strong>{completed.length}</strong> total delivered</span></div>
    </div>

    {selectedDelivery && activeTab !== 'history' && <section className="rider-map-section">
      <div className="rider-map-heading">
        <div>
          <span className="rider-order-number">DROP-OFF MAP</span>
          <h3>Delivery #{selectedDelivery.id.slice(0, 8)}</h3>
          <p><FiMapPin /> {selectedDelivery.delivery_address || 'Address not provided'}</p>
        </div>
      </div>
    </section>}

    {activeTab === 'history' && <>
      <div className="rider-section-title"><h3>Delivery history</h3><span>{completed.length} orders completed</span></div>
      {completed.length ? <div className="rider-delivery-list">{completed.map((order) => <article key={order.id} className="rider-delivery-card"><div className="rider-card-top"><div><span className="rider-order-number">#{order.id.slice(0, 8)}</span><h3>{order.customer_name || 'Customer'}</h3></div><span className="rider-stage" style={{ color: '#4caf50' }}><FiCheck /> Completed</span></div><div className="rider-card-details"><div><FiMapPin /><span><small>Delivery address</small><strong>{order.delivery_address || 'N/A'}</strong></span></div><div><FiDollarSign /><span><small>Amount</small><strong>{formatCurrency(order.total_amount)}</strong></span></div></div></article>)}</div> : <div className="rider-empty"><FiClock /><h3>No completed deliveries yet</h3><p>Your delivery history will appear here.</p></div>}
    </>}

    {activeTab !== 'history' && <>
      <div className="rider-section-title"><h3>Active deliveries</h3><span>{deliveries.length} orders remaining</span></div>
      {deliveries.length ? <div className="rider-delivery-list">{deliveries.map((order) => <DeliveryCard key={order.id} order={order} selected={order.id === selectedDelivery?.id} onSelect={() => setSelectedId(order.id)} onUpdateStatus={updateStatus} updating={updatingId === order.id} formatTime={formatTime} formatCurrency={formatCurrency} />)}</div> : <div className="rider-empty"><FiCheck /><h3>All deliveries completed</h3><p>There are no orders waiting for delivery.</p></div>}
    </>}

    </div></section>
  </div>;
};

const DeliveryCard = ({ order, selected, onSelect, onUpdateStatus, updating, formatTime, formatCurrency }) => {
  const isPreparing = order.status === 'preparing';
  return <article className={`rider-delivery-card ${selected ? 'selected' : ''}`} onClick={onSelect}>
    <div className="rider-card-top">
      <div>
        <span className="rider-order-number">#{order.id.slice(0, 8)}</span>
        <h3>{order.customer_name || 'Customer'}</h3>
      </div>
      <span className="rider-stage">
        <FiTruck /> {isPreparing ? 'Ready for pickup' : 'Out for delivery'}
      </span>
    </div>
    <div className="rider-card-details">
      <div><FiMapPin /><span><small>Delivery address</small><strong>{order.delivery_address || 'Not specified'}</strong></span></div>
      <div><FiShoppingBag /><span><small>Order total</small><strong>{formatCurrency(order.total_amount)}</strong></span></div>
      <div><FiClock /><span><small>Placed at</small><strong>{formatTime(order.created_at)}</strong></span></div>
    </div>
    <div className="rider-card-actions">
      {order.customer_phone && <a href={`tel:${order.customer_phone}`} onClick={(event) => event.stopPropagation()}><FiPhone /> Call customer</a>}
      <button className="rider-complete" disabled={updating} onClick={(event) => {
        event.stopPropagation();
        if (isPreparing) onUpdateStatus(order.id, 'out_for_delivery');
        else onUpdateStatus(order.id, 'completed');
      }}>
        <FiCheck /> {updating ? 'Updating...' : isPreparing ? 'Pick up order' : 'Mark as delivered'}
      </button>
    </div>
  </article>;
};

export default RiderDashboard;
