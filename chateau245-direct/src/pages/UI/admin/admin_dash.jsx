import { useState } from 'react';
import { FiBarChart2, FiBell, FiChevronDown, FiEdit2, FiGift, FiGrid, FiLogOut, FiMenu, FiPackage, FiPlus, FiSave, FiSettings, FiShoppingBag, FiTrash2, FiTruck, FiUsers, FiX } from 'react-icons/fi';
import { Brand } from '../shared';

const navItems = [
  { label: 'Dashboard', icon: FiGrid },
  { label: 'Orders', icon: FiShoppingBag, count: 12 },
  { label: 'Menu', icon: FiPackage },
  { label: 'Customers', icon: FiUsers },
  { label: 'Riders', icon: FiTruck },
  { label: 'Reports', icon: FiBarChart2 },
  { label: 'Promotions', icon: FiGift },
  { label: 'Settings', icon: FiSettings },
];

const initialMenu = [
  { id: 1, name: 'Château Burger', category: 'Meals', price: 1450, availability: true },
  { id: 2, name: 'Grilled Lamb Chops', category: 'Meals', price: 2350, availability: true },
  { id: 3, name: 'House Red Wine', category: 'Wine', price: 2800, availability: true },
  { id: 4, name: 'Chocolate Fondant', category: 'Desserts', price: 750, availability: false },
];

const orders = [
  ['#CH254-00124', 'John Mwangi', '3 items', 'KES 5,450', 'Westlands, School Lane', '6:45 PM'],
  ['#CH254-00123', 'Mary Wanjiku', '2 items', 'KES 3,200', 'Kilimani, Kindaruma Rd', '6:42 PM'],
  ['#CH254-00122', 'Brian Oduor', '4 items', 'KES 7,800', 'Lavington, Convent Dr', '6:40 PM'],
  ['#CH254-00121', 'Grace Kerubo', '2 items', 'KES 2,750', 'Parklands, 3rd Ave', '6:38 PM'],
];

const customers = [
  { name: 'John Mwangi', email: 'john.mwangi@email.com', orders: 8, points: 420, tier: 'Gold' },
  { name: 'Mary Wanjiku', email: 'mary.wanjiku@email.com', orders: 5, points: 240, tier: 'Silver' },
  { name: 'Brian Oduor', email: 'brian.oduor@email.com', orders: 12, points: 680, tier: 'Gold' },
  { name: 'Grace Kerubo', email: 'grace.kerubo@email.com', orders: 3, points: 90, tier: 'Member' },
];

const initialRiders = [
  { id: 1, initials: 'PB', name: 'Peter Banda', phone: '0712 987 654', status: 'Online', deliveries: 4 },
  { id: 2, initials: 'AN', name: 'Alex Njoroge', phone: '0722 345 678', status: 'Online', deliveries: 3 },
  { id: 3, initials: 'JM', name: 'James Mutua', phone: '0790 456 123', status: 'On a break', deliveries: 2 },
  { id: 4, initials: 'SK', name: 'Samuel Kariuki', phone: '0701 234 567', status: 'Offline', deliveries: 10 },
];

