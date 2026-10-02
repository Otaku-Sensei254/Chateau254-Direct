import { useState, useRef } from 'react';
import { FiArrowRight, FiCheck, FiChevronDown, FiClock, FiLock, FiMapPin, FiTruck } from 'react-icons/fi';
import { Summary } from './shared';
import LocationPicker from '../../components/LocationPicker';

const Checkout = ({ subtotal, delivery, placeOrder }) => {
  const [coords, setCoords] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [reverseStatus, setReverseStatus] = useState(null);
  const addressRef = useRef(null);

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

  const handleSubmit = (event) => {
    event.preventDefault();
    placeOrder(event, coords);
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
              <label className="checkout-field"><span>Full name</span><input name="name" placeholder="Your name" required /></label>
              <label className="checkout-field"><span>Phone number</span><input name="phone" placeholder="+254 712 345 678" required /></label>
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
                <span className="checkout-option-copy"><strong>Delivery</strong><small>45–60 min · KES {delivery.toLocaleString()}</small></span>
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
              <label className="payment-option"><input type="radio" name="payment" defaultChecked /><span><strong>Cash on delivery</strong><small>Pay when your order arrives.</small></span><span className="checkout-option-check"><FiCheck /></span></label>
              <label className="payment-option"><input type="radio" name="payment" /><span><strong>M-Pesa</strong><small>Pay securely from your phone.</small></span><span className="checkout-option-check"><FiCheck /></span></label>
            </div>
          </section>
        </div>

        <aside className="checkout-summary-card">
          <div className="checkout-summary-top"><span className="cart-section-kicker">Order total</span><h2>Almost ready</h2><p>Review your order before placing it.</p></div>
          <Summary subtotal={subtotal} delivery={delivery} />
          <div className="checkout-trust"><FiClock /><span><strong>Freshly prepared</strong><small>We'll start as soon as your order is confirmed.</small></span></div>
          <div className="checkout-trust"><FiLock /><span><strong>Safe and secure</strong><small>Your details are only used to fulfil this order.</small></span></div>
          <button className="primary-button full checkout-submit" type="submit">Place order <FiArrowRight /></button>
          <p className="checkout-note">By placing your order, you confirm that your delivery details are correct.</p>
        </aside>
      </form>
    </main>
  );
};

export default Checkout;
