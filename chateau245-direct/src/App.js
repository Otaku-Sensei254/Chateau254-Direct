import './App.css';
import { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import menuItems from './components/data/menu.json';
import wines from './components/data/luxury_wine_list.json';
import takeoutMenuData from './components/data/takeout_menu.json';
import takeoutWinesData from './components/data/takeout_wine_list.json';
import eventMenuData from './components/data/event_menu.json';
import eventWinesData from './components/data/event_wine_list.json';
import { SocketProvider } from './contexts/SocketContext';
import Home from './pages/UI/home';
import Menu from './pages/UI/menu';
import Cart from './pages/UI/cart';
import Checkout from './pages/UI/checkout';
import Confirmation from './pages/UI/confirmation';
import Tracking from './pages/UI/tracking';
import Profile from './pages/UI/profile';
import ViewItem from './pages/UI/view_item';
import EventsPage from './pages/UI/events';
import AppHeader from './pages/UI/shared';
import Auth from './pages/auth/auth';
import AdminDashboard from './pages/UI/admin/admin_dash';
import RiderDashboard from './pages/rider/rider_dash';
import Booking from './pages/UI/booking';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const normalizedWines = wines.map((wine, index) => ({
  id: `luxury-wine-${index}`,
  name: wine.name,
  description: wine.notes || `${wine.type} from ${wine.region}`,
  price: 6500 + index * 750,
  category: 'Wine',
  image: wine.image,
  type: wine.type,
  region: wine.region,
  grape: wine.grape,
  notes: wine.notes,
  classification: wine.classification || null,
}));

const normalizeGroupedMenu = (groups, prefix) =>
  (groups || []).flatMap(({ category, items }) =>
    (items || []).map((item, i) => ({
      id: `${prefix}-${category.replace(/\W+/g, '-').toLowerCase()}-${i}`,
      name: item.name,
      description: item.description,
      price: Math.round(((item.price_range_kes?.min || 0) + (item.price_range_kes?.max || 0)) / 2),
      priceRange: item.price_range_kes,
      category,
      image: item.image || '',
      unit: item.unit || null,
    }))
  );

const normalizeWineList = (wineArr, prefix) =>
  (wineArr || []).map((wine, index) => ({
    id: `${prefix}-wine-${index}`,
    name: wine.name,
    description: wine.notes || `${wine.type} from ${wine.region}`,
    price: Math.round(((wine.price_range_kes?.min || 0) + (wine.price_range_kes?.max || 0)) / 2),
    priceRange: wine.price_range_kes,
    category: 'Wine',
    image: wine.image || '',
    type: wine.type,
    region: wine.region,
    grape: wine.grape,
    notes: wine.notes,
    classification: wine.classification || null,
    eventFit: wine.event_fit || null,
  }));

const CATALOGS = {
  dining: [...menuItems, ...normalizedWines],
  takeout: [
    ...normalizeGroupedMenu(takeoutMenuData.takeout_menu, 'takeout'),
    ...normalizeWineList(takeoutWinesData.takeout_orderout_wine_list, 'takeout'),
  ],
  events: [
    ...normalizeGroupedMenu(eventMenuData.event_menu, 'events'),
    ...normalizeWineList(eventWinesData.event_wine_list, 'events'),
  ],
};

const loadCart = () => {
  try { return JSON.parse(localStorage.getItem('chateau254_cart')) || []; }
  catch { return []; }
};

const loadLastOrder = () => {
  try { return localStorage.getItem('chateau254_last_order') || null; }
  catch { return null; }
};

const storedSession = () => {
  try { return JSON.parse(localStorage.getItem('chateau254_session')) || null; }
  catch { return null; }
};

const ProtectedRoute = ({ user, roles, children }) => {
  if (!user) return <Navigate to="/auth" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/menu" replace />;
  return children;
};

const GuestRoute = ({ user, children }) => {
  if (user) {
    const destination = user.role === 'admin' ? '/admin' : user.role === 'rider' ? '/rider' : '/menu';
    return <Navigate to={destination} replace />;
  }
  return children;
};

const ProfileRoute = ({ user, children }) => {
  if (!user) return <Navigate to="/auth" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'rider') return <Navigate to="/rider" replace />;
  return children;
};