const AdminDashboard = ({ user, onLogout }) => {
  const [activePage, setActivePage] = useState('Dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menu, setMenu] = useState(initialMenu);
  const [riders, setRiders] = useState(initialRiders);
  const [editingItem, setEditingItem] = useState(null);
  const [riderEditorOpen, setRiderEditorOpen] = useState(false);

  const selectPage = (page) => {
    setActivePage(page);
    setSidebarOpen(false);
  };

  const saveMenuItem = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const item = { id: editingItem?.id || Date.now(), name: form.get('name'), category: form.get('category'), price: Number(form.get('price')), availability: true };
    setMenu((current) => editingItem ? current.map((menuItem) => menuItem.id === editingItem.id ? item : menuItem) : [...current, item]);
    setEditingItem(null);
  };

  const addRider = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = form.get('name');
    const initials = name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
    setRiders((current) => [...current, { id: Date.now(), initials, name, phone: form.get('phone'), status: 'Offline', deliveries: 0 }]);
    setRiderEditorOpen(false);
  };

  return <main className="admin-page">
    <button className="admin-mobile-toggle" onClick={() => setSidebarOpen(true)} aria-label="Open admin navigation"><FiMenu /></button>
    {sidebarOpen && <button className="admin-scrim" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" />}
    <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
      <div className="admin-sidebar-top"><Brand /><button className="admin-close" onClick={() => setSidebarOpen(false)} aria-label="Close admin navigation"><FiX /></button></div>
      <nav className="admin-nav">{navItems.map(({ label, icon: Icon, count }) => <button className={activePage === label ? 'active' : ''} key={label} onClick={() => selectPage(label)}><Icon /><span>{label}</span>{count && <b>{count}</b>}</button>)}</nav>
      <div className="admin-account"><div className="admin-profile"><span>JM</span><div><strong>John Mwangi</strong><small>Administrator</small></div><FiChevronDown /></div><button className="admin-logout" onClick={onLogout}><FiLogOut /> Logout</button></div>
    </aside>
    <section className="admin-workspace">
      <header className="admin-topbar"><div><p className="eyebrow">Château254 management</p><h1>{activePage}</h1></div><div className="admin-top-actions"><button aria-label="Notifications"><FiBell /></button><div className="admin-top-avatar">{user?.full_name?.slice(0, 2).toUpperCase() || 'AD'}</div></div></header>
      {activePage === 'Dashboard' && <DashboardContent onOpenOrders={() => setActivePage('Orders')} />}
      {activePage === 'Orders' && <OrdersContent />}
      {activePage === 'Menu' && <MenuContent menu={menu} setEditingItem={setEditingItem} />}
      {activePage === 'Customers' && <CustomersContent />}
      {activePage === 'Riders' && <RidersContent riders={riders} onAdd={() => setRiderEditorOpen(true)} onRemove={(id) => setRiders((current) => current.filter((rider) => rider.id !== id))} />}
      {['Reports', 'Promotions', 'Settings'].includes(activePage) && <PlaceholderContent title={activePage} />}
      {editingItem && <MenuEditor item={editingItem === true ? null : editingItem} onSave={saveMenuItem} onClose={() => setEditingItem(null)} />}
      {riderEditorOpen && <RiderEditor onSave={addRider} onClose={() => setRiderEditorOpen(false)} />}
    </section>
  </main>;
};

const StatCard = ({ label, value, note, icon: Icon, tone }) => <article className="admin-stat"><div><span>{label}</span><strong>{value}</strong><small className={tone === 'positive' ? 'positive' : ''}>{note}</small></div><i className={tone}><Icon /></i></article>;

const DashboardContent = ({ onOpenOrders }) => <><div className="admin-welcome"><div><h2>Good evening, John</h2><p>Here is what is happening at Château254 today.</p></div><button className="admin-filter"><FiBarChart2 /> This week <FiChevronDown /></button></div><div className="admin-stats"><StatCard label="Today's Orders" value="27" note="+18% from yesterday" icon={FiShoppingBag} tone="orange" /><StatCard label="Total Sales" value="KES 86,350" note="+24% from yesterday" icon={FiBarChart2} tone="blue" /><StatCard label="Delivered Orders" value="19" note="70% of total" icon={FiPackage} tone="green" /><StatCard label="Average Delivery Time" value="45 min" note="-8 min from yesterday" icon={FiTruck} tone="mint" /></div><div className="admin-section-heading"><h2>Recent orders</h2><button onClick={onOpenOrders}>View all orders <FiChevronDown /></button></div><OrderTable compact /></>;

const OrdersContent = () => <><div className="admin-content-heading"><div><p className="eyebrow">Live order queue</p><h2>Orders</h2></div><button className="admin-filter"><FiBarChart2 /> Filter</button></div><div className="admin-tabs"><button className="active">New Orders <b>12</b></button><button>Preparing <b>5</b></button><button>Out for Delivery <b>8</b></button><button>Completed</button><button>Cancelled</button></div><OrderTable /></>;

const OrderTable = ({ compact = false }) => <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Amount</th><th>Delivery Address</th><th>Time</th><th>Action</th></tr></thead><tbody>{orders.slice(0, compact ? 3 : orders.length).map((order) => <tr key={order[0]}>{order.map((cell, index) => <td key={`${order[0]}-${index}`}>{cell}</td>)}<td><button className="accept-button">Accept</button><button className="reject-button">Reject</button></td></tr>)}</tbody></table></div>;

