import React from 'react';
import StaggeredMenu from './StaggeredMenu';
// import Logo from "./images/chateauLogo2.png";

export const AppHeader = ({ cartCount, userName = '', onProfile, onCart, onHome, onBack }) => {
  return (
    <StaggeredMenu
      cartCount={cartCount}
      userName={userName}
      onProfile={onProfile}
      onCart={onCart}
      onHome={onHome}
      onBack={onBack}
      menuButtonColor="var(--accent-nav)"
      openMenuButtonColor="var(--accent-nav-deep)"
      accentColor="var(--accent-nav)"
      colors={['var(--accent-nav)', 'var(--accent-nav-deep)', 'var(--gold-deep)']}
      position="right"
      displayItemNumbering={true}
      displaySocials={true}
      isFixed={true}
      closeOnClickAway={true}
    />
  );
};

export const Brand = () => (
  <div className="brand">
    <span style={{color: "black"}}>Chateau</span><span style={{color: "gold"}}>254</span>
  </div>
);

export const Summary = ({ subtotal, delivery }) => (
  <div className="summary">
    <div><span>Subtotal</span><b>KES {subtotal.toLocaleString()}</b></div>
    <div><span>Delivery fee</span><b>KES {delivery.toLocaleString()}</b></div>
    <div className="total"><span>Total</span><b>KES {(subtotal + delivery).toLocaleString()}</b></div>
  </div>
);

export default AppHeader;