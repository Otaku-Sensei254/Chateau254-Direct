import './App.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { SocketProvider } from './contexts/SocketContext';
import { useToast } from './contexts/ToastContext';
import Home from './pages/UI/home';
import Menu from './pages/UI/menu';
import Cart from './pages/UI/cart';
import Checkout from './pages/UI/checkout';
import PaymentResult from './pages/UI/payment_result';
import Confirmation from './pages/UI/confirmation';
import Tracking from './pages/UI/tracking';
import Profile from './pages/UI/profile';
import ViewItem from './pages/UI/view_item';
import EventsPage from './pages/UI/events';
import AppHeader from './components/Navigation';
import AppFooter from './components/AppFooter';
import Auth from './pages/auth/auth';
import AdminDashboard from './pages/UI/admin/admin_dash';
import RiderDashboard from './pages/rider/rider_dash';
import Booking from './pages/UI/booking';
import FullMenu from './pages/UI/full_menu';
import WinesPage from './pages/UI/wines';
import Cellar from './pages/UI/cellar';
import Feed from './pages/UI/feed';
import NotFound from './pages/UI/not_found';
import { isTakeoutEnabled } from './config/features';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const loadCart = () => {
  try { return JSON.parse(localStorage.getItem('chateau254_cart')) || []; }
  catch { return []; }
};

/* Print-friendly menu addresses.
   `/menu?mode=lunchbox` works in a browser but is a poor thing to encode in a QR
   code: the `?` and `&` are exactly the characters scanners mis-parse, and a
   scanner that trips over one tends to report a bogus host -- which is how a
   printed code ended up resolving to "apphttps" instead of the real site. A bare
   path has no punctuation to get wrong, so these are what should go on table
   tents and shared cards. Add further aliases here rather than adding routes. */
const PATH_MODES = {
  '/lunch-and-bar': 'lunchbox',
  '/takeout': 'takeout',
  '/dine-in': 'dining',
};

/* mode -> its shareable path, so switchMode() can jump straight there. */
const MODE_PATHS = Object.fromEntries(
  Object.entries(PATH_MODES).map(([path, mode]) => [mode, path]),
);

const normaliseMode = (value) => (value === 'dinein' ? 'dining' : value);

/* Withheld features fall back to the dining menu rather than 404-ing, so an
   old link, a printed QR code or a shared URL from before the flag flipped still
   lands somewhere sensible instead of a dead end. */
const isModeAvailable = (mode) => (mode === 'takeout' ? isTakeoutEnabled() : true);

/* Path wins over the query string so a scanned link always lands on the menu it
   advertises. Falls back to the `?mode=` form, which existing links still use. */
