import { useState } from 'react';
import { FiCheck, FiClock, FiDollarSign, FiGrid, FiHelpCircle, FiList, FiLogOut, FiMapPin, FiMenu, FiNavigation, FiPhone, FiShoppingBag, FiTruck, FiX } from 'react-icons/fi';

const initialDeliveries = [
  { id: '#CH254-00124', customer: 'John Mwangi', address: 'Westlands, School Lane, House 12', phone: '0712 345 678', items: '3 items', amount: 'KES 5,450', time: '6:45 PM', distance: '2.4 km', latitude: -1.2635, longitude: 36.8031 },
  { id: '#CH254-00123', customer: 'Mary Wanjiku', address: 'Kilimani, Kindaruma Road', phone: '0708 234 567', items: '2 items', amount: 'KES 3,200', time: '6:42 PM', distance: '4.1 km', latitude: -1.2921, longitude: 36.7836 },
  { id: '#CH254-00122', customer: 'Brian Oduor', address: 'Lavington, Convent Drive', phone: '0722 456 789', items: '4 items', amount: 'KES 7,800', time: '6:40 PM', distance: '5.8 km', latitude: -1.2823, longitude: 36.7687 },
  { id: '#CH254-00121', customer: 'Grace Kerubo', address: 'Parklands, 3rd Avenue', phone: '0790 123 456', items: '2 items', amount: 'KES 2,750', time: '6:38 PM', distance: '3.6 km', latitude: -1.2554, longitude: 36.8173 },
];

const RiderDashboard = ({ user, onLogout }) => {
  const [deliveries, setDeliveries] = useState(initialDeliveries);
  const [completed, setCompleted] = useState([]);
  const [selectedId, setSelectedId] = useState(initialDeliveries[0].id);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const selectedDelivery = deliveries.find((order) => order.id === selectedId) || deliveries[0];

  const markCompleted = (orderId) => {
    setDeliveries((current) => current.filter((order) => order.id !== orderId));
    setCompleted((current) => [...current, orderId]);
    setSelectedId((current) => current === orderId ? deliveries.find((order) => order.id !== orderId)?.id || null : current);
  };

  return <div className="rider-layout">
    <button className="rider-mobile-toggle" onClick={() => setSidebarOpen(true)} aria-label="Open rider navigation"><FiMenu /></button>
    {sidebarOpen && <button className="rider-scrim" onClick={() => setSidebarOpen(false)} aria-label="Close rider navigation" />}
    <aside className={`rider-sidebar ${sidebarOpen ? 'open' : ''}`}>
      <div className="rider-sidebar-brand"><span className="rider-brand-mark">♜</span><span>CHÂTEAU<span>254</span><small>RIDER PORTAL</small></span><button onClick={() => setSidebarOpen(false)} aria-label="Close rider navigation"><FiX /></button></div>
      <div className="rider-profile"><div className="rider-avatar">{user?.full_name?.slice(0, 2).toUpperCase() || 'RD'}</div><div><strong>{user?.full_name || 'Rider'}</strong><small><i /> Online</small></div></div>
      <nav className="rider-nav"><button className="active"><FiGrid /> Dashboard</button><button><FiList /> My deliveries <b>{deliveries.length}</b></button><button><FiClock /> Delivery history</button><button><FiDollarSign /> Earnings</button><button><FiHelpCircle /> Support</button></nav>
      <button className="rider-logout" onClick={onLogout}><FiLogOut /> Sign out</button>
    </aside>
    <section className="rider-content"><div className="rider-page">
    <div className="rider-heading"><div><p className="eyebrow">Delivery partner workspace</p><h2>Welcome, {user?.full_name || 'Rider'}</h2><p>Complete your active deliveries and keep customers updated.</p></div><div className="rider-status"><i /><span>Online</span></div></div>
    <div className="rider-stats"><div><FiTruck /><span><strong>{deliveries.length}</strong> active deliveries</span></div><div><FiCheck /><span><strong>{completed.length}</strong> completed today</span></div><div><FiClock /><span><strong>45 min</strong> average delivery</span></div></div>
    {selectedDelivery && <section className="rider-map-section"><div className="rider-map-heading"><div><span className="rider-order-number">DROP-OFF MAP</span><h3>{selectedDelivery.customer}'s delivery</h3><p><FiMapPin /> {selectedDelivery.address}</p></div><a href={`https://www.google.com/maps/search/?api=1&query=${selectedDelivery.latitude},${selectedDelivery.longitude}`} target="_blank" rel="noreferrer"><FiNavigation /> Open in maps</a></div><iframe className="rider-map" title={`Map for ${selectedDelivery.customer}'s delivery`} src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedDelivery.longitude - 0.018}%2C${selectedDelivery.latitude - 0.012}%2C${selectedDelivery.longitude + 0.018}%2C${selectedDelivery.latitude + 0.012}&layer=mapnik&marker=${selectedDelivery.latitude}%2C${selectedDelivery.longitude}`} /></section>}
    <div className="rider-section-title"><h3>Active deliveries</h3><span>{deliveries.length} orders remaining</span></div>
    {deliveries.length ? <div className="rider-delivery-list">{deliveries.map((order) => <DeliveryCard key={order.id} order={order} selected={order.id === selectedDelivery?.id} onSelect={() => setSelectedId(order.id)} onComplete={() => markCompleted(order.id)} />)}</div> : <div className="rider-empty"><FiCheck /><h3>All deliveries completed</h3><p>There are no orders waiting for delivery.</p></div>}
    </div></section>
  </div>;
};

const DeliveryCard = ({ order, selected, onSelect, onComplete }) => <article className={`rider-delivery-card ${selected ? 'selected' : ''}`} onClick={onSelect}><div className="rider-card-top"><div><span className="rider-order-number">{order.id}</span><h3>{order.customer}</h3></div><span className="rider-stage"><FiTruck /> Out for delivery</span></div><div className="rider-card-details"><div><FiMapPin /><span><small>Delivery address</small><strong>{order.address}</strong></span></div><div><FiShoppingBag /><span><small>Order details</small><strong>{order.items} · {order.amount}</strong></span></div><div><FiClock /><span><small>Received</small><strong>{order.time} · {order.distance}</strong></span></div></div><div className="rider-card-actions"><a href={`tel:${order.phone}`} onClick={(event) => event.stopPropagation()}><FiPhone /> Call customer</a><a className="rider-directions" href={`https://www.google.com/maps/search/?api=1&query=${order.latitude},${order.longitude}`} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}><FiNavigation /> Directions</a><button className="rider-complete" onClick={(event) => { event.stopPropagation(); onComplete(); }}><FiCheck /> Mark as delivered</button></div></article>;

export default RiderDashboard;
