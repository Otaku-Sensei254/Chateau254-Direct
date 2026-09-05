import { useEffect, useState } from 'react';
import { FiArrowLeft, FiAward, FiLogOut, FiPackage, FiStar, FiUser } from 'react-icons/fi';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const statusColor = {
  pending: '#b56e37',
  preparing: '#6e83ca',
  out_for_delivery: '#5ca968',
  completed: '#3c7045',
  cancelled: '#cf5e58',
};

const statusLabel = {
  pending: 'Pending',
  preparing: 'Preparing',
  out_for_delivery: 'On the way',
  completed: 'Delivered',
  cancelled: 'Cancelled',
};

const Profile = ({ user, token, onBack, onLogout, onTrack }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/orders`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => setOrders(data.orders || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const fetchOrderDetail = async (orderId) => {
    if (expandedOrder === orderId) { setExpandedOrder(null); setOrderDetails(null); return; }
    setExpandedOrder(orderId);
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setOrderDetails(data.order);
    } catch { setOrderDetails(null); }
  };

  const totalSpent = orders.filter((o) => o.status === 'completed').reduce((sum, o) => sum + Number(o.total_amount), 0);
  const totalOrders = orders.length;

  return <main className="content-page profile-page">
    <div className="profile-top">
      <button className="back-button" aria-label="Go back" onClick={onBack}><FiArrowLeft /></button>
      <h1>My Profile</h1>
    </div>

    <div className="profile-card">
      <div className="profile-avatar"><FiUser /></div>
      <div className="profile-info">
        <h2>{user?.full_name || 'Guest'}</h2>
        <p>{user?.email || ''}</p>
      </div>
      <button className="profile-logout" onClick={onLogout}><FiLogOut /> Sign out</button>
    </div>

    <div className="profile-stats">
      <div className="profile-stat">
        <FiAward />
        <div><span>Loyalty points</span><strong>{user?.loyalty_points || 0}</strong></div>
      </div>
      <div className="profile-stat">
        <FiPackage />
        <div><span>Total orders</span><strong>{totalOrders}</strong></div>
      </div>
      <div className="profile-stat">
        <FiStar />
        <div><span>Total spent</span><strong>KES {totalSpent.toLocaleString()}</strong></div>
      </div>
    </div>

    <div className="profile-section">
      <h3>Order history</h3>
      {loading && <div className="profile-loading">Loading orders...</div>}
      {!loading && orders.length === 0 && <div className="profile-empty"><FiPackage /><p>No orders yet. Start by browsing the menu!</p></div>}
      {orders.map((order) => <div className={`profile-order ${expandedOrder === order.id ? 'expanded' : ''}`} key={order.id}>
        <button className="profile-order-header" onClick={() => fetchOrderDetail(order.id)}>
          <div><span className="profile-order-id">#{order.id.slice(0, 8)}</span><span className="profile-order-date">{new Date(order.created_at).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></div>
          <div><span className="profile-order-status" style={{ color: statusColor[order.status] }}>{statusLabel[order.status]}</span><strong>KES {Number(order.total_amount).toLocaleString()}</strong></div>
        </button>
        {expandedOrder === order.id && orderDetails && orderDetails.id === order.id && <div className="profile-order-detail">
          <p className="profile-order-address">{order.delivery_address}</p>
          {orderDetails.items?.length > 0 && <div className="profile-order-items">
            {orderDetails.items.map((item) => <div className="profile-order-item" key={item.id}>
              <span>{item.quantity}x {item.item_name}</span>
              <span>KES {Number(item.unit_price).toLocaleString()}</span>
            </div>)}
          </div>}
          {order.status !== 'completed' && order.status !== 'cancelled' && <button className="profile-track-btn" onClick={() => onTrack(order)}>Track order</button>}
        </div>}
      </div>)}
    </div>
  </main>;
};

export default Profile;