const modeFromLocation = (pathname, search) => {
  const byPath = PATH_MODES[String(pathname || '').replace(/\/+$/, '')];
  if (byPath) return isModeAvailable(byPath) ? byPath : 'dining';
  try {
    const param = new URLSearchParams(search || '').get('mode');
    if (param) {
      const mode = normaliseMode(param);
      return isModeAvailable(mode) ? mode : 'dining';
    }
  } catch { /* malformed query string: fall through to the default */ }
  return 'dining';
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

const ItemRoute = ({ user, addToCart, addDineInItem, isDineIn, onRequireAuth, onWineFactSelect, onWinePairingSelect, catalogs }) => {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const item = Object.values(catalogs || {}).flat().find((catalogItem) => catalogItem.id === itemId);
  /* Dine-in dishes are reserved for the table, never carted. The detail page is
     reachable straight from the Fine Dining menu, so without passing the mode
     down it would offer "Add to cart" and quietly undo that rule. */
  const handleReserve = (reserved) => {
    addDineInItem?.(reserved);
    addToast(`${reserved.name} reserved for your table`, 'success');
  };
  return <ViewItem item={item} user={user} addToCart={addToCart} onRequireAuth={onRequireAuth} addDineInItem={isDineIn ? handleReserve : null} onBack={() => navigate('/menu')} onCart={() => navigate('/cart')} onWineFactSelect={onWineFactSelect} onWinePairingSelect={onWinePairingSelect} />;
};

const App = () => {
  const [mode, setMode] = useState(() => (
    modeFromLocation(window.location.pathname, window.location.search)
  ));
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

  /* Wines are deliberately absent from every menu catalog. They have their own
     page at /wines, backed by the same `wines` table, and mixing them into the
     meal grids listed bottles next to food and double-listed them. The admin
     menu still loads them via /api/menu?all=true -- this only shapes what the
     public menu page renders. */
  const catalogs = useMemo(() => ({
    dining: [...dineInFoodItems],
    /* takeoutItems is still fetched because eventItems is derived from it. Only
       the public Take-Out tab is withheld. */
    takeout: isTakeoutEnabled() ? [...takeoutItems] : [],
    lunchbox: [...lunchAndBarItems],
    events: [...eventItems],
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
    const paymentMethod = form.get('payment') || 'cash_on_delivery';
    try {
      if (paymentMethod === 'pesapal') {
        const paymentResponse = await fetch(`${API_URL}/payments/pesapal/initialize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` },
          body: JSON.stringify({
            delivery_address: deliveryAddress,
            phone: form.get('phone') || '',
            latitude: coords?.latitude || null,
            longitude: coords?.longitude || null,
            items: cart.map((item) => ({ menu_item_id: item.id, quantity: item.quantity })),
          }),
        });
        const paymentPayload = await paymentResponse.json().catch(() => ({}));
        if (!paymentResponse.ok) throw new Error(paymentPayload.error || 'Unable to start Pesapal payment');
        if (!paymentPayload.payment?.redirectUrl) throw new Error('Pesapal did not provide a payment page');
        window.location.assign(paymentPayload.payment.redirectUrl);
        return;
      }

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
        total_amount: subtotal,
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

  const handlePaymentSuccess = (paymentOrder) => {
    const placedOrder = { id: paymentOrder.id, number: paymentOrder.id.slice(0, 8), total: Number(paymentOrder.total_amount) };
    setOrder(placedOrder);
    localStorage.setItem('chateau254_last_order', placedOrder.id);
    setLastOrderId(placedOrder.id);
    setCart([]);
    navigate('/confirmation');
  };

  useEffect(() => {
    // Ignore URL changes triggered by our own switchMode()
    if (isProgrammaticNav.current) {
      isProgrammaticNav.current = false;
      return;
    }
    const next = modeFromLocation(location.pathname, location.search);
    /* Only reset the filters when the menu actually changes, otherwise landing
       on the same mode from a different URL would clear an in-progress search. */
    if (next !== mode && isModeAvailable(next) && catalogs[next]) {
      setMode(next);
      setFilter('All');
      setQuery('');
      setWineFilter(null);
      setWineClassFilter(null);
    }
  }, [location.pathname, location.search, mode, catalogs]);

  const switchMode = (newMode) => {
    const normalized = isModeAvailable(normaliseMode(newMode)) ? normaliseMode(newMode) : 'dining';
    setMode(normalized);
    setFilter('All');
    setQuery('');
    setWineFilter(null);
    setWineClassFilter(null);
    isProgrammaticNav.current = true;
    /* Only the menu itself keeps the query form; the dedicated paths stay clean
       so a link copied out of the address bar is safe to share or encode. */
    navigate(MODE_PATHS[normalized] || `/menu?mode=${normalized}`);
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
      .then((res) => {
        if (res.status === 404) {
          localStorage.removeItem('chateau254_last_order');
          setLastOrderId(null);
          return null;
        }
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data?.order) setOrder({ id: data.order.id, number: data.order.id.slice(0, 8), total: Number(data.order.total_amount) });
      })
      .catch(() => { });
  }, [lastOrderId, order?.id, session?.token]);

  const showAppHeader = location.pathname !== '/' && location.pathname !== '/auth' && !location.pathname.startsWith('/admin') && !location.pathname.startsWith('/rider');
  const showAppFooter = location.pathname !== '/auth' && !location.pathname.startsWith('/admin') && !location.pathname.startsWith('/rider');

  /* Shared by /menu and the shareable paths below so the two cannot drift. The
     active mode comes from the URL, so /lunch-and-bar renders the Lunch & Bar
     catalogue with no extra plumbing. */
  const menuElement = (
    <Menu api={API_URL} items={visibleItems} offerItems={menuItems} user={session?.user} categories={activeCategories} filter={filter} setFilter={(cat) => { setFilter(cat); if (cat !== 'Wine') setWineClassFilter(null); }} query={query} setQuery={setQuery} addToCart={addToCart} cartCount={cartCount} onCart={() => navigate('/cart')} onViewItem={(item) => navigate(`/item/${item.id}`)} onBooking={() => navigate('/booking')} wineFilter={wineFilter} onClearWineFilter={() => { setWineFilter(null); setWinePairingFilter(null); }} wineClassFilter={wineClassFilter} setWineClassFilter={setWineClassFilter} mode={mode} onRequireAuth={() => navigate('/auth')} winePairingFilter={winePairingFilter} onClearWinePairingFilter={() => setWinePairingFilter(null)} onBack={handleBack} dineInSelections={dineInSelections} addDineInItem={addDineInItem} />
  );

  return <SocketProvider token={session?.token}>
    <div className={`app-shell${showAppHeader ? ' has-app-header' : ''}`}>
      {showAppHeader && <AppHeader cartCount={cartCount} userName={session?.user?.full_name} onCart={() => navigate('/cart')} onProfile={() => navigate('/profile')} api={API_URL} />}
      <Routes>
        <Route path="/" element={<GuestRoute user={session?.user}><Home api={API_URL} onDining={() => { switchMode('dining'); navigate('/menu'); }} onEvents={() => navigate('/events')} onWines={() => navigate('/wines')} onAuth={() => navigate('/auth')} /></GuestRoute>} />
        <Route path="/events" element={<EventsPage user={session?.user} onExploreCatering={() => { switchMode('events'); navigate('/menu'); }} />} />
        <Route path="/auth" element={<Auth onSuccess={handleAuthSuccess} onBack={() => navigate('/')} />} />
        <Route path="/admin/*" element={<ProtectedRoute user={session?.user} roles={['admin']}><AdminDashboard user={session?.user} token={session?.token} api={API_URL} onLogout={handleLogout} /></ProtectedRoute>} />
        <Route path="/rider" element={<ProtectedRoute user={session?.user} roles={['rider']}><RiderDashboard user={session?.user} token={session?.token} api={API_URL} onLogout={handleLogout} /></ProtectedRoute>} />
        <Route path="/booking" element={<ProtectedRoute user={session?.user}><Booking user={session?.user} token={session?.token} selectedItems={dineInSelections} onClearSelections={() => setDineInSelections([])} /></ProtectedRoute>} />
        <Route path="/menu" element={menuElement} />
        {/* Print/QR friendly addresses: a bare path with no query string, so
            scanners cannot mis-read "?" or "&" and invent the wrong host. */}
        <Route path="/lunch-and-bar" element={menuElement} />
        <Route path="/takeout" element={menuElement} />
        <Route path="/dine-in" element={menuElement} />
        <Route path="/full-menu" element={<FullMenu onMakeOrder={() => { switchMode('takeout'); navigate('/menu'); }} onReserveTable={() => navigate('/booking')} />} />
        <Route path="/item/:itemId" element={<ItemRoute user={session?.user} addToCart={addToCart} addDineInItem={addDineInItem} isDineIn={mode === 'dining'} onRequireAuth={() => navigate('/auth')} onWineFactSelect={(field, value) => {
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
        <Route path="/cart" element={<Cart cart={cart} user={session?.user} subtotal={subtotal} changeQuantity={changeQuantity} onCheckout={() => navigate('/checkout')} onMenu={() => navigate('/menu')} onBack={handleBack} />} />
        <Route path="/checkout" element={<Checkout subtotal={subtotal} placeOrder={placeOrder} api={API_URL} token={session?.token} />} />
        <Route path="/payment-result" element={<ProtectedRoute user={session?.user}><PaymentResult api={API_URL} token={session?.token} onSuccess={handlePaymentSuccess} onMenu={() => navigate('/menu')} /></ProtectedRoute>} />
        <Route path="/my-cellar" element={<Cellar user={session?.user} onMenu={() => navigate('/menu')} onBack={handleBack} />} />

        <Route path="/confirmation" element={<Confirmation order={order} onTrack={() => navigate('/track')} onMenu={() => navigate('/menu')} />} />
        <Route path="/track" element={<Tracking order={order} token={session?.token} api={API_URL} onMenu={() => navigate('/menu')} />} />
        <Route path="/tracking" element={<Navigate to="/track" replace />} />
        <Route path="/profile" element={<ProfileRoute user={session?.user}><Profile user={session?.user} token={session?.token} onBack={handleBack} onLogout={handleLogout} onTrack={(o) => { setOrder({ id: o.id, number: o.id.slice(0, 8), total: Number(o.total_amount) }); navigate('/track'); }} onBooking={() => navigate('/booking')} onCellar={() => navigate('/my-cellar')} /></ProfileRoute>} />
        <Route path="/wines" element={<WinesPage user={session?.user} addToCart={addToCart} addDineInItem={addDineInItem} onRequireAuth={() => navigate('/auth')} reservationCount={dineInSelections.length} onGoToReservations={() => navigate('/booking')} />} />
        <Route path="/feed" element={<Feed session={session} />} />
        <Route path="/404" element={<NotFound onHome={() => navigate('/menu')} onBack={handleBack} />} />
        <Route path="*" element={<NotFound onHome={() => navigate('/menu')} onBack={handleBack} />} />
      </Routes>
      {showAppFooter && <AppFooter />}
    </div>
  </SocketProvider>;
};

export default App;
