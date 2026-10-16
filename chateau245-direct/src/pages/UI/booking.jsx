import { useState } from 'react';
import { FiArrowLeft, FiCalendar, FiSave, FiUser, FiUsers, FiClipboard, FiX, FiMessageCircle, FiPhone } from 'react-icons/fi';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const today = () => new Date().toISOString().slice(0, 16);

const Booking = ({ user, token, selectedItems = [], onClearSelections }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const partySize = Number(form.get('party_size'));
    const customerName = form.get('name');
    const customerPhone = form.get('phone') || '';
    const diningTime = form.get('dining_time');
    const notes = form.get('notes') || '';
    if (!customerName) {
      setError('Please enter your name.');
      setLoading(false);
      return;
    }
    if (!user && !customerPhone) {
      setError('Please enter your phone number.');
      setLoading(false);
      return;
    }
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
      customer_name: customerName,
      party_size: partySize,
      preferred_item: selectedItems.length ? selectedItems.map((i) => i.name).join(', ') : null,
      dining_time: diningTime,
      notes: [customerPhone ? `Phone: ${customerPhone}` : '', notes, selectedItems.length ? `Selected items: ${selectedItems.map((i) => `${i.name} — KES ${Number(i.price).toLocaleString()}`).join(', ')}` : ''].filter(Boolean).join('\n'),
    };
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${API_URL}/bookings`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || 'Failed to create reservation');
      const booking = result.booking;
      const bookingReference = booking?.id ? booking.id.slice(0, 8) : 'pending';
      const message = [
        'Hello Château254, I have submitted a table reservation through the website.',
        `Reservation reference: #${bookingReference}`,
        `Name: ${customerName}`,
          `Phone: ${customerPhone || user?.phone || 'Not provided'}`,
        `Guests: ${partySize}`,
        `Preferred date and time: ${new Date(diningTime).toLocaleString('en-KE')}`,
        selectedItems.length ? `Selected items: ${selectedItems.map((item) => `${item.name} — KES ${Number(item.price).toLocaleString()}`).join(', ')}` : '',
        notes ? `Notes: ${notes}` : '',
        'Please confirm my reservation on WhatsApp.',
      ].filter(Boolean).join('\n');
      setSubmitted({
        reference: bookingReference,
        whatsappUrl: `https://wa.me/254114100680?text=${encodeURIComponent(message)}`,
      });
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
        <p className="booking-success-text">Thank you, {user?.full_name || 'friend'}. Your table request #{submitted.reference} has been saved for the restaurant.</p>
        <p className="booking-success-hint">The team will confirm your booking and assign a table shortly.</p>
        <button className="text-button" onClick={() => setSubmitted(null)}>Make another booking</button>
        <a className="primary-button booking-whatsapp-button" href={submitted.whatsappUrl} target="_blank" rel="noopener noreferrer">
          <FiMessageCircle /> Message Château on WhatsApp
        </a>
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
        <label htmlFor="booking-phone">Phone number</label>
        <div className="booking-input"><FiPhone /><input id="booking-phone" name="phone" type="tel" placeholder="+254 700 000 000" defaultValue={user?.phone || ''} required={!user} /></div>
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
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No items selected yet. Browse the Dine-in menu and add items before booking.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {selectedItems.map((item) => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface-raised)' }}>
                <div>
                  <strong>{item.name}</strong>
                  <span style={{ marginLeft: '8px', color: 'var(--text-muted)', fontSize: '12px' }}>KES {Number(item.price).toLocaleString()}</span>
                </div>
                <button type="button" onClick={() => onClearSelections((prev) => prev.filter((i) => i.id !== item.id))} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}><FiX /></button>
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
