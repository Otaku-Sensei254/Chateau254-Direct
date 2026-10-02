import React, { useEffect } from 'react';
import { CalendarDays, Lock, X } from 'lucide-react';
import './AccountRequiredModal.css';

/* Shown when a guest tries to reserve a dish or a table.
   Reservations are tied to an account so the venue knows who is arriving and
   what they ordered, so the guest is asked to sign in rather than silently
   losing the selection. Renders nothing when closed. */

const AccountRequiredModal = ({ open, onClose, onSignIn, action = 'reserve', children }) => {
  /* Escape closes, matching the rest of the modal surfaces in the app. */
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const isTable = action === 'table';

  return (
    <div className="acct-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="acct-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="acct-modal-title"
        onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      >
        <button type="button" className="acct-modal-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <div className="acct-modal-icon" aria-hidden="true">
          {isTable ? <CalendarDays size={26} /> : <Lock size={24} />}
        </div>

        <h3 id="acct-modal-title" className="acct-modal-title">
          Sign in to {isTable ? 'reserve a table' : 'reserve'}
        </h3>
        <p className="acct-modal-body">
          {isTable
            ? 'Table reservations are tied to your account so the team knows who is arriving and can prepare the room.'
            : 'Reserving a dish for your table needs an account, so we can attach it to your reservation and have it ready when you arrive.'}
        </p>
        {children}

        <div className="acct-modal-actions">
          <button type="button" className="acct-modal-primary" onClick={onSignIn}>
            Go to sign in
          </button>
          <button type="button" className="acct-modal-ghost" onClick={onClose}>
            Keep browsing
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountRequiredModal;