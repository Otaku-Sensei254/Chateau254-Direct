import { useState, useRef } from 'react';
import { FiArrowRight, FiMapPin, FiTruck } from 'react-icons/fi';
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
      <div className="page-title">
        <p className="eyebrow">One last detail</p>
        <h1>Delivery details</h1>
        <span>We'll bring your order fresh and fast.</span>
      </div>
      <form onSubmit={handleSubmit}>
        <label>Full name<input name="name" placeholder='Your name' required /></label>
        <label>Phone number<input name="phone" placeholder='+254 712 345 678' required /></label>
        <label>
          Delivery address
          <textarea
            ref={addressRef}
            name="address"
            placeholder='Search on map below or type your address'
            required
          />
        </label>

        <div style={{ marginBottom: '1rem' }}>
          <button
            type="button"
            onClick={() => setShowMap(!showMap)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              background: coords ? '#e8f5e9' : '#f5f5f5',
              border: `1px solid ${coords ? '#4CAF50' : '#ddd'}`,
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              color: coords ? '#2e7d32' : '#333',
              width: '100%',
              justifyContent: 'center',
            }}
          >
            <FiMapPin />
            {showMap ? 'Close map' : coords ? 'Location set — adjust on map' : 'Set location on map'}
          </button>
        </div>

        {showMap && (
          <div style={{ marginBottom: '1rem' }}>
            <LocationPicker onLocationSelect={handleLocationSelect} />
            {reverseStatus === 'loading' && (
              <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                Looking up address...
              </p>
            )}
          </div>
        )}

        <div className="form-section">
          <h2>Delivery option</h2>
          <div className="option-grid">
            <label className="option active"><input type="radio" name="delivery_option" defaultChecked /> <FiTruck /><span>Delivery<small>KES 250</small></span></label>
            <label className="option"><input type="radio" name="delivery_option" /> <FiMapPin /><span>Pick up<small>Free</small></span></label>
          </div>
        </div>
        <div className="form-section">
          <h2>Payment method</h2>
          <label className="payment-option"><input type="radio" name="payment" defaultChecked /> Cash on delivery</label>
          <label className="payment-option"><input type="radio" name="payment" /> M-Pesa</label>
        </div>
        <Summary subtotal={subtotal} delivery={delivery} />
        <button className="primary-button full" type="submit">Place order <FiArrowRight /></button>
      </form>
    </main>
  );
};

export default Checkout;
