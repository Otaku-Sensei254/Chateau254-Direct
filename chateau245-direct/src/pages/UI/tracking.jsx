import { FiCheck, FiTruck } from 'react-icons/fi';

const Tracking = ({ order, onMenu }) => { return <main className="content-page tracking-page"><div className="page-title"><p className="eyebrow">Order #{order?.number}</p><h1>On its way<br /><em>to you.</em></h1><span>Estimated arrival · 45-60 min</span></div><div className="tracking-card"><div className="scooter">⌁</div><strong>Peter is heading your way</strong><p>Your order is out for delivery.</p><div className="timeline"><div className="done"><i><FiCheck /></i><span>Order received<small>6:45 PM</small></span></div><div className="done"><i><FiCheck /></i><span>Preparing<small>6:50 PM</small></span></div><div className="current"><i><FiTruck /></i><span>Out for delivery<small>7:25 PM</small></span></div><div><i /><span>Delivered</span></div></div></div><button className="primary-button full" onClick={onMenu}>Back to menu</button></main>; };

export default Tracking;
