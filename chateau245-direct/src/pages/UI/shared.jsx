import { FiArrowLeft, FiShoppingBag } from 'react-icons/fi';

export const Brand = () => <div className="brand"><span className="brand-mark">♜</span><span>CHÂTEAU<span>254</span><small>RESTAURANT & WINE CELLAR</small></span></div>;

const AppHeader = ({ cartCount, onBack, onCart, onHome, userName = 'John' }) => <header className="app-header"><button className="back-button" aria-label="Go back" onClick={onBack}><FiArrowLeft /></button><button className="wordmark" onClick={onHome}><Brand /></button><div className="header-actions"><span className="welcome">Hi, {userName}</span><button className="bag-button" aria-label="Open cart" onClick={onCart}><FiShoppingBag />{cartCount > 0 && <b>{cartCount}</b>}</button></div></header>;

export const Summary = ({ subtotal, delivery }) => <div className="summary"><div><span>Subtotal</span><b>KES {subtotal.toLocaleString()}</b></div><div><span>Delivery fee</span><b>KES {delivery.toLocaleString()}</b></div><div className="total"><span>Total</span><b>KES {(subtotal + delivery).toLocaleString()}</b></div></div>;

export default AppHeader;
