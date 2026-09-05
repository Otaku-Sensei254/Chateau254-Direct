import './App.css';
import { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import menuItems from './components/data/menu.json';
import wines from './components/data/luxury_wine_list.json';
import Home from './pages/UI/home';
import Menu from './pages/UI/menu';
import Cart from './pages/UI/cart';
import Checkout from './pages/UI/checkout';
import Confirmation from './pages/UI/confirmation';
import Tracking from './pages/UI/tracking';
import Profile from './pages/UI/profile';
import ViewItem from './pages/UI/view_item';
import AppHeader from './pages/UI/shared';
import Auth from './pages/auth/auth';
import AdminDashboard from './pages/UI/admin/admin_dash';
import RiderDashboard from './pages/rider/rider_dash';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const categories = ['All', 'Meals', 'Wine', 'Drinks', 'Desserts'];
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
}));
const catalog = [...menuItems, ...normalizedWines];

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

const ItemRoute = ({ addToCart }) => {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const item = catalog.find((catalogItem) => catalogItem.id === itemId);
  return <ViewItem item={item} addToCart={addToCart} onBack={() => navigate('/menu')} onCart={() => navigate('/cart')} />;
};

const App = () => {
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState(loadCart);
  const [order, setOrder] = useState(null);
  const [lastOrderId, setLastOrderId] = useState(loadLastOrder);
  const [session, setSession] = useState(storedSession);
  const location = useLocation();
  const navigate = useNavigate();
  const visibleItems = useMemo(() => catalog.filter((item) => (filter === 'All' || item.category === filter) && item.name.toLowerCase().includes(query.toLowerCase())), [filter, query]);
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

  const placeOrder = async (event) => {
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

  const handleBack = () => navigate(location.pathname === '/menu' ? '/' : '/menu');

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
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Session expired')))
      .then((result) => setSession((current) => ({ ...current, user: result.user })))
      .catch(() => {
        localStorage.removeItem('chateau254_session');
        setSession(null);
        navigate('/');
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

  return <div className="app-shell">
    {location.pathname !== '/' && location.pathname !== '/auth' && !location.pathname.startsWith('/admin') && !location.pathname.startsWith('/rider') && <AppHeader cartCount={cartCount} userName={session?.user?.full_name} onBack={handleBack} onCart={() => navigate('/cart')} onHome={() => navigate('/menu')} onProfile={() => navigate('/profile')} />}
    <Routes>
      <Route path="/" element={<Home onOrder={() => navigate('/menu')} onAuth={() => navigate('/auth')} />} />
      <Route path="/auth" element={<Auth onSuccess={handleAuthSuccess} onBack={() => navigate('/')} />} />
      <Route path="/admin/*" element={<ProtectedRoute user={session?.user} roles={['admin']}><AdminDashboard user={session?.user} token={session?.token} api={API_URL} onLogout={handleLogout} /></ProtectedRoute>} />
      <Route path="/rider" element={<ProtectedRoute user={session?.user} roles={['rider']}><RiderDashboard user={session?.user} token={session?.token} api={API_URL} onLogout={handleLogout} /></ProtectedRoute>} />
      <Route path="/menu" element={<Menu items={visibleItems} user={session?.user} categories={categories} filter={filter} setFilter={setFilter} query={query} setQuery={setQuery} addToCart={addToCart} cartCount={cartCount} onCart={() => navigate('/cart')} onViewItem={(item) => navigate(`/item/${item.id}`)} />} />
      <Route path="/item/:itemId" element={<ItemRoute addToCart={addToCart} />} />
      <Route path="/cart" element={<Cart cart={cart} subtotal={subtotal} delivery={delivery} changeQuantity={changeQuantity} onCheckout={() => navigate('/checkout')} onMenu={() => navigate('/menu')} />} />
      <Route path="/checkout" element={<Checkout subtotal={subtotal} delivery={delivery} placeOrder={placeOrder} />} />
      <Route path="/confirmation" element={<Confirmation order={order} onTrack={() => navigate('/track')} onMenu={() => navigate('/menu')} />} />
      <Route path="/track" element={<Tracking order={order} onMenu={() => navigate('/menu')} />} />
      <Route path="/tracking" element={<Navigate to="/track" replace />} />
      <Route path="/profile" element={<ProtectedRoute user={session?.user} roles={['customer', 'admin']}><Profile user={session?.user} token={session?.token} onBack={handleBack} onLogout={handleLogout} onTrack={(o) => { setOrder({ id: o.id, number: o.id.slice(0, 8), total: Number(o.total_amount) }); navigate('/track'); }} /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </div>;
};

export default App;
