import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiBarChart2, FiCalendar, FiChevronDown, FiEdit2, FiGift, FiGrid, FiLogOut, FiMenu, FiPackage, FiPlus, FiSave, FiSearch, FiSettings, FiShoppingBag, FiTable, FiTrash2, FiTruck, FiUpload, FiUsers, FiX, FiMap, FiCheckCircle, FiClock, FiUser } from 'react-icons/fi';
import Brand from '../../../components/Navigation';
import AdminFleetMap from '../../../components/AdminFleetMap';
import { useSocket } from '../../../contexts/SocketContext';
import { useToast } from '../../../contexts/ToastContext';
import { AdminWorkspaceSkeleton, LoaderSkeleton } from '../../../components/ui/loaders-skeleton';
import { GrBlog } from "react-icons/gr";
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
  const { addToast } = useToast();

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

  const [menuFilters, setMenuFilters] = useState({ search: '', category: 'All', menuType: 'All', subcategory: 'All' });
  const [allCategories, setAllCategories] = useState([]);
  const [allSubcategories, setAllSubcategories] = useState([]);

  const fetchMenu = useCallback(async (filters) => {
    const params = new URLSearchParams();
    params.set('all', 'true');
    if (filters?.search) params.set('search', filters.search);
    if (filters?.category && filters.category !== 'All') params.set('category', filters.category);
    if (filters?.subcategory && filters.subcategory !== 'All') params.set('subcategory', filters.subcategory);
    if (filters?.menuType && filters.menuType !== 'All') params.set('menu_type', filters.menuType);
    const res = await fetch(`${api}/menu?${params.toString()}`, { headers });
    if (!res.ok) throw new Error('Failed to load menu');
    const data = await res.json();
    setMenu(data.items || []);
    if (data.categories) setAllCategories(data.categories);
    if (data.subcategories) setAllSubcategories(data.subcategories);
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
    const menuType = form.get('menu_type') || (form.get('category') === 'Wine' ? 'wine' : 'dine_in');
    let imageUrl = form.get('image') || '';
    const imageFile = form.get('image_file');

    const body = {
      name: form.get('name'),
      category: form.get('category'),
      subcategory: form.get('subcategory') || null,
      price: Number(form.get('price')),
      description: form.get('description') || '',
      image_url: imageUrl,
      menu_type: menuType,
      is_available: true,
      on_offer: form.get('on_offer') === 'on',
      offer: form.get('offer') || '',
      wine_type: form.get('wine_type') || null,
      grape: form.get('grape') || null,
      region: form.get('region') || null,
    };
    try {
      if (imageFile?.size) {
        const uploadBody = new FormData();
        uploadBody.append('image', imageFile);
        const uploadRes = await fetch(`${api}/menu/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: uploadBody,
        });
        const uploadData = await uploadRes.json().catch(() => ({}));
        if (!uploadRes.ok) throw new Error(uploadData.error || 'Failed to upload menu image');
        imageUrl = uploadData.imageUrl;
        body.image_url = imageUrl;
      }

      if (editingItem?.id) {
        const res = await fetch(`${api}/menu/${editingItem.id}?menu_type=${encodeURIComponent(editingItem.menuType || menuType)}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error('Failed to update menu item');
        await fetchMenu(menuFilters);
        addToast('Menu item updated successfully', 'success');
      } else {
        const res = await fetch(`${api}/menu`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error('Failed to add menu item');
        await fetchMenu(menuFilters);
        addToast('Menu item added successfully', 'success');
      }
      setEditingItem(null);
    } catch (err) {
      addToast(err.message || 'Menu update failed', 'error');
    }
  };

  const deleteMenuItem = async (itemId, menuType) => {
    try {
      const res = await fetch(`${api}/menu/${itemId}?menu_type=${encodeURIComponent(menuType || 'wine')}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error('Failed to delete menu item');
      await fetchMenu(menuFilters);
      addToast('Menu item deleted', 'success');
    } catch (err) {
      addToast(err.message || 'Delete failed', 'error');
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
        addToast('Table updated successfully', 'success');
      } else {
        const res = await fetch(`${api}/tables`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error('Failed to create table');
        const data = await res.json();
        setTables((prev) => [...prev, data.table]);
        addToast('Table added successfully', 'success');
      }
      setEditingTable(null);
    } catch (err) {
      addToast(err.message || 'Table update failed', 'error');
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
      addToast('Table status updated', 'success');
    } catch (err) {
      addToast(err.message || 'Status update failed', 'error');
    }
  };

  const deleteTable = async (tableId) => {
    try {
      const res = await fetch(`${api}/tables/${tableId}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error('Failed to delete table');
      setTables((prev) => prev.filter((t) => t.id !== tableId));
      addToast('Table deleted', 'success');
    } catch (err) {
      addToast(err.message || 'Delete failed', 'error');
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

  if (loading) {
    return (
      <main className="admin-page">
        <aside className="admin-sidebar" style={{ minHeight: '100vh' }}>
          <div className="admin-sidebar-top"><Brand /></div>
          <nav className="admin-nav" style={{ padding: '20px 0' }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} style={{ padding: '12px 16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <LoaderSkeleton width={20} height={20} borderRadius={4} />
                <LoaderSkeleton width={100} height={16} borderRadius={4} />
              </div>
            ))}
          </nav>
        </aside>
        <section className="admin-workspace">
          <header className="admin-header" style={{ marginBottom: '24px' }}>
            <div>
              <LoaderSkeleton width={220} height={28} borderRadius={6} />
              <LoaderSkeleton width={160} height={14} borderRadius={4} style={{ marginTop: 8 }} />
            </div>
            <LoaderSkeleton width={110} height={36} borderRadius={8} />
          </header>
          <AdminWorkspaceSkeleton />
        </section>
      </main>
    );
  }

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
          { label: 'Media', icon: GrBlog },
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
      {activePage === 'Menu' && <MenuContent menu={menu} setEditingItem={setEditingItem} onDelete={deleteMenuItem} fetchMenu={fetchMenu} menuFilters={menuFilters} setMenuFilters={setMenuFilters} allCategories={allCategories} allSubcategories={allSubcategories} />}
      {activePage === 'Customers' && <CustomersContent customers={customers} />}
      {activePage === 'Riders' && <RidersContent riders={riders} onAdd={() => setRiderEditorOpen(true)} onRemove={removeRider} />}
      {activePage === 'Fleet Map' && <FleetMapContent token={token} api={api} />}
      {activePage === 'Promotions' && <PromotionsContent api={api} headers={headers} addToast={addToast} />}
      {['Reports', 'Settings'].includes(activePage) && <PlaceholderContent title={activePage} />}
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

const MenuContent = ({ menu, setEditingItem, onDelete, fetchMenu, menuFilters, setMenuFilters, allCategories = [], allSubcategories = [] }) => {
  useEffect(() => {
    fetchMenu(menuFilters);
  }, [menuFilters, fetchMenu]);

  const menuTypes = [
    { label: 'All', value: 'All' },
    { label: 'Dine-In', value: 'dine_in' },
    { label: 'Take-Out', value: 'takeout' },
    { label: 'Lunchbox', value: 'lunchbox' },
    { label: 'Wines', value: 'wine' },
  ];

  const categories = useMemo(() => ['All', ...allCategories], [allCategories]);
  const subcategories = useMemo(() => ['All', ...allSubcategories], [allSubcategories]);

  const setMenuTypeFilter = (menuType) => {
    setMenuFilters((prev) => ({ ...prev, menuType, category: 'All', subcategory: 'All' }));
  };
  const setCategoryFilter = (category) => {
    setMenuFilters((prev) => ({ ...prev, category }));
  };
  const setSubcategoryFilter = (subcategory) => {
    setMenuFilters((prev) => ({ ...prev, subcategory }));
  };
  const setMenuSearch = (search) => {
    setMenuFilters((prev) => ({ ...prev, search }));
  };

  return <><div className="admin-content-heading"><div><p className="eyebrow">Catalog management</p><h2>Menu items</h2></div><button className="admin-primary" onClick={() => { setEditingItem(true); }}><FiPlus /> Add menu item</button></div>
    <div className="admin-menu-toolbar">
      <div className="admin-category-tabs">
        {menuTypes.map((mt) => (
          <button key={mt.value} className={`admin-category-tab ${menuFilters.menuType === mt.value ? 'active' : ''}`} onClick={() => setMenuTypeFilter(mt.value)}>
            {mt.label}
          </button>
        ))}
      </div>
      <div className="admin-category-tabs">
        {categories.map((cat) => <button key={cat} className={`admin-category-tab ${menuFilters.category === cat ? 'active' : ''}`} onClick={() => setCategoryFilter(cat)}>{cat === 'All' ? 'All categories' : cat}</button>)}
      </div>
      <div className="admin-category-tabs">
        {subcategories.map((sub) => <button key={sub} className={`admin-category-tab ${menuFilters.subcategory === sub ? 'active' : ''}`} onClick={() => setSubcategoryFilter(sub)}>{sub === 'All' ? 'All subcategories' : sub}</button>)}
      </div>
      <div className="admin-search-wrap">
        <FiSearch className="admin-search-icon" />
        <input className="admin-search-input" type="text" placeholder="Search menu by name, category or description..." value={menuFilters.search} onChange={(e) => setMenuSearch(e.target.value)} />
        {menuFilters.search && <button className="admin-search-clear" onClick={() => setMenuSearch('')} aria-label="Clear search"><FiX /></button>}
      </div>
    </div>
    <div className="admin-menu-categories">
      {menuFilters.subcategory !== 'All' ? (
        <section key={`${menuFilters.menuType}-${menuFilters.category}-${menuFilters.subcategory}`} className="admin-menu-category">
          <h3 className="admin-menu-category-title">{menuFilters.subcategory} <span className="admin-menu-category-count">{menu.length}</span></h3>
          <div className="admin-menu-grid">
            {menu.sort((a, b) => (a.order_index || 0) - (b.order_index || 0) || a.id.localeCompare(b.id)).map((item) => <article className="admin-menu-card" key={item.id}>
              {item.image && <div className="admin-menu-card-image"><img src={item.image} alt={item.name} loading="lazy" onError={(e) => { e.target.style.display = 'none'; }} /></div>}
              <div className="admin-menu-card-body">
                <div className="admin-menu-card-top">
                  <div className="admin-menu-card-icon"><FiPackage /></div>
                  <div className="admin-menu-card-info">
                    <strong className="admin-menu-card-name">{item.name}</strong>
                    <span className="admin-menu-card-category">{item.category}{item.subcategory && item.subcategory !== item.category ? ` · ${item.subcategory}` : ''}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {item.on_offer && <span className="admin-menu-card-offer">{item.offer || 'On offer'}</span>}
                    <span className={`admin-menu-card-availability ${item.availability !== false ? 'available' : 'unavailable'}`}>{item.availability !== false ? 'Available' : 'Unavailable'}</span>
                  </div>
                </div>
                {item.description && <p className="admin-menu-card-description">{item.description}</p>}
                {(item.wineType || item.region || item.grape) && <div className="admin-menu-card-wine-meta">{(item.wineType || item.region) && <span>{[item.wineType, item.region].filter(Boolean).join(' · ')}</span>}{item.grape && <span>Grape: {item.grape}</span>}</div>}
                <div className="admin-menu-card-footer">
                  <strong className="admin-menu-card-price">KES {Number(item.price).toLocaleString()}</strong>
                  <div className="admin-menu-card-actions">
                    <button onClick={() => setEditingItem(item)} aria-label={`Edit ${item.name}`} title="Edit"><FiEdit2 /></button>
                    <button onClick={() => { if (window.confirm(`Delete "${item.name}"?`)) onDelete(item.id, item.menuType); }} aria-label={`Delete ${item.name}`} title="Delete"><FiTrash2 /></button>
                  </div>
                </div>
              </div>
            </article>)}
          </div>
        </section>
      ) : (
        Object.entries(menu.reduce((acc, item) => {
          const sub = item.subcategory || 'Other';
          acc[sub] = acc[sub] || [];
          acc[sub].push(item);
          return acc;
        }, {})).sort(([a], [b]) => a.localeCompare(b)).map(([subcategory, items]) => (
          <section key={`${menuFilters.menuType}-${menuFilters.category}-${subcategory}`} className="admin-menu-category">
            <h3 className="admin-menu-category-title">{subcategory} <span className="admin-menu-category-count">{items.length}</span></h3>
            <div className="admin-menu-grid">
              {items.sort((a, b) => (a.order_index || 0) - (b.order_index || 0) || a.id.localeCompare(b.id)).map((item) => <article className="admin-menu-card" key={item.id}>
                {item.image && <div className="admin-menu-card-image"><img src={item.image} alt={item.name} loading="lazy" onError={(e) => { e.target.style.display = 'none'; }} /></div>}
                <div className="admin-menu-card-body">
                  <div className="admin-menu-card-top">
                    <div className="admin-menu-card-icon"><FiPackage /></div>
                    <div className="admin-menu-card-info">
                      <strong className="admin-menu-card-name">{item.name}</strong>
                      <span className="admin-menu-card-category">{item.category}{item.subcategory && item.subcategory !== item.category ? ` · ${item.subcategory}` : ''}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {item.on_offer && <span className="admin-menu-card-offer">{item.offer || 'On offer'}</span>}
                      <span className={`admin-menu-card-availability ${item.availability !== false ? 'available' : 'unavailable'}`}>{item.availability !== false ? 'Available' : 'Unavailable'}</span>
                    </div>
                  </div>
                  {item.description && <p className="admin-menu-card-description">{item.description}</p>}
                  {(item.wineType || item.region || item.grape) && <div className="admin-menu-card-wine-meta">{(item.wineType || item.region) && <span>{[item.wineType, item.region].filter(Boolean).join(' · ')}</span>}{item.grape && <span>Grape: {item.grape}</span>}</div>}
                  <div className="admin-menu-card-footer">
                    <strong className="admin-menu-card-price">KES {Number(item.price).toLocaleString()}</strong>
                    <div className="admin-menu-card-actions">
                      <button onClick={() => setEditingItem(item)} aria-label={`Edit ${item.name}`} title="Edit"><FiEdit2 /></button>
                      <button onClick={() => { if (window.confirm(`Delete "${item.name}"?`)) onDelete(item.id, item.menuType); }} aria-label={`Delete ${item.name}`} title="Delete"><FiTrash2 /></button>
                    </div>
                  </div>
                </div>
              </article>)}
            </div>
          </section>
        ))
      )}
    </div>
  </>;
};

const CustomersContent = ({ customers }) => <><div className="admin-content-heading"><div><p className="eyebrow">Loyalty and accounts</p><h2>Customers</h2></div></div><div className="customer-summary"><span><strong>{customers.length}</strong> registered customers</span><span><strong>{customers.filter((c) => c.loyalty_points > 0).length}</strong> with loyalty points</span><span><strong>{customers.reduce((sum, c) => sum + (c.loyalty_points || 0), 0).toLocaleString()}</strong> total points</span></div><div className="admin-table-wrap"><table className="admin-table customer-table"><thead><tr><th>Customer</th><th>Email</th><th>Phone</th><th>Loyalty points</th><th>Joined</th></tr></thead><tbody>{customers.map((customer) => <tr key={customer.id || customer.email}><td><strong>{customer.full_name}</strong></td><td>{customer.email}</td><td>{customer.phone || '—'}</td><td>{customer.loyalty_points || 0} pts</td><td>{new Date(customer.created_at).toLocaleDateString()}</td></tr>)}{!customers.length && <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#a0958e' }}>No customers yet</td></tr>}</tbody></table></div></>;

const RidersContent = ({ riders, onAdd, onRemove }) => <><div className="admin-content-heading"><div><p className="eyebrow">Delivery team</p><h2>Riders</h2></div><button className="admin-primary" onClick={onAdd}><FiPlus /> Add rider</button></div><div className="customer-summary"><span><strong>{riders.length}</strong> registered riders</span><span><strong>{riders.filter((r) => r.status === 'online').length}</strong> online now</span></div><div className="admin-rider-grid">{riders.map((rider) => <article className="admin-rider-row" key={rider.id}><div className="admin-rider-avatar">{rider.full_name?.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}</div><div className="admin-rider-name"><strong>{rider.full_name}</strong><span>{rider.phone}</span></div><span className={`rider-online-status ${rider.status === 'online' ? 'online' : ''}`}>{rider.status === 'online' ? 'Online' : rider.status === 'on_break' ? 'On break' : 'Offline'}</span><button className="admin-remove-rider" onClick={() => { if (window.confirm(`Remove ${rider.full_name}?`)) onRemove(rider.id); }} aria-label={`Remove ${rider.full_name}`}><FiTrash2 /></button></article>)}</div></>;

const FleetMapContent = ({ token, api }) => (
  <div style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
    <AdminFleetMap token={token} api={api} />
  </div>
);

const PlaceholderContent = ({ title }) => <div className="admin-placeholder"><div className="admin-placeholder-icon"><FiSettings /></div><h2>{title} workspace</h2><p>This section is ready for your {title.toLowerCase()} tools and data.</p></div>;

const MenuEditor = ({ item, onSave, onClose }) => {
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(item?.image || '');
  const [fileName, setFileName] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const menuType = item?.menuType || (item?.category === 'Wine' ? 'wine' : 'dine_in');
  const [selectedMenuType, setSelectedMenuType] = useState(menuType);

  const [selectedCategory, setSelectedCategory] = useState(item?.category || 'Meals');
  const [selectedSubcategory, setSelectedSubcategory] = useState(item?.subcategory || '');
  const [onOffer, setOnOffer] = useState(Boolean(item?.on_offer));
  const [offerText, setOfferText] = useState(item?.offer || '');

  const MEAL_SUBCATEGORIES = ['Appetizers', 'Soups', 'Salads', 'Mains', 'Farinaceous Delicacies', 'Chateau Classics', 'Chateau Lunchbox', 'Bar Bites & Sandwiches', 'Platters & Boards', 'Desserts', 'Beverages', 'Fast Food', 'Combos'];
  const WINE_SUBCATEGORIES = ['Red', 'White', 'Rosé', 'Sparkling', 'Orange', 'Dessert'];
  const DRINK_SUBCATEGORIES = ['Hot', 'Cold', 'Alcoholic', 'Non-alcoholic'];
  const DESSERT_SUBCATEGORIES = ['Cakes', 'Ice Cream', 'Pastries', 'Other'];

  const subcategoryOptions = selectedCategory === 'Wine' ? WINE_SUBCATEGORIES : selectedCategory === 'Drinks' ? DRINK_SUBCATEGORIES : selectedCategory === 'Desserts' ? DESSERT_SUBCATEGORIES : MEAL_SUBCATEGORIES;
  const showWineFields = selectedCategory === 'Wine';

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (preview && preview.startsWith('blob:')) URL.revokeObjectURL(preview);
    const url = URL.createObjectURL(file);
    setPreview(url);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result;
      const hidden = document.getElementById('menu-image-input');
      if (hidden) hidden.value = base64;
      setIsConverting(false);
    };
    reader.onerror = () => {
      setIsConverting(false);
      alert('Failed to read image file');
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    if (preview && preview.startsWith('blob:')) URL.revokeObjectURL(preview);
    setPreview('');
    setFileName('');
    const hidden = document.getElementById('menu-image-input');
    if (hidden) hidden.value = '';
    if (fileRef.current) fileRef.current.value = '';
  };

  return <div className="admin-modal-backdrop"><form className="admin-modal" onSubmit={onSave}><button type="button" className="admin-modal-close" onClick={onClose}><FiX /></button><p className="eyebrow">Catalog management</p><h2>{item ? 'Edit menu item' : 'Add menu item'}</h2>
    <div className="admin-modal-form">
      {selectedCategory === 'Wine' ? (<input type="hidden" name="menu_type" value="wine" />) : (<label>Menu type<select name="menu_type" defaultValue={selectedMenuType} onChange={(e) => setSelectedMenuType(e.target.value)}><option value="dine_in">Dine-In</option><option value="takeout">Take-Out</option><option value="lunchbox">Lunchbox</option></select></label>)}
      <label>Item name<input name="name" defaultValue={item?.name || ''} required /></label>
      <label>Category<select name="category" defaultValue={selectedCategory} onChange={(e) => { setSelectedCategory(e.target.value); setSelectedSubcategory(''); if (e.target.value === 'Wine') setSelectedMenuType('wine'); else setSelectedMenuType((prev) => prev || 'dine_in'); }}><option>Meals</option><option>Wine</option><option>Drinks</option><option>Desserts</option></select></label>
      <label>Subcategory<select name="subcategory" defaultValue={selectedSubcategory} onChange={(e) => setSelectedSubcategory(e.target.value)}><option value="">-- select subcategory --</option>{subcategoryOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}</select></label>
      <label>Price (KES)<input name="price" type="number" min="0" defaultValue={item?.price || ''} required /></label>
      <label>Description<textarea name="description" rows="2" defaultValue={item?.description || ''} placeholder="Short description shown on menu cards..." /></label>
      {showWineFields && <><label>Wine type<select name="wine_type" defaultValue={item?.wineType || item?.wine_type || ''}><option value="">-- select type --</option><option>Red</option><option>White</option><option>Rosé</option><option>Sparkling</option><option>Orange</option><option>Dessert</option></select></label>
      <label>Grape<input name="grape" defaultValue={item?.grape || ''} placeholder="e.g. Cabernet Sauvignon, Chardonnay..." /></label>
      <label>Region<input name="region" defaultValue={item?.region || ''} placeholder="e.g. Tuscany, Stellenbosch, Bordeaux..." /></label></>}
      <label className="admin-toggle-label">
        <input type="checkbox" name="on_offer" checked={onOffer} onChange={(e) => setOnOffer(e.target.checked)} />
        On offer
      </label>
      <label>Offer text<input name="offer" value={offerText} onChange={(e) => setOfferText(e.target.value)} placeholder="e.g. 10% off, Free delivery..." /></label>
      <label>
        Image
        <input id="menu-image-input" name="image" type="hidden" defaultValue={item?.image || ''} />
        <div className="admin-upload-row">
          <button type="button" className="admin-upload-button" onClick={() => fileRef.current?.click()} disabled={isConverting}>
            <FiUpload /> {isConverting ? 'Processing...' : fileName || 'Choose image'}
          </button>
          {preview && <button type="button" className="admin-upload-clear" onClick={clearImage} disabled={isConverting}>Remove</button>}
        </div>
        <input ref={fileRef} name="image_file" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} disabled={isConverting} style={{ display: 'none' }} />
        {preview && <img className="admin-modal-image-preview" src={preview} alt="Preview" onError={(e) => { e.target.style.display = 'none'; }} />}
      </label>
    </div>
    <button className="admin-primary" type="submit" disabled={isConverting}><FiSave /> Save item</button></form></div>;
};

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

const TablesContent = ({ tables, setEditingTable, onDelete, onUpdateStatus }) => {
  const [filter, setFilter] = useState('all');

  const counts = {
    total: tables.length,
    available: tables.filter((t) => t.status === 'available').length,
    reserved: tables.filter((t) => t.status === 'reserved').length,
    occupied: tables.filter((t) => t.status === 'occupied').length,
    totalCapacity: tables.reduce((sum, t) => sum + Number(t.capacity || 0), 0),
  };

  const filtered = filter === 'all' ? tables : tables.filter((t) => t.status === filter);

  return (
    <>
      <div className="admin-content-heading">
        <div>
          <p className="eyebrow">Restaurant floor & seating</p>
          <h2>Tables Management</h2>
        </div>
        <button className="admin-primary" onClick={() => setEditingTable(true)}>
          <FiPlus /> Add table
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="admin-tables-summary">
        <div className="admin-tables-stat-card">
          <div className="admin-tables-stat-icon total"><FiTable /></div>
          <div>
            <span>Total Tables</span>
            <strong>{counts.total}</strong>
          </div>
        </div>
        <div className="admin-tables-stat-card">
          <div className="admin-tables-stat-icon available"><FiCheckCircle /></div>
          <div>
            <span>Available</span>
            <strong>{counts.available}</strong>
          </div>
        </div>
        <div className="admin-tables-stat-card">
          <div className="admin-tables-stat-icon reserved"><FiClock /></div>
          <div>
            <span>Reserved</span>
            <strong>{counts.reserved}</strong>
          </div>
        </div>
        <div className="admin-tables-stat-card">
          <div className="admin-tables-stat-icon occupied"><FiUsers /></div>
          <div>
            <span>Occupied</span>
            <strong>{counts.occupied}</strong>
          </div>
        </div>
        <div className="admin-tables-stat-card">
          <div className="admin-tables-stat-icon capacity"><FiUser /></div>
          <div>
            <span>Total Capacity</span>
            <strong>{counts.totalCapacity} seats</strong>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="admin-tabs" style={{ marginBottom: '20px' }}>
        <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
          All Tables ({counts.total})
        </button>
        <button className={filter === 'available' ? 'active' : ''} onClick={() => setFilter('available')}>
          Available ({counts.available})
        </button>
        <button className={filter === 'reserved' ? 'active' : ''} onClick={() => setFilter('reserved')}>
          Reserved ({counts.reserved})
        </button>
        <button className={filter === 'occupied' ? 'active' : ''} onClick={() => setFilter('occupied')}>
          Occupied ({counts.occupied})
        </button>
      </div>

      {/* Tables Grid */}
      {filtered.length > 0 ? (
        <div className="admin-tables-grid">
          {filtered
            .slice()
            .sort((a, b) => Number(a.table_number) - Number(b.table_number))
            .map((table) => {
              return (
                <article className={`admin-table-card status-${table.status}`} key={table.id}>
                  <div className="admin-table-card-top">
                    <div className="admin-table-badge">
                      <FiTable className="admin-table-badge-icon" />
                      <span>Table {table.table_number}</span>
                    </div>
                    <span className={`admin-table-status-pill ${table.status}`}>
                      {table.status}
                    </span>
                  </div>

                  <div className="admin-table-card-middle">
                    <div className="admin-table-capacity-tag">
                      <FiUsers size={14} />
                      <span>Seats {table.capacity} {table.capacity === 1 ? 'Guest' : 'Guests'}</span>
                    </div>
                    <div className="admin-table-visual">
                      <div className="admin-table-visual-plate">
                        <span>T-{table.table_number}</span>
                      </div>
                      <div className="admin-table-seats-wrap">
                        {Array.from({ length: Math.min(Number(table.capacity) || 2, 8) }).map((_, i) => (
                          <span key={i} className="admin-table-seat-dot" />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="admin-table-card-footer">
                    <div className="admin-table-status-wrap">
                      <label className="admin-table-status-label">Status:</label>
                      <select
                        className={`admin-table-status-select ${table.status}`}
                        value={table.status}
                        onChange={(e) => onUpdateStatus(table.id, e.target.value)}
                      >
                        <option value="available">Available</option>
                        <option value="reserved">Reserved</option>
                        <option value="occupied">Occupied</option>
                      </select>
                    </div>

                    <div className="admin-table-actions">
                      <button
                        type="button"
                        className="admin-table-action-btn edit"
                        onClick={() => setEditingTable(table)}
                        aria-label={`Edit Table ${table.table_number}`}
                        title="Edit Table"
                      >
                        <FiEdit2 />
                      </button>
                      <button
                        type="button"
                        className="admin-table-action-btn delete"
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete Table ${table.table_number}?`)) {
                            onDelete(table.id);
                          }
                        }}
                        aria-label={`Delete Table ${table.table_number}`}
                        title="Delete Table"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
        </div>
      ) : (
        <div className="admin-placeholder">
          <div className="admin-placeholder-icon">
            <FiTable />
          </div>
          <h2>No tables found</h2>
          <p>
            {filter !== 'all'
              ? `There are currently no tables marked as "${filter}".`
              : 'Add tables to manage your dining floor reservations.'}
          </p>
        </div>
      )}
    </>
  );
};

const TableEditor = ({ table, onSave, onClose }) => (
  <div className="admin-modal-backdrop">
    <form className="admin-modal" onSubmit={onSave}>
      <button type="button" className="admin-modal-close" onClick={onClose}>
        <FiX />
      </button>
      <p className="eyebrow">Floor plan</p>
      <h2>{table ? 'Edit table' : 'Add table'}</h2>
      <label>
        Table number
        <input name="table_number" type="number" min="1" defaultValue={table?.table_number || ''} required />
      </label>
      <label>
        Seating capacity
        <input name="capacity" type="number" min="1" max="20" defaultValue={table?.capacity || '2'} required />
      </label>
      <button className="admin-primary" type="submit">
        <FiSave /> Save table
      </button>
    </form>
  </div>
);


const PromotionsContent = ({ api, headers, addToast }) => {
  const [promotions, setPromotions] = useState([]);
  const [editingPromo, setEditingPromo] = useState(null);
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', image_url: '', link_url: '', is_active: true, priority: 0, starts_at: '', ends_at: '' });
  const [preview, setPreview] = useState('');
  const [fileName, setFileName] = useState('');
  const fileRef = useRef(null);

  const fetchPromotions = useCallback(async () => {
    const res = await fetch(`${api}/promotions?all=true`, { headers });
    if (!res.ok) throw new Error('Failed to load promotions');
    const data = await res.json();
    setPromotions(data.promotions || []);
  }, [api, headers]);

  useEffect(() => { fetchPromotions(); }, [fetchPromotions]);

  const resetForm = () => {
    setEditingPromo(null);
    setForm({ title: '', message: '', image_url: '', link_url: '', is_active: true, priority: 0, starts_at: '', ends_at: '' });
    setPreview('');
    setFileName('');
  };

  const openEditor = (promo) => {
    if (promo) {
      setEditingPromo(promo);
      setForm({
        title: promo.title || '',
        message: promo.message || '',
        image_url: promo.image_url || '',
        link_url: promo.link_url || '',
        is_active: promo.is_active,
        priority: promo.priority || 0,
        starts_at: promo.starts_at ? promo.starts_at.slice(0, 16) : '',
        ends_at: promo.ends_at ? promo.ends_at.slice(0, 16) : '',
      });
      setPreview(promo.image_url || '');
      setFileName('');
    } else {
      resetForm();
    }
    setIsPromoModalOpen(true);
  };

  const closePromoModal = () => {
    setIsPromoModalOpen(false);
    resetForm();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (preview && preview.startsWith('blob:')) URL.revokeObjectURL(preview);
    const url = URL.createObjectURL(file);
    setPreview(url);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((prev) => ({ ...prev, image_url: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    if (preview && preview.startsWith('blob:')) URL.revokeObjectURL(preview);
    setPreview('');
    setFileName('');
    setForm((prev) => ({ ...prev, image_url: '' }));
    if (fileRef.current) fileRef.current.value = '';
  };

  const savePromotion = async (e) => {
    e.preventDefault();
    const payload = {
      title: form.title,
      message: form.message,
      image_url: form.image_url || null,
      link_url: form.link_url || null,
      is_active: form.is_active,
      priority: Number(form.priority || 0),
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
    };
    try {
      const url = editingPromo ? `${api}/promotions/${editingPromo.id}` : `${api}/promotions`;
      const res = await fetch(url, {
        method: editingPromo ? 'PATCH' : 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to save promotion');
      addToast(editingPromo ? 'Promotion updated' : 'Promotion created', 'success');
      resetForm();
      await fetchPromotions();
    } catch (err) {
      addToast(err.message || 'Save failed', 'error');
    }
  };

  const deletePromotion = async (id) => {
    if (!window.confirm('Delete this promotion?')) return;
    try {
      const res = await fetch(`${api}/promotions/${id}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error('Failed to delete promotion');
      addToast('Promotion deleted', 'success');
      await fetchPromotions();
    } catch (err) {
      addToast(err.message || 'Delete failed', 'error');
    }
  };

  return (
    <>
      <div className="admin-content-heading"><div><p className="eyebrow">Marketing</p><h2>Promotions</h2></div><button className="admin-primary" onClick={() => openEditor(null)}><FiPlus /> New promotion</button></div>
      <div className="admin-menu-grid">
        {promotions.map((promo) => (
          <article className="admin-menu-card" key={promo.id}>
            <div className="admin-menu-card-body">
              <div className="admin-menu-card-top">
                <div className="admin-menu-card-icon"><FiGift /></div>
                <div className="admin-menu-card-info">
                  <strong className="admin-menu-card-name">{promo.title || 'Untitled promotion'}</strong>
                  <span className="admin-menu-card-category">{promo.is_active ? 'Active' : 'Inactive'} · Priority {promo.priority || 0}</span>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span className={`admin-menu-card-availability ${promo.is_active ? 'available' : 'unavailable'}`}>{promo.is_active ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
              <p className="admin-menu-card-description">{promo.message}</p>
              {(promo.image_url || preview) && <img className="admin-modal-image-preview" src={promo.image_url || preview} alt={promo.title || 'Promo'} onError={(e) => { e.target.style.display = 'none'; }} />}
              <div className="admin-menu-card-footer">
                <small>{promo.starts_at ? new Date(promo.starts_at).toLocaleString() : ''} {promo.ends_at ? '→ ' + new Date(promo.ends_at).toLocaleString() : ''}</small>
                <div className="admin-menu-card-actions">
                  <button onClick={() => openEditor(promo)} aria-label={`Edit ${promo.title || 'promotion'}`} title="Edit"><FiEdit2 /></button>
                  <button onClick={() => deletePromotion(promo.id)} aria-label={`Delete ${promo.title || 'promotion'}`} title="Delete"><FiTrash2 /></button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
      {!promotions.length && <div className="admin-placeholder"><div className="admin-placeholder-icon"><FiGift /></div><h2>No promotions yet</h2><p>Create your first promotional banner.</p></div>}

      {isPromoModalOpen && (
        <div className="admin-modal-backdrop">
          <form className="admin-modal" onSubmit={savePromotion}>
            <button type="button" className="admin-modal-close" onClick={closePromoModal}><FiX /></button>
            <p className="eyebrow">Marketing</p>
            <h2>{editingPromo ? 'Edit promotion' : 'New promotion'}</h2>
            <div className="admin-modal-form">
              <label>Title<input name="title" value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} /></label>
              <label>Message<textarea name="message" rows="3" value={form.message} onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))} required /></label>
              <label>Image<input id="promo-image-input" name="image" type="hidden" value={form.image_url} />
                <div className="admin-upload-row">
                  <button type="button" className="admin-upload-button" onClick={() => fileRef.current?.click()}>
                    <FiUpload /> {fileName || 'Choose image'}
                  </button>
                  {preview && <button type="button" className="admin-upload-clear" onClick={clearImage}>Remove</button>}
                </div>
                <input ref={fileRef} name="image_file" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} style={{ display: 'none' }} />
                {preview && <img className="admin-modal-image-preview" src={preview} alt="Preview" onError={(e) => { e.target.style.display = 'none'; }} />}
              </label>
              <label>Link URL<input name="link_url" value={form.link_url} onChange={(e) => setForm((prev) => ({ ...prev, link_url: e.target.value }))} placeholder="https://..." /></label>
              <label>Priority<input name="priority" type="number" value={form.priority} onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))} /></label>
              <label>Starts<input name="starts_at" type="datetime-local" value={form.starts_at} onChange={(e) => setForm((prev) => ({ ...prev, starts_at: e.target.value }))} /></label>
              <label>Ends<input name="ends_at" type="datetime-local" value={form.ends_at} onChange={(e) => setForm((prev) => ({ ...prev, ends_at: e.target.value }))} /></label>
              <label className="admin-toggle-label"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))} /> Active</label>
            </div>
            <button className="admin-primary" type="submit"><FiSave /> Save promotion</button>
          </form>
        </div>
      )}
    </>
  );
};

export default AdminDashboard;
