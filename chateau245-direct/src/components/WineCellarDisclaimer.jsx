import React from 'react';
import { FiAlertCircle, FiPhone } from 'react-icons/fi';

/* Reusable disclaimer for wine cellar updates.
   Toggle `show` via prop or context to display/hide without code changes. */
const WineCellarDisclaimer = ({ show = true, onDismiss }) => {
  if (!show) return null;

  return (
    <div className="wine-cellar-disclaimer" role="alert">
      <div className="wine-cellar-disclaimer-icon">
        <FiAlertCircle />
      </div>
      <div className="wine-cellar-disclaimer-content">
        <h4>Wine Cellar Update</h4>
        <p>
          We are currently updating the contents of our wine cellar. 
          Please contact the restaurant directly if you need to make an order.
        </p>
        <a 
          href="https://wa.me/254114100680" 
          target="_blank" 
          rel="noopener noreferrer"
          className="wine-cellar-disclaimer-whatsapp"
        >
          <FiPhone /> +254 114 100680 (WhatsApp)
        </a>
      </div>
      {onDismiss && (
        <button 
          className="wine-cellar-disclaimer-dismiss" 
          onClick={onDismiss}
          aria-label="Dismiss notice"
        >
          ×
        </button>
      )}
    </div>
  );
};

export default WineCellarDisclaimer;