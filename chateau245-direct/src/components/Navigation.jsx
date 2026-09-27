import React from 'react';
import StaggeredMenu from './StaggeredMenu';
import Logo from "./images/chateauLogo2.png";

export const AppHeader = ({ cartCount, userName = '', onProfile, onCart, onHome, onBack }) => {
  return (
    <StaggeredMenu
      logoUrl={Logo}
      cartCount={cartCount}
      userName={userName}
      onProfile={onProfile}
      onCart={onCart}
      onHome={onHome}
      onBack={onBack}
      menuButtonColor="#2c5f2d"
      openMenuButtonColor="#2c5f2d"
      accentColor="#2c5f2d"
      colors={['#2c5f2d', '#1e4d1e', '#3d7a3d']}
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
    <img src={Logo} alt="chateau-logo" className="brand-logo" />
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