import './App.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import italianWinesData from './components/data/italian_wines_producer_grouped.json';
import southAfricanWinesData from './components/data/chateau_south_african_wines.json';
import frenchWinesData from './components/data/chateau_french_wines.json';
import { SocketProvider } from './contexts/SocketContext';
import { useToast } from './contexts/ToastContext';
import Home from './pages/UI/home';
import Menu from './pages/UI/menu';
import Cart from './pages/UI/cart';
import Checkout from './pages/UI/checkout';
import Confirmation from './pages/UI/confirmation';
import Tracking from './pages/UI/tracking';
import Profile from './pages/UI/profile';
import ViewItem from './pages/UI/view_item';
import EventsPage from './pages/UI/events';
import AppHeader from './components/Navigation';
import Auth from './pages/auth/auth';
import AdminDashboard from './pages/UI/admin/admin_dash';
import RiderDashboard from './pages/rider/rider_dash';
import Booking from './pages/UI/booking';
import FullMenu from './pages/UI/full_menu';
import WinesPage from './pages/UI/wines';
import Cellar from './pages/UI/cellar';
import Feed from './pages/UI/feed';
import NotFound from './pages/UI/not_found';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const flattenRegionalWines = (data, prefix) => {
  return (data.producers || []).flatMap((producer, pIdx) =>
    (producer.wines || []).map((wine, wIdx) => ({
      id: `${prefix}-wine-${pIdx}-${wIdx}`,
      name: wine.name,
      description: wine.backstory || `${wine.color} from ${data.region}`,
      price: Math.round(((wine.price_range_kes?.min || 0) + (wine.price_range_kes?.max || 0)) / 2),
      priceRange: wine.price_range_kes,
      category: 'Wine',
      image: wine.image || '',
      type: wine.color,
      region: data.region,
      grape: wine.grape,
      notes: wine.backstory,
      classification: wine.category_filter || null,
      on_offer: Boolean(wine.on_offer || wine.on_Offer || wine.classification?.on_offer || wine.classification?.on_Offer),
      offer: wine.offer || wine.classification?.offer || null,
      producer: producer.producer,
      producerRegion: producer.producer_region,
      confidence: wine.confidence,
      source_note: wine.source_note,
      rating: wine.rating || null,
    }))
  );
};

const allRegionalWines = [
  ...flattenRegionalWines(italianWinesData, 'italian'),
  ...flattenRegionalWines(southAfricanWinesData, 'south-african'),
  ...flattenRegionalWines(frenchWinesData, 'french'),
];

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

const ItemRoute = ({ addToCart, onWineFactSelect, onWinePairingSelect, catalogs }) => {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const item = Object.values(catalogs || {}).flat().find((catalogItem) => catalogItem.id === itemId);
  return <ViewItem item={item} addToCart={addToCart} onBack={() => navigate('/menu')} onCart={() => navigate('/cart')} onWineFactSelect={onWineFactSelect} onWinePairingSelect={onWinePairingSelect} />;
};

