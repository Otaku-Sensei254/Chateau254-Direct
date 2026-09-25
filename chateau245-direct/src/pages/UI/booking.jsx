import { useState } from 'react';
import { FiArrowLeft, FiCalendar, FiSave, FiUser, FiUsers, FiClipboard, FiX } from 'react-icons/fi';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const today = () => new Date().toISOString().slice(0, 16);

const Booking = ({ user, token, selectedItems = [], onClearSelections }) => {
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
      preferred_item: selectedItems.length ? selectedItems.map((i) => i.name).join(', ') : null,
      dining_time: form.get('dining_time'),
      notes: [form.get('notes') || '', selectedItems.length ? `Selected items: ${selectedItems.map((i) => `${i.name} — KES ${Number(i.price).toLocaleString()}`).join(', ')}` : ''].filter(Boolean).join('\n'),
    };
    try {
      const res = await fetch(`${API_URL}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to create reservation');
      setSubmitted(true);
      onClearSelections?.();
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
        <label>Selected items</label>
        {selectedItems.length === 0 ? (
          <p style={{ color: '#837a75', fontSize: '13px' }}>No items selected yet. Browse the Dine-in menu and add items before booking.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {selectedItems.map((item) => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '8px 10px', border: '1px solid #e9e1dc', borderRadius: '8px', background: '#fff' }}>
                <div>
                  <strong>{item.name}</strong>
                  <span style={{ marginLeft: '8px', color: '#837a75', fontSize: '12px' }}>KES {Number(item.price).toLocaleString()}</span>
                </div>
                <button type="button" onClick={() => onClearSelections((prev) => prev.filter((i) => i.id !== item.id))} style={{ background: 'none', border: 'none', color: '#c62828', cursor: 'pointer' }}><FiX /></button>
              </div>
            ))}
          </div>
        )}
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
