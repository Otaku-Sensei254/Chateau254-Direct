import { FiArrowRight, FiCheck, FiTruck } from 'react-icons/fi';

const Confirmation = ({ order, onTrack, onMenu }) => { return <main className="content-page confirmation-page"><div className="success-icon"><FiCheck /></div><p className="eyebrow">Order received</p><h1>Thank you, {order?.customer?.name || 'Customer'}!</h1><p>Your order has been received and is being prepared with care.</p><div className="order-ticket"><span>Order #{order?.number}</span><strong>KES {order?.total?.toLocaleString()}</strong><small>Estimated delivery · 45-60 min</small></div><button className="primary-button full" onClick={onTrack}>Track order <FiTruck /></button><button className="text-button" onClick={onMenu}>Continue browsing <FiArrowRight /></button></main>; };

export default Confirmation;