const ItemRoute = ({ addToCart, onWineFactSelect, activeCatalog = [] }) => {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const item = activeCatalog.find((catalogItem) => catalogItem.id === itemId);
  return <ViewItem item={item} addToCart={addToCart} onBack={() => navigate('/menu')} onCart={() => navigate('/cart')} onWineFactSelect={onWineFactSelect} />;
};

const App = () => {
  const [mode, setMode] = useState('dining');
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [wineFilter, setWineFilter] = useState(null);
  const [wineClassFilter, setWineClassFilter] = useState(null);
  const [cart, setCart] = useState(loadCart);
  const [order, setOrder] = useState(null);
  const [lastOrderId, setLastOrderId] = useState(loadLastOrder);
  const [session, setSession] = useState(storedSession);
  const location = useLocation();
  const navigate = useNavigate();

  const activeCatalog = CATALOGS[mode] || CATALOGS.dining;
  const activeCategories = useMemo(() => {
    const cats = [...new Set(activeCatalog.map((i) => i.category))];
    return ['All', ...cats];
  }, [activeCatalog]);

  const visibleItems = useMemo(() => {
    const baseMatches = activeCatalog.filter((item) => (filter === 'All' || item.category === filter) && item.name.toLowerCase().includes(query.toLowerCase()));
    let results = wineFilter ? baseMatches.filter((item) => item.category === 'Wine' && item[wineFilter.field] === wineFilter.value) : baseMatches;
    if (wineClassFilter) {
      results = results.filter((item) => item.category === 'Wine' && item.classification?.[wineClassFilter.field] === wineClassFilter.value);
    }
    return results;
  }, [activeCatalog, filter, query, wineFilter, wineClassFilter]);
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const subtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  const delivery = subtotal ? 250 : 0;

  useEffect(() => {
    localStorage.setItem('chateau254_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (item) => setCart((current) => {
    const found = current.find((cartItem) => cartItem.id === item.id);
    return found ? current.map((cartItem) => cartItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem) : [...current, { ...item, quantity: 1 }];
  });

  const changeQuantity = (id, amount) => setCart((current) => current.map((item) => item.id === id ? { ...item, quantity: item.quantity + amount } : item).filter((item) => item.quantity > 0));

  const placeOrder = async (event, coords) => {
    event.preventDefault();
    if (!session?.token) { navigate('/auth'); return; }
    const form = new FormData(event.currentTarget);
    const deliveryAddress = form.get('address') || 'Not specified';
    try {
      const menuRes = await fetch(`${API_URL}/menu`);
      const menuData = await menuRes.json();
      const nameToId = {};
      (menuData.items || []).forEach((item) => { nameToId[item.name] = item.id; });
      const body = {
        user_id: session.user.id,
        delivery_address: deliveryAddress,
        total_amount: subtotal + delivery,
        latitude: coords?.latitude || null,
        longitude: coords?.longitude || null,
        items: cart.map((item) => ({
          menu_item_id: nameToId[item.name] || item.id,
          quantity: item.quantity,
          unit_price: item.price,
        })),
      };
      const res = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to place order');
      const data = await res.json();
      const placedOrder = { id: data.order.id, number: data.order.id.slice(0, 8), total: Number(data.order.total_amount) };
      setOrder(placedOrder);
      localStorage.setItem('chateau254_last_order', placedOrder.id);
      setLastOrderId(placedOrder.id);
      setCart([]);
      navigate('/confirmation');
    } catch (err) {
      alert(err.message || 'Something went wrong. Please try again.');
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setFilter('All');
    setQuery('');
    setWineFilter(null);
    setWineClassFilter(null);
  };

  const handleBack = () => navigate(location.pathname === '/menu' || location.pathname === '/events' ? '/' : '/menu');

  const handleAuthSuccess = (user, token) => {
    const nextSession = { user, token };
    localStorage.setItem('chateau254_session', JSON.stringify(nextSession));
    setSession(nextSession);
    navigate(user.role === 'admin' ? '/admin' : user.role === 'rider' ? '/rider' : '/menu');
  };

  const handleLogout = () => {
    localStorage.removeItem('chateau254_session');
    setSession(null);
    navigate('/');
  };

  useEffect(() => {
    if (!session?.token) return undefined;
    fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${session.token}` } })
      .then((response) => {
        if (response.status === 401) throw new Error('Session expired');
        if (!response.ok) throw new Error('Temporary server error');
        return response.json();
      })
      .then((result) => setSession((current) => ({ ...current, user: result.user })))
      .catch((err) => {
        if (err.message === 'Session expired') {
          localStorage.removeItem('chateau254_session');
          setSession(null);
          navigate('/');
        }
      });
    return undefined;
  }, [navigate, session?.token]);

  useEffect(() => {
    if (!lastOrderId || order?.id === lastOrderId || !session?.token) return;
    fetch(`${API_URL}/orders/${lastOrderId}`, { headers: { Authorization: `Bearer ${session.token}` } })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (data?.order) setOrder({ id: data.order.id, number: data.order.id.slice(0, 8), total: Number(data.order.total_amount) }); })
      .catch(() => {});
  }, [lastOrderId, order?.id, session?.token]);

  return <SocketProvider token={session?.token}>
    <div className="app-shell">
      {location.pathname !== '/' && location.pathname !== '/auth' && !location.pathname.startsWith('/admin') && !location.pathname.startsWith('/rider') && <AppHeader cartCount={cartCount} userName={session?.user?.full_name} onBack={handleBack} onCart={() => navigate('/cart')} onHome={() => navigate('/menu')} onProfile={() => navigate('/profile')} />}
      <Routes>
        <Route path="/" element={<GuestRoute user={session?.user}><Home onTakeout={() => { switchMode('takeout'); navigate('/menu'); }} onDining={() => { switchMode('dining'); navigate('/menu'); }} onEvents={() => navigate('/events')} onAuth={() => navigate('/auth')} /></GuestRoute>} />
        <Route path="/events" element={<EventsPage user={session?.user} onExploreCatering={() => { switchMode('events'); navigate('/menu'); }} />} />
        <Route path="/auth" element={<Auth onSuccess={handleAuthSuccess} onBack={() => navigate('/')} />} />
        <Route path="/admin/*" element={<ProtectedRoute user={session?.user} roles={['admin']}><AdminDashboard user={session?.user} token={session?.token} api={API_URL} onLogout={handleLogout} /></ProtectedRoute>} />
        <Route path="/rider" element={<ProtectedRoute user={session?.user} roles={['rider']}><RiderDashboard user={session?.user} token={session?.token} api={API_URL} onLogout={handleLogout} /></ProtectedRoute>} />
        <Route path="/booking" element={<ProtectedRoute user={session?.user}><Booking user={session?.user} token={session?.token} items={CATALOGS.dining} /></ProtectedRoute>} />
        <Route path="/menu" element={<Menu items={visibleItems} user={session?.user} categories={activeCategories} filter={filter} setFilter={(cat) => { setFilter(cat); if (cat !== 'Wine') setWineClassFilter(null); }} query={query} setQuery={setQuery} addToCart={addToCart} cartCount={cartCount} onCart={() => navigate('/cart')} onViewItem={(item) => navigate(`/item/${item.id}`)} onBooking={() => navigate('/booking')} wineFilter={wineFilter} onClearWineFilter={() => setWineFilter(null)} wineClassFilter={wineClassFilter} setWineClassFilter={setWineClassFilter} mode={mode} />} />
        <Route path="/item/:itemId" element={<ItemRoute activeCatalog={activeCatalog} addToCart={addToCart} onWineFactSelect={(field, value) => {
          setFilter('Wine');
          setQuery('');
          setWineFilter({ field, value });
          navigate('/menu');
        }} />} />
        <Route path="/cart" element={<Cart cart={cart} subtotal={subtotal} delivery={delivery} changeQuantity={changeQuantity} onCheckout={() => navigate('/checkout')} onMenu={() => navigate('/menu')} />} />
        <Route path="/checkout" element={<Checkout subtotal={subtotal} delivery={delivery} placeOrder={placeOrder} />} />
        <Route path="/confirmation" element={<Confirmation order={order} onTrack={() => navigate('/track')} onMenu={() => navigate('/menu')} />} />
        <Route path="/track" element={<Tracking order={order} token={session?.token} api={API_URL} onMenu={() => navigate('/menu')} />} />
        <Route path="/tracking" element={<Navigate to="/track" replace />} />
        <Route path="/profile" element={<ProfileRoute user={session?.user}><Profile user={session?.user} token={session?.token} onBack={handleBack} onLogout={handleLogout} onTrack={(o) => { setOrder({ id: o.id, number: o.id.slice(0, 8), total: Number(o.total_amount) }); navigate('/track'); }} onBooking={() => navigate('/booking')} /></ProfileRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  </SocketProvider>;
};

export default App;
