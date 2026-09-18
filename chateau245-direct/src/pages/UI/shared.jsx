import React from 'react';
import {FiShoppingBag } from 'react-icons/fi';
import Logo from "../../components/images/chateauLogo2.png"
import { Link } from 'react-router-dom';
export const Brand = () => {
  return (
    <div className="brand">
      <Link to="/">
      <img src= {Logo} alt="chateau-logo" className="brand-logo"/>
      
      </Link>
    </div>
  );
};

export const Summary = ({ subtotal, delivery }) => {
  return (
    <div className="summary">
      <div>
        <span>Subtotal</span>
        <b>KES {subtotal.toLocaleString()}</b>
      </div>
      <div>
        <span>Delivery fee</span>
        <b>KES {delivery.toLocaleString()}</b>
      </div>
      <div className="total">
        <span>Total</span>
        <b>KES {(subtotal + delivery).toLocaleString()}</b>
      </div>
    </div>
  );
};

const AppHeader = ({ cartCount, onBack, onCart, onHome, onProfile, userName = '' }) => {
  return (
    <header className="app-header">
   
      
      <button className="wordmark" onClick={onHome}>
        <Brand />
      </button>
      
      <div className="header-actions">
        <button className="welcome-link" onClick={onProfile}>
          Hi, {userName || 'Guest'}
        </button>
        
        <button className="bag-button" aria-label="Open cart" onClick={onCart}>
          <FiShoppingBag />
          {cartCount > 0 && <b>{cartCount}</b>}
        </button>
      </div>
    </header>
  );
};

export default AppHeader;
