import React, { useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Lock, Smartphone, X, XCircle } from 'lucide-react';
import './PaymentStatusModal.css';

/* Payment outcome dialog for the checkout flow. Replaces browser alerts so
   M-Pesa results surface inside the app: "waiting" while the prompt sits on
   the customer's phone, then "success" / "failed" once Daraja answers. */

const STATUS_ICONS = {
  waiting: Smartphone,
  success: CheckCircle2,
  failed: XCircle,
  error: Lock,
};

const PaymentStatusModal = ({ open, status = 'failed', title, message, actionLabel, onAction, onClose }) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const Icon = STATUS_ICONS[status] || AlertTriangle;
  const isWaiting = status === 'waiting';

  return (
    <div className="pay-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="pay-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pay-modal-title"
        onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      >
        <button type="button" className="pay-modal-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <div className={`pay-modal-icon pay-modal-icon--${status}`} aria-hidden="true">
          <Icon size={26} className={isWaiting ? 'pay-modal-icon-pulse' : undefined} />
        </div>

        <h3 id="pay-modal-title" className="pay-modal-title">{title}</h3>
        <p className="pay-modal-body">{message}</p>

        <div className="pay-modal-actions">
          <button type="button" className="pay-modal-primary" onClick={() => {
            if (onAction) onAction();
            onClose();
          }}>
            {actionLabel || 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentStatusModal;
