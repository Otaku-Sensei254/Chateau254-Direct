import { useEffect, useRef, useState } from 'react';
import { FiArrowRight, FiCheck, FiClock, FiRefreshCw, FiX } from 'react-icons/fi';

const PaymentResult = ({ api, token, onSuccess, onMenu }) => {
  const [state, setState] = useState({ status: 'checking', message: 'Confirming your payment with Pesapal...' });
  const completedRef = useRef(false);
  const params = new URLSearchParams(window.location.search);
  const trackingId = params.get('OrderTrackingId');

  useEffect(() => {
    let cancelled = false;
    let timer;

    const checkPayment = async () => {
      if (!trackingId) {
        setState({ status: 'failed', message: 'We could not find the Pesapal transaction.' });
        return;
      }
      try {
        const response = await fetch(`${api}/payments/pesapal/status/${encodeURIComponent(trackingId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Unable to confirm this payment');
        if (cancelled || completedRef.current) return;

        const paymentStatus = data.payment?.status;
        if (paymentStatus === 'completed') {
          completedRef.current = true;
          setState({ status: 'completed', message: 'Payment confirmed. Preparing your order...' });
          onSuccess(data.order);
          return;
        }
        if (paymentStatus === 'failed' || paymentStatus === 'reversed') {
          setState({ status: 'failed', message: 'Pesapal did not complete this payment. Your order was not confirmed.' });
          return;
        }
        setState({ status: 'pending', message: 'Payment is still being confirmed. This page will check again shortly.' });
        timer = window.setTimeout(checkPayment, 5000);
      } catch (error) {
        if (!cancelled) setState({ status: 'failed', message: error.message || 'Unable to confirm this payment' });
      }
    };

    checkPayment();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [api, onSuccess, token, trackingId]);

  const isPending = state.status === 'checking' || state.status === 'pending';
  return (
    <main className="content-page payment-result-page">
      <div className={`payment-result-icon ${state.status}`}>
        {state.status === 'completed' ? <FiCheck /> : state.status === 'failed' ? <FiX /> : <FiClock />}
      </div>
      <p className="eyebrow">Pesapal payment</p>
      <h1>{state.status === 'completed' ? 'Payment confirmed' : state.status === 'failed' ? 'Payment not completed' : 'Confirming payment'}</h1>
      <p className="payment-result-message">{state.message}</p>
      {trackingId && <small className="payment-result-reference">Transaction: {trackingId.slice(0, 8)}…</small>}
      {isPending && <div className="payment-result-loader"><FiRefreshCw /> Checking securely</div>}
      {state.status === 'failed' && <button className="primary-button" onClick={onMenu}>Return to menu <FiArrowRight /></button>}
    </main>
  );
};

export default PaymentResult;
