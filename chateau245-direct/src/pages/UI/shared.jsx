import React from 'react';
// import Logo from "../../components/images/chateauLogo2.png"
// import { Link } from 'react-router-dom';
/* The header that used to live here carried an InstallButton, but it was never
   mounted: App.js imports AppHeader from components/Navigation, which renders
   StaggeredMenu instead. The install button now lives in StaggeredMenu's header
   actions, so this duplicate header has been removed rather than left to drift.
   Summary below is still used by cart.jsx and checkout.jsx. */

export const Summary = ({ subtotal }) => {
  return (
    <div className="summary">
      <div>
        <span>Subtotal</span>
        <b>KES {subtotal.toLocaleString()}</b>
      </div>
      <div className="total">
        <span>Total</span>
        <b>KES {subtotal.toLocaleString()}</b>
      </div>
    </div>
  );
};
