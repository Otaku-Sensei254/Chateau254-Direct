import { useState } from 'react';
import { FiArrowLeft, FiCalendar, FiSave, FiUser, FiUsers, FiClipboard } from 'react-icons/fi';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const today = () => new Date().toISOString().slice(0, 16);

const packages = [
  { value: '', label: '— Select a package or item —' },
  { value: 'Chef\'s Tasting Menu', label: 'Chef\'s Tasting Menu' },
  { value: 'Wine Pairing Package', label: 'Wine Pairing Package' },
  { value: 'Couple\'s Special', label: 'Couple\'s Special' },
  { value: 'À La Carte', label: 'À La Carte' },
];

const Booking = ({ user, token, items = [] }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const partySize = Number(form.get('party_size'));
    if (!partySize || partySize < 1) {
      setError('Please enter the number of guests.');
      setLoading(false);
      return;
    }
    if (!form.get('dining_time')) {
      setError('Please choose a dining time.');
      setLoading(false);
      return;
    }
    const body = {
      customer_name: form.get('name'),
      party_size: partySize,
      preferred_item: form.get('preferred_item') || null,
      dining_time: form.get('dining_time'),
      notes: form.get('notes') || '',
    };
    try {
      const res = await fetch(`${API_URL}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to create reservation');
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return <main className="content-page booking-page">
      <div className="profile-top"><button className="back-button" aria-label="Go back"><FiArrowLeft /></button><h1>Reservation request</h1></div>
      <div className="booking-success">
        <div className="booking-success-icon"><FiSave /></div>
        <h2>Reservation received!</h2>
        <p className="booking-success-text">Thank you, {user?.full_name || 'friend'}. Your table request has been sent to the restaurant.</p>
        <p className="booking-success-hint">The team will confirm your booking and assign a table shortly.</p>
        <button className="primary-button" onClick={() => setSubmitted(false)}>Make another booking</button>
      </div>
    </main>;
  }

  return <main className="content-page booking-page">
    <div className="profile-top"><button className="back-button" aria-label="Go back" onClick={() => window.history.back()}><FiArrowLeft /></button><h1>Book a table</h1></div>

    <form className="booking-form" onSubmit={handleSubmit}>
      <div className="booking-field">
        <label htmlFor="booking-name">Your name</label>
        <div className="booking-input"><FiUser /><input id="booking-name" name="name" type="text" placeholder="Jane Wanjiku" defaultValue={user?.full_name || ''} required /></div>
      </div>

      <div className="booking-field">
        <label htmlFor="booking-party">Number of guests</label>
        <div className="booking-input"><FiUsers /><input id="booking-party" name="party_size" type="number" min="1" max="20" defaultValue="2" required /></div>
      </div>

      <div className="booking-field">
        <label htmlFor="booking-time">Preferred dining time</label>
        <div className="booking-input"><FiCalendar /><input id="booking-time" name="dining_time" type="datetime-local" min={today()} defaultValue={today()} required /></div>
      </div>

      <div className="booking-field">
        <label htmlFor="booking-item">Preferred item / package</label>
        <div className="booking-input"><FiClipboard /><select id="booking-item" name="preferred_item">
          {packages.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          {items.length > 0 && <optgroup label="Menu items">
            {items.map((item) => <option key={item.id} value={item.name}>{item.name} — KES {Number(item.price).toLocaleString()}</option>)}
          </optgroup>}
        </select></div>
      </div>

      <div className="booking-field">
        <label htmlFor="booking-notes">Notes for the restaurant</label>
        <div className="booking-textarea"><FiClipboard /><textarea id="booking-notes" name="notes" placeholder="Allergies, special occasion, window seat, etc." rows={4} /></div>
      </div>

      {error && <p className="auth-error" role="alert">{error}</p>}

      <button className="primary-button auth-submit" type="submit" disabled={loading}>{loading ? 'Saving...' : 'Request reservation'}</button>
    </form>
  </main>;
};

export default Booking;
