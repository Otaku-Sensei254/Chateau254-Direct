import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiBarChart2, FiCalendar, FiChevronDown, FiEdit2, FiGift, FiGrid, FiLogOut, FiMenu, FiPackage, FiPlus, FiSave, FiSettings, FiShoppingBag, FiTable, FiTrash2, FiTruck, FiUsers, FiX, FiRefreshCw, FiMap } from 'react-icons/fi';
import { Brand } from '../shared';
import AdminFleetMap from '../../../components/AdminFleetMap';
import { useSocket } from '../../../contexts/SocketContext';

const AdminDashboard = ({ user, token, api, onLogout }) => {
  const [activePage, setActivePage] = useState('Dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [menu, setMenu] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [riders, setRiders] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [tables, setTables] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [editingTable, setEditingTable] = useState(null);
  const [riderEditorOpen, setRiderEditorOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingOrder, setUpdatingOrder] = useState(null);

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }), [token]);
  const { isConnected, joinRoom, leaveRoom, on, off } = useSocket();

  useEffect(() => {
    if (!isConnected) return;
    joinRoom('admin');
    const handleOrderCreated = () => fetchOrders();
    const handleOrderStatusChanged = () => fetchOrders();
    const handleRiderLocation = () => fetchRiders();
    const handleBookingCreated = () => fetchBookings();
    const handleBookingUpdated = () => { fetchBookings(); fetchTables(); };
    on('order:created', handleOrderCreated);
    on('order:status_changed', handleOrderStatusChanged);
    on('rider:location_updated', handleRiderLocation);
    on('booking:created', handleBookingCreated);
    on('booking:updated', handleBookingUpdated);
    return () => { leaveRoom('admin'); off('order:created', handleOrderCreated); off('order:status_changed', handleOrderStatusChanged); off('rider:location_updated', handleRiderLocation); off('booking:created', handleBookingCreated); off('booking:updated', handleBookingUpdated); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  const fetchOrders = useCallback(async () => {
    const res = await fetch(`${api}/orders`, { headers });
    if (!res.ok) throw new Error('Failed to load orders');
    const data = await res.json();
    setOrders(data.orders || []);
  }, [api, headers]);

  const fetchMenu = useCallback(async () => {
    const res = await fetch(`${api}/menu?all=true`, { headers });
    if (!res.ok) throw new Error('Failed to load menu');
    const data = await res.json();
    setMenu(data.items || []);
  }, [api, headers]);

  const fetchCustomers = useCallback(async () => {
    const res = await fetch(`${api}/customers`, { headers });
    if (!res.ok) throw new Error('Failed to load customers');
    const data = await res.json();
    setCustomers(data.customers || []);
  }, [api, headers]);

  const fetchRiders = useCallback(async () => {
    const res = await fetch(`${api}/riders`, { headers });
    if (!res.ok) throw new Error('Failed to load riders');
    const data = await res.json();
    setRiders(data.riders || []);
  }, [api, headers]);

  const fetchBookings = useCallback(async () => {
    const res = await fetch(`${api}/bookings`, { headers });
    if (!res.ok) throw new Error('Failed to load reservations');
    const data = await res.json();
    setBookings(data.bookings || []);
  }, [api, headers]);

  const fetchTables = useCallback(async () => {
    const res = await fetch(`${api}/tables`, { headers });
    if (!res.ok) throw new Error('Failed to load tables');
    const data = await res.json();
    setTables(data.tables || []);
  }, [api, headers]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchOrders(), fetchMenu(), fetchCustomers(), fetchRiders(), fetchBookings(), fetchTables()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchOrders, fetchMenu, fetchCustomers, fetchRiders, fetchBookings, fetchTables]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const selectPage = (page) => {
    setActivePage(page);
    setSidebarOpen(false);
  };

  const updateOrderStatus = async (orderId, status, riderId) => {
    setUpdatingOrder(orderId);
    try {
      const body = { status };
      if (riderId) body.rider_id = riderId;
      const res = await fetch(`${api}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to update order');
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status } : o));
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdatingOrder(null);
    }
  };

  const saveMenuItem = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = { name: form.get('name'), category: form.get('category'), price: Number(form.get('price')), availability: true };
    try {
      if (editingItem?.id) {
        const res = await fetch(`${api}/menu/${editingItem.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error('Failed to update menu item');
        const data = await res.json();
        setMenu((prev) => prev.map((item) => item.id === editingItem.id ? data.item : item));
      } else {
        const res = await fetch(`${api}/menu`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error('Failed to add menu item');
        const data = await res.json();
        setMenu((prev) => [...prev, data.item]);
      }
      setEditingItem(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const deleteMenuItem = async (itemId) => {
    try {
      const res = await fetch(`${api}/menu/${itemId}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error('Failed to delete menu item');
      setMenu((prev) => prev.filter((item) => item.id !== itemId));
    } catch (err) {
      alert(err.message);
    }
  };

  const addRider = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const res = await fetch(`${api}/riders`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: form.get('name'), phone: form.get('phone') }),
      });
      if (!res.ok) throw new Error('Failed to add rider');
      const data = await res.json();
      setRiders((prev) => [...prev, data.rider]);
      setRiderEditorOpen(false);
    } catch (err) {
      alert(err.message);
    }
  };

  const removeRider = async (riderId) => {
    try {
      const res = await fetch(`${api}/riders/${riderId}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error('Failed to remove rider');
      setRiders((prev) => prev.filter((r) => r.id !== riderId));
    } catch (err) {
      alert(err.message);
    }
  };

  const saveTable = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = { table_number: Number(form.get('table_number')), capacity: Number(form.get('capacity')) };
    try {
      if (editingTable?.id) {
        const res = await fetch(`${api}/tables/${editingTable.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error('Failed to update table');
        const data = await res.json();
        setTables((prev) => prev.map((t) => t.id === editingTable.id ? data.table : t));
      } else {
        const res = await fetch(`${api}/tables`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error('Failed to create table');
        const data = await res.json();
        setTables((prev) => [...prev, data.table]);
      }
      setEditingTable(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const updateTableStatus = async (tableId, status) => {
    try {
      const res = await fetch(`${api}/tables/${tableId}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update table status');
      setTables((prev) => prev.map((t) => t.id === tableId ? { ...t, status } : t));
    } catch (err) {
      alert(err.message);
    }
  };

  const deleteTable = async (tableId) => {
    try {
      const res = await fetch(`${api}/tables/${tableId}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error('Failed to delete table');
      setTables((prev) => prev.filter((t) => t.id !== tableId));
    } catch (err) {
      alert(err.message);
    }
  };

  const assignTableToBooking = async (bookingId, tableId) => {
    try {
      const res = await fetch(`${api}/bookings/${bookingId}/table`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ table_id: tableId }),
      });
      if (!res.ok) throw new Error('Failed to assign table');
      await Promise.all([fetchBookings(), fetchTables()]);
    } catch (err) {
      alert(err.message);
    }
  };

  const unassignTableFromBooking = async (bookingId) => {
    try {
      const res = await fetch(`${api}/bookings/${bookingId}/table`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) throw new Error('Failed to unassign table');
      await Promise.all([fetchBookings(), fetchTables()]);
    } catch (err) {
      alert(err.message);
    }
  };

  const todayOrders = orders.filter((o) => {
    const today = new Date().toDateString();
    return new Date(o.created_at).toDateString() === today;
  });
  const completedToday = todayOrders.filter((o) => o.status === 'completed');
  const totalSales = todayOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  const formatCurrency = (amount) => `KES ${Number(amount).toLocaleString()}`;
  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  if (loading) return <main className="admin-page"><section className="admin-workspace"><div style={{ textAlign: 'center', padding: '4rem' }}><FiRefreshCw className="spin" size={32} /><p>Loading admin dashboard...</p></div></section></main>;

  if (error) return <main className="admin-page"><section className="admin-workspace"><div style={{ textAlign: 'center', padding: '4rem' }}><p>{error}</p><button onClick={loadAll}>Retry</button></div></section></main>;

  return <main className="admin-page">
    <button className="admin-mobile-toggle" onClick={() => setSidebarOpen(true)} aria-label="Open admin navigation"><FiMenu /></button>
    {sidebarOpen && <button className="admin-scrim" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" />}
    <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
      <div className="admin-sidebar-top"><Brand /><button className="admin-close" onClick={() => setSidebarOpen(false)} aria-label="Close admin navigation"><FiX /></button></div>
      <nav className="admin-nav">
        {[{ label: 'Dashboard', icon: FiGrid },
          { label: 'Orders', icon: FiShoppingBag, count: orders.filter((o) => o.status === 'pending').length || undefined },
          { label: 'Reservations', icon: FiCalendar, count: bookings.filter((b) => b.status === 'pending').length || undefined },
          { label: 'Tables', icon: FiTable },
          { label: 'Menu', icon: FiPackage },
          { label: 'Customers', icon: FiUsers },
          { label: 'Riders', icon: FiTruck },
          { label: 'Fleet Map', icon: FiMap },
          { label: 'Reports', icon: FiBarChart2 },
          { label: 'Promotions', icon: FiGift },
          { label: 'Settings', icon: FiSettings },
        ].map(({ label, icon: Icon, count }) => <button className={activePage === label ? 'active' : ''} key={label} onClick={() => selectPage(label)}><Icon /><span>{label}</span>{count && <b>{count}</b>}</button>)}
      </nav>
      <div className="admin-account"><div className="admin-profile"><span>{user?.full_name?.slice(0, 2).toUpperCase() || 'AD'}</span><div><strong>{user?.full_name || 'Admin'}</strong><small>Administrator</small></div></div><button className="admin-logout" onClick={onLogout}><FiLogOut /> Logout</button></div>
    </aside>
    <section className="admin-workspace">
      <header className="admin-topbar"><div><p className="eyebrow">Château254 management</p><h1>{activePage}</h1></div><div className="admin-top-actions"><div className="admin-top-avatar">{user?.full_name?.slice(0, 2).toUpperCase() || 'AD'}</div></div></header>
      {activePage === 'Dashboard' && <DashboardContent orders={orders} todayOrders={todayOrders} completedToday={completedToday} totalSales={totalSales} formatCurrency={formatCurrency} formatTime={formatTime} onOpenOrders={() => setActivePage('Orders')} />}
      {activePage === 'Orders' && <OrdersContent orders={orders} onUpdateStatus={updateOrderStatus} updatingOrder={updatingOrder} riders={riders} formatCurrency={formatCurrency} formatTime={formatTime} />}
      {activePage === 'Reservations' && <ReservationsContent bookings={bookings} tables={tables} onAssignTable={assignTableToBooking} onUnassignTable={unassignTableFromBooking} formatTime={formatTime} />}
      {activePage === 'Tables' && <TablesContent tables={tables} setEditingTable={setEditingTable} onSave={saveTable} onDelete={deleteTable} onUpdateStatus={updateTableStatus} />}
      {activePage === 'Menu' && <MenuContent menu={menu} setEditingItem={setEditingItem} onDelete={deleteMenuItem} />}
      {activePage === 'Customers' && <CustomersContent customers={customers} />}
      {activePage === 'Riders' && <RidersContent riders={riders} onAdd={() => setRiderEditorOpen(true)} onRemove={removeRider} />}
      {activePage === 'Fleet Map' && <FleetMapContent token={token} api={api} />}
      {['Reports', 'Promotions', 'Settings'].includes(activePage) && <PlaceholderContent title={activePage} />}
      {editingItem && <MenuEditor item={editingItem === true ? null : editingItem} onSave={saveMenuItem} onClose={() => setEditingItem(null)} />}
      {editingTable && <TableEditor table={editingTable === true ? null : editingTable} onSave={saveTable} onClose={() => setEditingTable(null)} />}
      {riderEditorOpen && <RiderEditor onSave={addRider} onClose={() => setRiderEditorOpen(false)} />}
    </section>
  </main>;
};

const StatCard = ({ label, value, note, icon: Icon, tone }) => <article className="admin-stat"><div><span>{label}</span><strong>{value}</strong><small className={tone === 'positive' ? 'positive' : ''}>{note}</small></div><i className={tone}><Icon /></i></article>;

const DashboardContent = ({ todayOrders, completedToday, totalSales, formatCurrency, formatTime, onOpenOrders }) => <><div className="admin-welcome"><div><h2>Dashboard overview</h2><p>Here is what is happening at Château254 today.</p></div></div><div className="admin-stats"><StatCard label="Today's Orders" value={todayOrders.length} note={`${completedToday.length} completed`} icon={FiShoppingBag} tone="orange" /><StatCard label="Total Sales" value={formatCurrency(totalSales)} note={`${todayOrders.length} orders`} icon={FiBarChart2} tone="blue" /><StatCard label="Delivered Orders" value={completedToday.length} note={todayOrders.length ? `${Math.round((completedToday.length / todayOrders.length) * 100)}% of total` : '0% of total'} icon={FiPackage} tone="green" /><StatCard label="Registered Customers" value="—" icon={FiUsers} tone="mint" /></div><div className="admin-section-heading"><h2>Recent orders</h2><button onClick={onOpenOrders}>View all orders <FiChevronDown /></button></div><OrderTable orders={todayOrders.slice(0, 5)} formatCurrency={formatCurrency} formatTime={formatTime} compact /></>;

const OrdersContent = ({ orders, onUpdateStatus, updatingOrder, riders, formatCurrency, formatTime }) => {
  const [filter, setFilter] = useState('all');
  const [selectedRiders, setSelectedRiders] = useState({});
  const filtered = filter === 'all' ? orders : orders.filter((o) => o.status === filter);
  const counts = { pending: orders.filter((o) => o.status === 'pending').length, preparing: orders.filter((o) => o.status === 'preparing').length, out_for_delivery: orders.filter((o) => o.status === 'out_for_delivery').length, completed: orders.filter((o) => o.status === 'completed').length, cancelled: orders.filter((o) => o.status === 'cancelled').length };

  return <><div className="admin-content-heading"><div><p className="eyebrow">Live order queue</p><h2>Orders</h2></div></div>
    <div className="admin-tabs">
      <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All <b>{orders.length}</b></button>
      <button className={filter === 'pending' ? 'active' : ''} onClick={() => setFilter('pending')}>New Orders <b>{counts.pending}</b></button>
      <button className={filter === 'preparing' ? 'active' : ''} onClick={() => setFilter('preparing')}>Preparing <b>{counts.preparing}</b></button>
      <button className={filter === 'out_for_delivery' ? 'active' : ''} onClick={() => setFilter('out_for_delivery')}>Out for Delivery <b>{counts.out_for_delivery}</b></button>
      <button className={filter === 'completed' ? 'active' : ''} onClick={() => setFilter('completed')}>Completed</button>
      <button className={filter === 'cancelled' ? 'active' : ''} onClick={() => setFilter('cancelled')}>Cancelled</button>
    </div>
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Amount</th><th>Address</th><th>Status</th><th>Time</th><th>Action</th></tr></thead><tbody>{filtered.map((order) => <tr key={order.id}>
      <td>#{order.id.slice(0, 8)}</td>
      <td>{order.customer_name || 'Unknown'}</td>
      <td>{order.items_count || '—'} item{(order.items_count || 0) !== 1 ? 's' : ''}</td>
      <td>{formatCurrency(order.total_amount)}</td>
      <td>{order.delivery_address || '—'}</td>
      <td><span className={`status-badge status-${order.status}`}>{order.status?.replace('_', ' ')}</span></td>
      <td>{formatTime(order.created_at)}</td>
      <td>
        {order.status === 'pending' && <>
          <button className="accept-button" disabled={updatingOrder === order.id} onClick={() => onUpdateStatus(order.id, 'preparing')}>Accept</button>
          <button className="reject-button" disabled={updatingOrder === order.id} onClick={() => onUpdateStatus(order.id, 'cancelled')}>Reject</button>
        </>}
        {order.status === 'preparing' && <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <select className="rider-select" value={selectedRiders[order.id] || ''} onChange={(e) => setSelectedRiders((prev) => ({ ...prev, [order.id]: e.target.value }))}>
            <option value="">Select rider</option>
            {riders.filter((r) => r.status === 'online').map((r) => <option key={r.id} value={r.id}>{r.full_name}</option>)}
          </select>
          <button className="accept-button" disabled={updatingOrder === order.id || !selectedRiders[order.id]} onClick={() => onUpdateStatus(order.id, 'out_for_delivery', selectedRiders[order.id])}>Send out</button>
        </div>}
      </td>
    </tr>)}{!filtered.length && <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#a0958e' }}>No orders found</td></tr>}</tbody></table></div></>;
};

const OrderTable = ({ orders, formatCurrency, formatTime, compact }) => <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Order</th><th>Customer</th><th>Amount</th><th>Address</th><th>Time</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td>#{order.id.slice(0, 8)}</td><td>{order.customer_name || 'Unknown'}</td><td>{formatCurrency(order.total_amount)}</td><td>{order.delivery_address || '—'}</td><td>{formatTime(order.created_at)}</td></tr>)}{!orders.length && <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#a0958e' }}>No orders yet</td></tr>}</tbody></table></div>;

const MenuContent = ({ menu, setEditingItem, onDelete }) => <><div className="admin-content-heading"><div><p className="eyebrow">Catalog management</p><h2>Menu items</h2></div><button className="admin-primary" onClick={() => setEditingItem(true)}><FiPlus /> Add menu item</button></div><div className="admin-menu-grid">{menu.map((item) => <article className="admin-menu-row" key={item.id}><div className="admin-menu-icon"><FiPackage /></div><div><strong>{item.name}</strong><span>{item.category}</span></div><b>KES {Number(item.price).toLocaleString()}</b><em className={item.availability !== false ? 'available' : 'unavailable'}>{item.availability !== false ? 'Available' : 'Unavailable'}</em><button onClick={() => setEditingItem(item)} aria-label={`Edit ${item.name}`}><FiEdit2 /></button><button onClick={() => { if (window.confirm(`Delete "${item.name}"?`)) onDelete(item.id); }} aria-label={`Delete ${item.name}`}><FiTrash2 /></button></article>)}</div></>;

const CustomersContent = ({ customers }) => <><div className="admin-content-heading"><div><p className="eyebrow">Loyalty and accounts</p><h2>Customers</h2></div></div><div className="customer-summary"><span><strong>{customers.length}</strong> registered customers</span><span><strong>{customers.filter((c) => c.loyalty_points > 0).length}</strong> with loyalty points</span><span><strong>{customers.reduce((sum, c) => sum + (c.loyalty_points || 0), 0).toLocaleString()}</strong> total points</span></div><div className="admin-table-wrap"><table className="admin-table customer-table"><thead><tr><th>Customer</th><th>Email</th><th>Phone</th><th>Loyalty points</th><th>Joined</th></tr></thead><tbody>{customers.map((customer) => <tr key={customer.id || customer.email}><td><strong>{customer.full_name}</strong></td><td>{customer.email}</td><td>{customer.phone || '—'}</td><td>{customer.loyalty_points || 0} pts</td><td>{new Date(customer.created_at).toLocaleDateString()}</td></tr>)}{!customers.length && <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#a0958e' }}>No customers yet</td></tr>}</tbody></table></div></>;

const RidersContent = ({ riders, onAdd, onRemove }) => <><div className="admin-content-heading"><div><p className="eyebrow">Delivery team</p><h2>Riders</h2></div><button className="admin-primary" onClick={onAdd}><FiPlus /> Add rider</button></div><div className="customer-summary"><span><strong>{riders.length}</strong> registered riders</span><span><strong>{riders.filter((r) => r.status === 'online').length}</strong> online now</span></div><div className="admin-rider-grid">{riders.map((rider) => <article className="admin-rider-row" key={rider.id}><div className="admin-rider-avatar">{rider.full_name?.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}</div><div className="admin-rider-name"><strong>{rider.full_name}</strong><span>{rider.phone}</span></div><span className={`rider-online-status ${rider.status === 'online' ? 'online' : ''}`}>{rider.status === 'online' ? 'Online' : rider.status === 'on_break' ? 'On break' : 'Offline'}</span><button className="admin-remove-rider" onClick={() => { if (window.confirm(`Remove ${rider.full_name}?`)) onRemove(rider.id); }} aria-label={`Remove ${rider.full_name}`}><FiTrash2 /></button></article>)}</div></>;

const FleetMapContent = ({ token, api }) => (
  <div style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
    <AdminFleetMap token={token} api={api} />
  </div>
);

const PlaceholderContent = ({ title }) => <div className="admin-placeholder"><div className="admin-placeholder-icon"><FiSettings /></div><h2>{title} workspace</h2><p>This section is ready for your {title.toLowerCase()} tools and data.</p></div>;

const MenuEditor = ({ item, onSave, onClose }) => <div className="admin-modal-backdrop"><form className="admin-modal" onSubmit={onSave}><button type="button" className="admin-modal-close" onClick={onClose}><FiX /></button><p className="eyebrow">Catalog management</p><h2>{item ? 'Edit menu item' : 'Add menu item'}</h2><label>Item name<input name="name" defaultValue={item?.name || ''} required /></label><label>Category<select name="category" defaultValue={item?.category || 'Meals'}><option>Meals</option><option>Wine</option><option>Drinks</option><option>Desserts</option></select></label><label>Price (KES)<input name="price" type="number" min="0" defaultValue={item?.price || ''} required /></label><button className="admin-primary" type="submit"><FiSave /> Save item</button></form></div>;

const RiderEditor = ({ onSave, onClose }) => <div className="admin-modal-backdrop"><form className="admin-modal" onSubmit={onSave}><button type="button" className="admin-modal-close" onClick={onClose}><FiX /></button><p className="eyebrow">Delivery team</p><h2>Add rider</h2><label>Full name<input name="name" placeholder="Peter Banda" required /></label><label>Phone number<input name="phone" type="tel" placeholder="0712 987 654" required /></label><button className="admin-primary" type="submit"><FiSave /> Add rider</button></form></div>;

const ReservationsContent = ({ bookings, tables, onAssignTable, onUnassignTable, formatTime }) => {
  const [filter, setFilter] = useState('all');
  const [assigningId, setAssigningId] = useState(null);
  const availableTables = tables.filter((t) => t.status === 'available');
  const filtered = filter === 'all' ? bookings : bookings.filter((b) => b.status === filter);
  const counts = { pending: bookings.filter((b) => b.status === 'pending').length, confirmed: bookings.filter((b) => b.status === 'confirmed').length, seated: bookings.filter((b) => b.status === 'seated').length, completed: bookings.filter((b) => b.status === 'completed').length, cancelled: bookings.filter((b) => b.status === 'cancelled').length };

  return <><div className="admin-content-heading"><div><p className="eyebrow">Table reservations</p><h2>Reservations</h2></div></div>
    <div className="admin-tabs">
      <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All <b>{bookings.length}</b></button>
      <button className={filter === 'pending' ? 'active' : ''} onClick={() => setFilter('pending')}>Pending <b>{counts.pending}</b></button>
      <button className={filter === 'confirmed' ? 'active' : ''} onClick={() => setFilter('confirmed')}>Confirmed <b>{counts.confirmed}</b></button>
      <button className={filter === 'seated' ? 'active' : ''} onClick={() => setFilter('seated')}>Seated <b>{counts.seated}</b></button>
      <button className={filter === 'completed' ? 'active' : ''} onClick={() => setFilter('completed')}>Completed <b>{counts.completed}</b></button>
      <button className={filter === 'cancelled' ? 'active' : ''} onClick={() => setFilter('cancelled')}>Cancelled <b>{counts.cancelled}</b></button>
    </div>
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Reservation</th><th>Guest</th><th>Party</th><th>Preferred</th><th>Dining time</th><th>Notes</th><th>Status</th><th>Table</th><th>Action</th></tr></thead><tbody>{filtered.map((booking) => <tr key={booking.id}>
      <td>#{booking.id.slice(0, 8)}</td>
      <td>{booking.customer_name}</td>
      <td>{booking.party_size}</td>
      <td>{booking.preferred_item || '—'}</td>
      <td>{formatTime(booking.dining_time)}</td>
      <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{booking.notes || '—'}</td>
      <td><span className={`status-badge status-${booking.status}`}>{booking.status}</span></td>
      <td>{booking.table_number ? `Table ${booking.table_number}` : '—'}</td>
      <td>
        {assigningId === booking.id && availableTables.length > 0 && <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <select className="rider-select" value="" onChange={(e) => { if (e.target.value) onAssignTable(booking.id, e.target.value); setAssigningId(null); }}>
            <option value="">Select table</option>
            {availableTables.map((t) => <option key={t.id} value={t.id}>Table {t.table_number} (seats {t.capacity})</option>)}
          </select>
          <button className="reject-button" onClick={() => setAssigningId(null)}>Cancel</button>
        </div>}
        {!booking.table_id && assigningId !== booking.id && availableTables.length > 0 && <button className="accept-button" onClick={() => setAssigningId(booking.id)}>Assign table</button>}
        {booking.table_id && <button className="reject-button" onClick={() => onUnassignTable(booking.id)}>Release</button>}
      </td>
    </tr>)}{!filtered.length && <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: '#a0958e' }}>No reservations found</td></tr>}</tbody></table></div></>;
};

const TablesContent = ({ tables, setEditingTable, onSave, onDelete, onUpdateStatus }) => {
  const statusColors = { available: '#4d9057', reserved: '#e65100', occupied: '#7b1fa2' };
  const statusBg = { available: '#e8f5e9', reserved: '#fff3e0', occupied: '#f3e5f5' };
  return <><div className="admin-content-heading"><div><p className="eyebrow">Floor plan</p><h2>Tables</h2></div><button className="admin-primary" onClick={() => setEditingTable(true)}><FiPlus /> Add table</button></div>
    <div className="admin-menu-grid">{tables.map((table) => <article className="admin-menu-row" key={table.id}><div className="admin-menu-icon"><FiTable /></div><div><strong>Table {table.table_number}</strong><span>Seats {table.capacity}</span></div><b><span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: statusBg[table.status] || '#f5f5f5', color: statusColors[table.status] || '#666', textTransform: 'capitalize' }}>{table.status}</span></b><em className={table.status === 'available' ? 'available' : table.status === 'reserved' ? 'unavailable' : 'unavailable'}>{table.status}</em><div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <select className="rider-select" value={table.status} onChange={(e) => onUpdateStatus(table.id, e.target.value)}>
          <option value="available">Available</option>
          <option value="reserved">Reserved</option>
          <option value="occupied">Occupied</option>
        </select>
        <button onClick={() => { if (window.confirm(`Delete Table ${table.table_number}?`)) onDelete(table.id); }} aria-label={`Delete Table ${table.table_number}`}><FiTrash2 /></button>
      </div></article>)}</div>{!tables.length && <div className="admin-placeholder"><div className="admin-placeholder-icon"><FiTable /></div><h2>No tables yet</h2><p>Add tables to manage floor reservations.</p></div>}</>;
};

const TableEditor = ({ table, onSave, onClose }) => <div className="admin-modal-backdrop"><form className="admin-modal" onSubmit={onSave}><button type="button" className="admin-modal-close" onClick={onClose}><FiX /></button><p className="eyebrow">Floor plan</p><h2>{table ? 'Edit table' : 'Add table'}</h2><label>Table number<input name="table_number" type="number" min="1" defaultValue={table?.table_number || ''} required /></label><label>Capacity<input name="capacity" type="number" min="1" max="20" defaultValue={table?.capacity || '2'} required /></label><button className="admin-primary" type="submit"><FiSave /> Save table</button></form></div>;

export default AdminDashboard;