const App = () => {
  const [mode, setMode] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const m = params.get('mode');
      if (m === 'dinein' || m === 'dining') return 'dining';
      if (m === 'takeout') return 'takeout';
      if (m === 'lunchbox') return 'lunchbox';
      if (m === 'events') return 'events';
    } catch { }
    return 'dining';
  });
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [wineFilter, setWineFilter] = useState(null);
  const [wineClassFilter, setWineClassFilter] = useState(null);
  const [winePairingFilter, setWinePairingFilter] = useState(null);
  const [cart, setCart] = useState(loadCart);
  const [order, setOrder] = useState(null);
  const [lastOrderId, setLastOrderId] = useState(loadLastOrder);
  const [session, setSession] = useState(storedSession);
  const [dineInSelections, setDineInSelections] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const isProgrammaticNav = useRef(false);

  useEffect(() => {
    fetch(`${API_URL}/menu?all=true`)
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then((data) => { setMenuItems(data.items || []); })
      .catch(() => { });
  }, []);

  const dineInItems = useMemo(() => menuItems.filter((i) => i.menuType === 'dine_in'), [menuItems]);
  const takeoutItems = useMemo(() => menuItems.filter((i) => i.menuType === 'takeout'), [menuItems]);
  const eventItems = useMemo(() => takeoutItems.filter((i) => ['Appetizers', 'Mains', 'Desserts', 'Beverages', 'Salads', 'Platters', 'Combos'].includes(i.subcategory)), [takeoutItems]);

  // Bar bites and lunchbox plates live in lunchbox_menu, so "Lunch & Bar" is a plain
  // read of the lunchbox menu type. No display-time re-homing is needed.
  const lunchAndBarItems = useMemo(() => menuItems.filter((i) => i.menuType === 'lunchbox'), [menuItems]);
  const dineInFoodItems = dineInItems;

  const catalogs = useMemo(() => ({
    dining: [...dineInFoodItems, ...allRegionalWines],
    takeout: [...takeoutItems, ...allRegionalWines],
    lunchbox: [...lunchAndBarItems],
    events: [...eventItems, ...allRegionalWines],
  }), [dineInFoodItems, takeoutItems, lunchAndBarItems, eventItems]);

  const activeCatalog = catalogs[mode] || catalogs.dining;
  const activeCategories = useMemo(() => {
    const cats = new Set(activeCatalog.map((i) => i.category).filter((c) => c !== 'Wine' && c !== 'Meals'));
    const subs = new Set(activeCatalog.map((i) => i.subcategory).filter(Boolean));
    const combined = ['All', ...Array.from(cats), ...Array.from(subs)];
    return combined;
  }, [activeCatalog]);

  const visibleItems = useMemo(() => {
    const baseMatches = activeCatalog.filter((item) => {
      const matchesCategory = filter === 'All' || item.category === filter || item.subcategory === filter;
      const matchesQuery = item.name.toLowerCase().includes(query.toLowerCase());
      return matchesCategory && matchesQuery;
    });
    let results = wineFilter ? baseMatches.filter((item) => item.category === 'Wine' && item[wineFilter.field] === wineFilter.value) : baseMatches;
    if (wineClassFilter) {
      results = results.filter((item) => item.category === 'Wine' && item.classification?.[wineClassFilter.field] === wineClassFilter.value);
    }
    if (winePairingFilter) {
      const searchTerm = winePairingFilter.toLowerCase();
      results = results.filter((item) => item.category === 'Wine' && (item.name?.toLowerCase().includes(searchTerm) || item.type?.toLowerCase().includes(searchTerm) || item.grape?.toLowerCase().includes(searchTerm)));
    }
    return results;
  }, [activeCatalog, filter, query, wineFilter, wineClassFilter, winePairingFilter]);
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const subtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  const delivery = subtotal ? 250 : 0;

  useEffect(() => {
    localStorage.setItem('chateau254_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (item) => setCart((current) => {
    const found = current.find((cartItem) => cartItem.id === item.id);
    addToast(`${item.name} added to cart`, 'success');
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

      const unresolved = cart.filter((item) => !nameToId[item.name]);
      if (unresolved.length) {
        alert(`These items are no longer available on the backend menu: ${unresolved.map((i) => i.name).join(', ')}. Please remove them before checkout.`);
        return;
      }

      const body = {
        user_id: session.user.id,
        delivery_address: deliveryAddress,
        total_amount: subtotal + delivery,
        latitude: coords?.latitude || null,
        longitude: coords?.longitude || null,
        items: cart.map((item) => ({
          menu_item_id: nameToId[item.name],
          quantity: item.quantity,
          unit_price: item.price,
        })),
      };
      const res = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` },
        body: JSON.stringify(body),
      });
      const errorPayload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(errorPayload.error || 'Failed to place order');
      const data = errorPayload;
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

  useEffect(() => {
    // Ignore URL changes triggered by our own switchMode()
    if (isProgrammaticNav.current) {
      isProgrammaticNav.current = false;
      return;
    }
    const params = new URLSearchParams(location.search);
    const modeParam = params.get('mode');
    if (modeParam) {
      const normalized = (modeParam === 'dinein' || modeParam === 'dining') ? 'dining' : modeParam;
        if (normalized !== mode && catalogs[normalized]) {
        setMode(normalized);
        setFilter('All');
        setQuery('');
        setWineFilter(null);
        setWineClassFilter(null);
      }
    }
  }, [location.search, mode, catalogs]);

  const switchMode = (newMode) => {
    const normalized = (newMode === 'dinein' || newMode === 'dining') ? 'dining' : newMode;
    setMode(normalized);
    setFilter('All');
    setQuery('');
    setWineFilter(null);
    setWineClassFilter(null);
    isProgrammaticNav.current = true;
    navigate(`/menu?mode=${normalized}`);
  };

  const handleBack = () => navigate(-1);

  const addDineInItem = (item) => {
    setDineInSelections((prev) => {
      if (prev.find((selected) => selected.id === item.id)) return prev;
      return [...prev, item];
    });
  };

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
      .catch(() => { });
  }, [lastOrderId, order?.id, session?.token]);

  const showAppHeader = location.pathname !== '/' && location.pathname !== '/auth' && !location.pathname.startsWith('/admin') && !location.pathname.startsWith('/rider');

  return <SocketProvider token={session?.token}>
    <div className={`app-shell${showAppHeader ? ' has-app-header' : ''}`}>
      {showAppHeader && <AppHeader cartCount={cartCount} userName={session?.user?.full_name} onCart={() => navigate('/cart')} onProfile={() => navigate('/profile')} api={API_URL} />}
      <Routes>
        <Route path="/" element={<GuestRoute user={session?.user}><Home api={API_URL} onTakeout={() => { switchMode('takeout'); navigate('/menu'); }} onDining={() => { switchMode('dining'); navigate('/menu'); }} onEvents={() => navigate('/events')} onWines={() => navigate('/wines')} onAuth={() => navigate('/auth')} /></GuestRoute>} />
        <Route path="/events" element={<EventsPage user={session?.user} onExploreCatering={() => { switchMode('events'); navigate('/menu'); }} />} />
        <Route path="/auth" element={<Auth onSuccess={handleAuthSuccess} onBack={() => navigate('/')} />} />
        <Route path="/admin/*" element={<ProtectedRoute user={session?.user} roles={['admin']}><AdminDashboard user={session?.user} token={session?.token} api={API_URL} onLogout={handleLogout} /></ProtectedRoute>} />
        <Route path="/rider" element={<ProtectedRoute user={session?.user} roles={['rider']}><RiderDashboard user={session?.user} token={session?.token} api={API_URL} onLogout={handleLogout} /></ProtectedRoute>} />
        <Route path="/booking" element={<ProtectedRoute user={session?.user}><Booking user={session?.user} token={session?.token} selectedItems={dineInSelections} onClearSelections={() => setDineInSelections([])} /></ProtectedRoute>} />
        <Route path="/menu" element={<Menu api={API_URL} items={visibleItems} offerItems={menuItems} user={session?.user} categories={activeCategories} filter={filter} setFilter={(cat) => { setFilter(cat); if (cat !== 'Wine') setWineClassFilter(null); }} query={query} setQuery={setQuery} addToCart={addToCart} cartCount={cartCount} onCart={() => navigate('/cart')} onViewItem={(item) => navigate(`/item/${item.id}`)} onBooking={() => navigate('/booking')} wineFilter={wineFilter} onClearWineFilter={() => { setWineFilter(null); setWinePairingFilter(null); }} wineClassFilter={wineClassFilter} setWineClassFilter={setWineClassFilter} mode={mode} winePairingFilter={winePairingFilter} onClearWinePairingFilter={() => setWinePairingFilter(null)} onBack={handleBack} dineInSelections={dineInSelections} addDineInItem={addDineInItem} />} />
        <Route path="/full-menu" element={<FullMenu onMakeOrder={() => { switchMode('takeout'); navigate('/menu'); }} onReserveTable={() => navigate('/booking')} />} />
        <Route path="/item/:itemId" element={<ItemRoute addToCart={addToCart} onWineFactSelect={(field, value) => {
          setFilter('Wine');
          setQuery('');
          setWineFilter({ field, value });
          setWinePairingFilter(null);
          navigate('/menu');
        }} onWinePairingSelect={(pairingName) => {
          setFilter('Wine');
          setQuery('');
          setWineFilter(null);
          setWineClassFilter(null);
          setWinePairingFilter(pairingName);
          navigate('/menu');
        }} catalogs={catalogs} />} />
        <Route path="/cart" element={<Cart cart={cart} user={session?.user} subtotal={subtotal} delivery={delivery} changeQuantity={changeQuantity} onCheckout={() => navigate('/checkout')} onMenu={() => navigate('/menu')} onBack={handleBack} />} />
        <Route path="/checkout" element={<Checkout subtotal={subtotal} delivery={delivery} placeOrder={placeOrder} />} />
        <Route path="/my-cellar" element={<Cellar user={session?.user} onMenu={() => navigate('/menu')} onBack={handleBack} />} />

        <Route path="/confirmation" element={<Confirmation order={order} onTrack={() => navigate('/track')} onMenu={() => navigate('/menu')} />} />
        <Route path="/track" element={<Tracking order={order} token={session?.token} api={API_URL} onMenu={() => navigate('/menu')} />} />
        <Route path="/tracking" element={<Navigate to="/track" replace />} />
        <Route path="/profile" element={<ProfileRoute user={session?.user}><Profile user={session?.user} token={session?.token} onBack={handleBack} onLogout={handleLogout} onTrack={(o) => { setOrder({ id: o.id, number: o.id.slice(0, 8), total: Number(o.total_amount) }); navigate('/track'); }} onBooking={() => navigate('/booking')} onCellar={() => navigate('/my-cellar')} /></ProfileRoute>} />
        <Route path="/wines" element={<WinesPage />} />
        <Route path="/feed" element={<Feed session={session} />} />
        <Route path="/404" element={<NotFound onHome={() => navigate('/menu')} onBack={handleBack} />} />
        <Route path="*" element={<NotFound onHome={() => navigate('/menu')} onBack={handleBack} />} />
      </Routes>
    </div>
  </SocketProvider>;
};

export default App;