const MenuContent = ({ menu, setEditingItem }) => <><div className="admin-content-heading"><div><p className="eyebrow">Catalog management</p><h2>Menu items</h2></div><button className="admin-primary" onClick={() => setEditingItem(true)}><FiPlus /> Add menu item</button></div><div className="admin-menu-grid">{menu.map((item) => <article className="admin-menu-row" key={item.id}><div className="admin-menu-icon"><FiPackage /></div><div><strong>{item.name}</strong><span>{item.category}</span></div><b>KES {item.price.toLocaleString()}</b><em className={item.availability ? 'available' : 'unavailable'}>{item.availability ? 'Available' : 'Unavailable'}</em><button onClick={() => setEditingItem(item)} aria-label={`Edit ${item.name}`}><FiEdit2 /></button></article>)}</div></>;

const CustomersContent = () => <><div className="admin-content-heading"><div><p className="eyebrow">Loyalty and accounts</p><h2>Customers</h2></div><button className="admin-filter"><FiUsers /> Export list</button></div><div className="customer-summary"><span><strong>1,248</strong> registered customers</span><span><strong>342</strong> active this month</span><span><strong>18,450</strong> points issued</span></div><div className="admin-table-wrap"><table className="admin-table customer-table"><thead><tr><th>Customer</th><th>Email</th><th>Orders</th><th>Loyalty points</th><th>Tier</th><th>Action</th></tr></thead><tbody>{customers.map((customer) => <tr key={customer.email}><td><strong>{customer.name}</strong></td><td>{customer.email}</td><td>{customer.orders}</td><td>{customer.points} pts</td><td><span className="tier-badge">{customer.tier}</span></td><td><button className="points-button">Give points</button><button className="discount-button">Discount</button></td></tr>)}</tbody></table></div></>;

const RidersContent = ({ riders, onAdd, onRemove }) => <><div className="admin-content-heading"><div><p className="eyebrow">Delivery team</p><h2>Riders</h2></div><div className="admin-heading-actions"><a className="admin-primary" href="/rider"><FiTruck /> Open rider dashboard</a><button className="admin-primary" onClick={onAdd}><FiPlus /> Add rider</button></div></div><div className="customer-summary"><span><strong>{riders.length}</strong> registered riders</span><span><strong>{riders.filter((rider) => rider.status === 'Online').length}</strong> online now</span><span><strong>19</strong> deliveries completed today</span></div><div className="admin-rider-grid">{riders.map((rider) => <RiderRow key={rider.id} {...rider} onRemove={() => onRemove(rider.id)} />)}</div></>;

const RiderRow = ({ initials, name, phone, status, deliveries, onRemove }) => <article className="admin-rider-row"><div className="admin-rider-avatar">{initials}</div><div className="admin-rider-name"><strong>{name}</strong><span>{phone}</span></div><span className={`rider-online-status ${status === 'Online' ? 'online' : ''}`}>{status}</span><span className="admin-rider-deliveries">{deliveries} deliveries</span><button className="admin-filter">View profile</button><button className="admin-remove-rider" onClick={onRemove} aria-label={`Remove ${name}`}><FiTrash2 /></button></article>;

const PlaceholderContent = ({ title }) => <div className="admin-placeholder"><div className="admin-placeholder-icon"><FiSettings /></div><h2>{title} workspace</h2><p>This section is ready for your {title.toLowerCase()} tools and data.</p></div>;

const MenuEditor = ({ item, onSave, onClose }) => <div className="admin-modal-backdrop"><form className="admin-modal" onSubmit={onSave}><button type="button" className="admin-modal-close" onClick={onClose}><FiX /></button><p className="eyebrow">Catalog management</p><h2>{item ? 'Edit menu item' : 'Add menu item'}</h2><label>Item name<input name="name" defaultValue={item?.name || ''} required /></label><label>Category<select name="category" defaultValue={item?.category || 'Meals'}><option>Meals</option><option>Wine</option><option>Drinks</option><option>Desserts</option></select></label><label>Price<input name="price" type="number" min="0" defaultValue={item?.price || ''} required /></label><button className="admin-primary" type="submit"><FiSave /> Save item</button></form></div>;

const RiderEditor = ({ onSave, onClose }) => <div className="admin-modal-backdrop"><form className="admin-modal" onSubmit={onSave}><button type="button" className="admin-modal-close" onClick={onClose}><FiX /></button><p className="eyebrow">Delivery team</p><h2>Add rider</h2><label>Full name<input name="name" placeholder="Peter Banda" required /></label><label>Phone number<input name="phone" type="tel" placeholder="0712 987 654" required /></label><button className="admin-primary" type="submit"><FiSave /> Add rider</button></form></div>;

export default AdminDashboard;
