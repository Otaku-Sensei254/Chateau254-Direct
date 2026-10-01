import React from 'react';
import StaggeredMenu from './StaggeredMenu';

export const AppHeader = ({ cartCount, userName = '', onProfile, onCart }) => {
  return (
    <StaggeredMenu
      cartCount={cartCount}
      userName={userName}
      onProfile={onProfile}
      onCart={onCart}
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


export const Summary = ({ subtotal, delivery }) => (
  <div className="summary">
    <div><span>Subtotal</span><b>KES {subtotal.toLocaleString()}</b></div>
    <div><span>Delivery fee</span><b>KES {delivery.toLocaleString()}</b></div>
    <div className="total"><span>Total</span><b>KES {(subtotal + delivery).toLocaleString()}</b></div>
  </div>
);

export default AppHeader;