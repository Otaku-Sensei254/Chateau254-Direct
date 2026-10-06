import { useState, useRef, useEffect } from 'react';
import { FiArrowRight, FiCheck, FiChevronDown, FiClock, FiCopy, FiCreditCard, FiLock, FiMapPin, FiSmartphone, FiTruck } from 'react-icons/fi';
import { Summary } from './shared';
import LocationPicker from '../../components/LocationPicker';
import PaymentStatusModal from '../../components/ui/PaymentStatusModal';

const Checkout = ({ subtotal, placeOrder, api, token, user, onRequireAuth }) => {
  // Card payments are temporarily disabled until the card gateway is enabled.
  const CARD_PAYMENT_ENABLED = false;
  const [coords, setCoords] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [reverseStatus, setReverseStatus] = useState(null);
  const [copied, setCopied] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('mpesa');
  const [mpesaPaymentType, setMpesaPaymentType] = useState('stkpush'); // 'stkpush' or 'paybill'
  const [isProcessingMpesa, setIsProcessingMpesa] = useState(false);
  const [payModal, setPayModal] = useState(null);
  const pollRef = useRef(null);
  const pollTokenRef = useRef(0);
  const addressRef = useRef(null);
  const nameRef = useRef(null);
  const phoneRef = useRef(null);

  const stopPolling = () => {
    pollTokenRef.current += 1;
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const closePayModal = () => {
    stopPolling();
    setPayModal(null);
  };

  useEffect(() => stopPolling, []);

  /* Daraja's result descriptions are developer-speak ("Request Cancelled by
     user") — customers only ever see these friendly versions. */
  const friendlyPaymentResult = (desc = '') => {
    if (/cancel/i.test(desc)) return 'The payment was cancelled on your phone. Nothing has been charged — tap below and try again when you are ready.';
    if (/insufficient/i.test(desc)) return 'Your M-Pesa balance is not enough for this payment. Top up and try again.';
    if (/cannot be reached|timeout|expired|not been found/i.test(desc)) return 'We could not reach your phone in time, so nothing has been charged. Please try again.';
    return 'Your payment did not go through and nothing has been charged. Please try again.';
  };

  // defaultValue only applies on mount — if /auth/me refreshes the session
  // after mount (deep-link with a stale localStorage session), fill the empty
  // fields then. Never overwrite something the user already typed.
  useEffect(() => {
    if (user?.full_name && nameRef.current && !nameRef.current.value) {
      nameRef.current.value = user.full_name;
    }
    if (user?.phone) {
      if (phoneRef.current && !phoneRef.current.value) phoneRef.current.value = user.phone;
      const stkInput = document.getElementById('mpesa-phone-input');
      if (stkInput && !stkInput.value) stkInput.value = user.phone;
    }
  }, [user?.full_name, user?.phone]);

  const handleLocationSelect = async (newCoords) => {
    setCoords(newCoords);
    setReverseStatus('loading');
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${newCoords.latitude}&lon=${newCoords.longitude}&zoom=18&addressdetails=1`,
        { headers: { 'User-Agent': 'Chateau254-App/1.0' } }
      );
      const data = await res.json();
      if (data.display_name && addressRef.current) {
        addressRef.current.value = data.display_name;
      }
      setReverseStatus('done');
    } catch {
      setReverseStatus('error');
    }
  };

  const copyText = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1800);
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    // If M-Pesa STK Push is selected, handle it separately
    if (paymentMethod === 'mpesa' && mpesaPaymentType === 'stkpush') {
      await handleMpesaStkPush();
      return;
    }
    
    // For other payment methods, use the original placeOrder
    placeOrder(event, coords);
  };

  const startStatusPolling = (checkoutRequestId) => {
    stopPolling();
    const myToken = pollTokenRef.current;
    let attempts = 0;

    pollRef.current = setInterval(async () => {
      if (pollTokenRef.current !== myToken) {
        clearInterval(pollRef.current);
        pollRef.current = null;
        return;
      }

      attempts += 1;
      if (attempts > 12) {
        stopPolling();
        setPayModal({
          status: 'failed',
          title: 'Payment not confirmed',
          message: 'We could not confirm your payment. If money was taken from your account, do not worry — it will be refunded within 24 hours, or we will confirm your order by phone.',
        });
        return;
      }

      try {
        const res = await fetch(`${api}/payments/mpesa/status/${checkoutRequestId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (pollTokenRef.current !== myToken) return;
        if (res.status === 401) {
          stopPolling();
          setPayModal({
            status: 'error',
            title: 'Session expired',
            message: 'Please sign in again to check your payment status.',
            actionLabel: 'Go to sign in',
            onAction: onRequireAuth,
          });
          return;
        }
        if (!res.ok) return; // transient — keep polling
        const data = await res.json().catch(() => null);
        if (!data || pollTokenRef.current !== myToken) return;
        const status = data.stkStatus?.status;
        if (status === 'success' || data.order?.payment_status === 'completed') {
          stopPolling();
          setPayModal({
            status: 'success',
            title: 'Payment received',
            message: `Thank you! We received your payment of KES ${subtotal}. Your order is being prepared and will arrive fresh, fast, and right to your door.`,
          });
          return;
        }
        if (status === 'failed') {
          stopPolling();
          setPayModal({
            status: 'failed',
            title: 'Payment not completed',
            message: friendlyPaymentResult(data.stkStatus?.resultDesc || ''),
          });
          return;
        }
      } catch {
        // network hiccup — try again on the next tick
      }
    }, 5000); // 5s cadence stays well under Daraja's 30-queries/min spike limit
  };

  const handleMpesaStkPush = async () => {
    if (!token) {
      setPayModal({
        status: 'error',
        title: 'Sign in required',
        message: 'M-Pesa payments are tied to your account, so we know who to prepare the order for. Please sign in first.',
        actionLabel: 'Go to sign in',
        onAction: onRequireAuth,
      });
      return;
    }

    const phoneInput = document.getElementById('mpesa-phone-input');
    const phone = phoneInput?.value?.trim();

    if (!phone) {
      setPayModal({
        status: 'failed',
        title: 'Phone number required',
        message: 'Enter the phone number that should receive the M-Pesa prompt, then try again.',
      });
      return;
    }

    setIsProcessingMpesa(true);

    try {
      const response = await fetch(`${api}/payments/mpesa/stkpush`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          amount: subtotal,
          phone: phone,
          account_reference: 'CH254',
          description: `Chateau254 order - ${subtotal} KES`
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (response.status === 401) {
        setPayModal({
          status: 'error',
          title: 'Session expired',
          message: 'Please sign in again to complete your payment.',
          actionLabel: 'Go to sign in',
          onAction: onRequireAuth,
        });
        return;
      }

      if (!response.ok) {
        console.error('STK push failed:', response.status, result);
        setPayModal({
          status: 'failed',
          title: 'Payment could not start',
          message: 'We could not reach M-Pesa just now. Please wait a moment and try again.',
        });
        return;
      }

      const checkoutRequestId = result.stkPush?.checkoutRequestId;
      if (!checkoutRequestId) {
        console.error('STK push missing checkout id:', result);
        setPayModal({
          status: 'failed',
          title: 'Payment could not start',
          message: 'We did not get a confirmation from M-Pesa. Please try again.',
        });
        return;
      }

      setPayModal({
        status: 'waiting',
        title: 'Check your phone',
        message: `We sent a payment request to ${phone} for KES ${subtotal}. Enter your M-Pesa PIN to approve it — this screen will update on its own.`,
      });
      startStatusPolling(checkoutRequestId);

    } catch (error) {
      console.error('M-Pesa STK Push error:', error);
      setPayModal({
        status: 'failed',
        title: 'Payment could not start',
        message: 'Something went wrong starting your payment. Please try again — if it keeps happening, call us and we will help.',
      });
    } finally {
      setIsProcessingMpesa(false);
    }
  };

  return (
    <main className="content-page checkout-page">
      <header className="checkout-heading">
        <p className="eyebrow">One last detail</p>
        <h1>Delivery details</h1>
        <span>We'll bring your order fresh, fast, and right to your door.</span>
      </header>
      <form className="checkout-form" onSubmit={handleSubmit}>
        <div className="checkout-form-main">
          <section className="checkout-section">
            <div className="checkout-section-heading">
              <span className="checkout-step">01</span>
              <div><h2>Your details</h2><p>Tell us where to bring your order.</p></div>
            </div>
            <div className="checkout-fields">
              <label className="checkout-field"><span>Full name</span><input ref={nameRef} name="name" placeholder="Your name" defaultValue={user?.full_name || ''} required /></label>
              <label className="checkout-field"><span>Phone number</span><input ref={phoneRef} name="phone" type="tel" placeholder="+254 712 345 678" defaultValue={user?.phone || ''} required /></label>
              <label className="checkout-field checkout-field-wide"><span>Delivery address</span><textarea ref={addressRef} name="address" placeholder="Search on map below or type your address" required /></label>
            </div>
          </section>

          <section className="checkout-section">
            <div className="checkout-section-heading">
              <span className="checkout-step">02</span>
              <div><h2>Pin your location</h2><p>Optional, but it helps our rider find you faster.</p></div>
            </div>
            <button className={`map-toggle${coords ? ' is-set' : ''}`} type="button" onClick={() => setShowMap(!showMap)}>
              <span className="map-toggle-icon"><FiMapPin /></span>
              <span className="map-toggle-copy"><strong>{showMap ? 'Close location picker' : coords ? 'Location set — adjust on map' : 'Set location on map'}</strong><small>{coords ? 'Your delivery pin is ready' : 'Search, drag the pin, or tap the map'}</small></span>
              <FiChevronDown className={showMap ? 'is-open' : ''} />
            </button>

            {showMap && (
              <div className="checkout-map-panel">
                <LocationPicker onLocationSelect={handleLocationSelect} />
                {reverseStatus === 'loading' && <p className="map-status">Looking up address...</p>}
                {reverseStatus === 'done' && <p className="map-status is-success"><FiCheck /> Address updated from your pin.</p>}
                {reverseStatus === 'error' && <p className="map-status is-error">We couldn't look up the address. You can still type it above.</p>}
              </div>
            )}
          </section>

          <section className="checkout-section">
            <div className="checkout-section-heading">
              <span className="checkout-step">03</span>
              <div><h2>How should we get it to you?</h2><p>Choose the option that suits your plans.</p></div>
            </div>
            <div className="checkout-option-grid">
              <label className="checkout-option">
                <input type="radio" name="delivery_option" defaultChecked />
                <span className="checkout-option-icon"><FiTruck /></span>
                <span className="checkout-option-copy"><strong>Delivery</strong><small>45–60 min · No delivery fee</small></span>
                <span className="checkout-option-check"><FiCheck /></span>
              </label>
              <label className="checkout-option">
                <input type="radio" name="delivery_option" />
                <span className="checkout-option-icon"><FiMapPin /></span>
                <span className="checkout-option-copy"><strong>Pick up</strong><small>Collect from Château · Free</small></span>
                <span className="checkout-option-check"><FiCheck /></span>
              </label>
            </div>
          </section>

          <section className="checkout-section">
            <div className="checkout-section-heading">
              <span className="checkout-step">04</span>
              <div><h2>Payment method</h2><p>Choose how you would like to settle your order.</p></div>
            </div>

            <div className="payment-options">
              {/* M-Pesa option */}
              <label className={`payment-option payment-option--mpesa${paymentMethod === 'mpesa' ? ' is-selected' : ''}`}>
                <input
                  type="radio"
                  name="payment"
                  value="mpesa"
                  checked={paymentMethod === 'mpesa'}
                  onChange={() => setPaymentMethod('mpesa')}
                />
                <span className="payment-option-logo">
                  <svg viewBox="0 0 48 48" width="32" height="32" aria-label="M-Pesa" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="24" cy="24" r="24" fill="#00a550"/>
                    <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle"
                      fill="#ffffff" fontSize="10" fontWeight="800" fontFamily="Arial,sans-serif"
                      letterSpacing="0.5">M-PESA</text>
                  </svg>
                </span>
                <span>
                  <strong>M-Pesa</strong>
                  <small>Pay with M-Pesa mobile money.</small>
                </span>
                <span className="checkout-option-check"><FiCheck /></span>
              </label>

              {CARD_PAYMENT_ENABLED && (
                <>
              {/* Card option (commented out until gateway support is enabled) */}
              <label className={`payment-option payment-option--card${paymentMethod === 'card' ? ' is-selected' : ''}`}>
                <input
                  type="radio"
                  name="payment"
                  value="card"
                  checked={paymentMethod === 'card'}
                  onChange={() => setPaymentMethod('card')}
                />
                <span className="payment-option-logo payment-option-logo--card">
                  {/* Visa logo */}
                  <svg viewBox="0 0 48 32" width="38" height="26" aria-label="Visa" xmlns="http://www.w3.org/2000/svg">
                    <rect width="48" height="32" rx="4" fill="#1a1f71"/>
                    <text x="50%" y="57%" dominantBaseline="middle" textAnchor="middle"
                      fill="#ffffff" fontSize="14" fontWeight="900" fontFamily="Arial,sans-serif"
                      fontStyle="italic" letterSpacing="1">VISA</text>
                  </svg>
                  {/* Mastercard logo */}
                  <svg viewBox="0 0 48 32" width="38" height="26" aria-label="Mastercard" xmlns="http://www.w3.org/2000/svg">
                    <rect width="48" height="32" rx="4" fill="#252525"/>
                    <circle cx="18" cy="16" r="10" fill="#eb001b"/>
                    <circle cx="30" cy="16" r="10" fill="#f79e1b"/>
                    <path d="M24 8.3a10 10 0 0 1 0 15.4A10 10 0 0 1 24 8.3z" fill="#ff5f00"/>
                  </svg>
                </span>
                <span>
                  <strong>Debit / Credit Card</strong>
                  <small>Visa or Mastercard accepted.</small>
                </span>
                <span className="checkout-option-check"><FiCheck /></span>
              </label>
                </>
              )}
            </div>

            {/* M-Pesa Payment Type Selection */}
            {paymentMethod === 'mpesa' && (
              <div className="mpesa-payment-type">
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>Choose M-Pesa Payment Method:</h4>
                
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                  <label style={{ 
                    flex: 1, 
                    padding: '12px', 
                    border: mpesaPaymentType === 'stkpush' ? '2px solid #00a550' : '1px solid #ddd',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: '#000',
                    color: '#fff'
                  }}>
                    <input
                      type="radio"
                      name="mpesa_type"
                      value="stkpush"
                      checked={mpesaPaymentType === 'stkpush'}
                      onChange={() => setMpesaPaymentType('stkpush')}
                      style={{ marginRight: '8px' }}
                    />
                    <div>
                      <strong>STK Push (Recommended)</strong>
                      <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#ccc' }}>
                        Get payment prompt on your phone
                      </p>
                    </div>
                  </label>
                  
                  <label style={{ 
                    flex: 1, 
                    padding: '12px', 
                    border: mpesaPaymentType === 'paybill' ? '2px solid #00a550' : '1px solid #ddd',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: '#000',
                    color: '#fff'
                  }}>
                    <input
                      type="radio"
                      name="mpesa_type"
                      value="paybill"
                      checked={mpesaPaymentType === 'paybill'}
                      onChange={() => setMpesaPaymentType('paybill')}
                      style={{ marginRight: '8px' }}
                    />
                    <div>
                      <strong>Manual Paybill</strong>
                      <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#ccc' }}>
                        Pay manually using paybill details
                      </p>
                    </div>
                  </label>
                </div>

                {/* STK Push Phone Input */}
                {mpesaPaymentType === 'stkpush' && (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                      Phone Number (for STK Push):
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g., 07XXXXXXXX"
                      defaultValue={user?.phone || ''}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                      id="mpesa-phone-input"
                    />
                    <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#666' }}>
                      You will receive a payment prompt on this phone number
                    </p>
                  </div>
                )}

                {/* Manual Paybill Details */}
                {mpesaPaymentType === 'paybill' && (
                  <div className="paybill-panel">
                    <div className="paybill-steps">
                      <p className="paybill-steps-title"><FiSmartphone /> How to pay</p>
                      <ol>
                        <li>Open <strong>M-Pesa</strong> on your phone</li>
                        <li>Go to <strong>Lipa Na M-Pesa → Paybill</strong></li>
                        <li>Enter <strong>Business No.</strong> and <strong>Account No.</strong> below</li>
                        <li>Enter amount &amp; your M-Pesa PIN</li>
                      </ol>
                    </div>
                    <div className="paybill-details">
                      <div className="paybill-row">
                        <div className="paybill-field">
                          <span className="paybill-label">Business No. (Paybill)</span>
                          <span className="paybill-value">516600</span>
                        </div>
                        <button type="button" className={`paybill-copy${copied === 'paybill' ? ' copied' : ''}`} onClick={() => copyText('516600', 'paybill')} aria-label="Copy paybill number">
                          <FiCopy /> {copied === 'paybill' ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <div className="paybill-row">
                        <div className="paybill-field">
                          <span className="paybill-label">Account No.</span>
                          <span className="paybill-value">254000</span>
                        </div>
                        <button type="button" className={`paybill-copy${copied === 'account' ? ' copied' : ''}`} onClick={() => copyText('254000', 'account')} aria-label="Copy account number">
                          <FiCopy /> {copied === 'account' ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>
                    <p className="paybill-note">Place your order below — send payment via M-Pesa, and our team will confirm once received.</p>
                  </div>
                )}
              </div>
            )}

            {/* === M-PESA PANEL === */}
            {paymentMethod === 'mpesa' && (
              <div className="paybill-panel">
                <div className="paybill-steps">
                  <p className="paybill-steps-title"><FiSmartphone /> How to pay</p>
                  <ol>
                    <li>Open <strong>M-Pesa</strong> on your phone</li>
                    <li>Go to <strong>Lipa Na M-Pesa → Paybill</strong></li>
                    <li>Enter <strong>Business No.</strong> and <strong>Account No.</strong> below</li>
                    <li>Enter amount &amp; your M-Pesa PIN</li>
                  </ol>
                </div>
                <div className="paybill-details">
                  <div className="paybill-row">
                    <div className="paybill-field">
                      <span className="paybill-label">Business No. (Paybill)</span>
                      <span className="paybill-value">516600</span>
                    </div>
                    <button type="button" className={`paybill-copy${copied === 'paybill' ? ' copied' : ''}`} onClick={() => copyText('516600', 'paybill')} aria-label="Copy paybill number">
                      <FiCopy /> {copied === 'paybill' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div className="paybill-row">
                    <div className="paybill-field">
                      <span className="paybill-label">Account No.</span>
                      <span className="paybill-value">254000</span>
                    </div>
                    <button type="button" className={`paybill-copy${copied === 'account' ? ' copied' : ''}`} onClick={() => copyText('254000', 'account')} aria-label="Copy account number">
                      <FiCopy /> {copied === 'account' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
                <p className="paybill-note">Place your order below — send payment via M-Pesa, and our team will confirm once received.</p>
              </div>
            )}

            {/* === CARD PANEL (temporarily disabled) === */}
            {CARD_PAYMENT_ENABLED && paymentMethod === 'card' && (
              <div className="card-panel">
                <p className="card-panel-title"><FiCreditCard /> Enter your card details</p>
                <div className="card-fields">
                  <label className="card-field card-field-wide">
                    <span>Card number</span>
                    <input
                      name="card_number"
                      type="text"
                      inputMode="numeric"
                      maxLength={19}
                      placeholder="1234  5678  9012  3456"
                      autoComplete="cc-number"
                      onInput={(e) => {
                        // auto-space every 4 digits
                        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
                      }}
                    />
                  </label>
                  <label className="card-field card-field-wide">
                    <span>Cardholder name</span>
                    <input name="card_name" type="text" placeholder="Name as on card" autoComplete="cc-name" />
                  </label>
                  <label className="card-field">
                    <span>Expiry date</span>
                    <input
                      name="card_expiry"
                      type="text"
                      inputMode="numeric"
                      maxLength={5}
                      placeholder="MM / YY"
                      autoComplete="cc-exp"
                      onInput={(e) => {
                        let v = e.target.value.replace(/\D/g, '').slice(0, 4);
                        if (v.length >= 3) v = v.slice(0, 2) + ' / ' + v.slice(2);
                        e.target.value = v;
                      }}
                    />
                  </label>
                  <label className="card-field">
                    <span>CVV / CVC</span>
                    <input name="card_cvv" type="password" inputMode="numeric" maxLength={4} placeholder="•••" autoComplete="cc-csc" />
                  </label>
                </div>
                <p className="paybill-note"><FiLock style={{display:'inline', marginRight:'4px', verticalAlign:'middle'}} />Your card details are encrypted and never stored.</p>
              </div>
            )}

          </section>

        </div>


        <aside className="checkout-summary-card">
          <div className="checkout-summary-top"><span className="cart-section-kicker">Order total</span><h2>Almost ready</h2><p>Review your order before placing it.</p></div>
          <Summary subtotal={subtotal} />
          <div className="checkout-trust"><FiClock /><span><strong>Freshly prepared</strong><small>We'll start as soon as your order is confirmed.</small></span></div>
          <div className="checkout-trust"><FiLock /><span><strong>Safe and secure</strong><small>Your details are only used to fulfil this order.</small></span></div>
          <button className="primary-button full checkout-submit" type="submit" disabled={isProcessingMpesa}>
            {isProcessingMpesa ? 'Processing...' : 'Place order'} <FiArrowRight />
          </button>
          <p className="checkout-note">By placing your order, you confirm that your delivery details are correct.</p>
        </aside>
      </form>

      <PaymentStatusModal
        open={!!payModal}
        status={payModal?.status}
        title={payModal?.title}
        message={payModal?.message}
        actionLabel={payModal?.actionLabel}
        onAction={payModal?.onAction}
        onClose={closePayModal}
      />
    </main>
  );
};

export default Checkout;
