import { useState } from 'react';
import { FiArrowLeft, FiCalendar, FiCheckCircle, FiUser, FiUsers, FiClipboard, FiX, FiMessageCircle, FiPhone, FiAlertCircle, FiShoppingBag } from 'react-icons/fi';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const today = () => {
  const now = new Date();
  // Round up to the next 30-minute interval to avoid duplicate default timestamps
  const minutes = now.getMinutes();
  const rounded = minutes < 30 ? 30 : 60;
  now.setMinutes(rounded, 0, 0);
  if (rounded === 60) now.setHours(now.getHours() + 1);
  return now.toISOString().slice(0, 16);
};

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
    const customerName = form.get('name')?.trim();
    const customerPhone = form.get('phone')?.trim() || '';
    const diningTime = form.get('dining_time');
    const notes = form.get('notes')?.trim() || '';

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
    if (!diningTime) {
      setError('Please choose a dining time.');
      setLoading(false);
      return;
    }

    const body = {
      customer_name: customerName,
      customer_phone: customerPhone,
      party_size: partySize,
      preferred_item: selectedItems.length ? selectedItems.map((i) => i.name).join(', ') : null,
      dining_time: diningTime,
      notes: notes,
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
      const formattedDiningTime = new Date(diningTime).toLocaleString('en-KE', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
      const message = [
        'Hello Château254, I have submitted a table reservation through the website.',
        `Reservation reference: #${bookingReference}`,
        `Name: ${customerName}`,
        `Phone: ${customerPhone || user?.phone || 'Not provided'}`,
        `Guests: ${partySize}`,
        `Preferred date and time: ${formattedDiningTime}`,
        selectedItems.length ? `Selected items: ${selectedItems.map((item) => `${item.name} — KES ${Number(item.price).toLocaleString()}`).join(', ')}` : '',
        notes ? `Notes: ${notes}` : '',
        'Please confirm my reservation on WhatsApp.',
      ].filter(Boolean).join('\n');

      setSubmitted({
        reference: bookingReference,
        name: customerName,
        phone: customerPhone || user?.phone,
        partySize,
        diningTime: formattedDiningTime,
        notes,
        whatsappUrl: `https://wa.me/254114100680?text=${encodeURIComponent(message)}`,
      });
      // Auto-open WhatsApp so the guest only needs to press Send
      window.open(`https://wa.me/254114100680?text=${encodeURIComponent(message)}`, '_blank');
      onClearSelections?.();
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <main className="content-page booking-page">
        <div className="booking-top-bar">
          <button type="button" className="auth-back" onClick={() => setSubmitted(null)}>
            <FiArrowLeft /> Back
          </button>
        </div>

        <div className="booking-success-card">
          <div className="booking-success-emblem">
            <FiCheckCircle />
          </div>
          <span className="booking-ref-badge">Reservation #{submitted.reference}</span>
          <h2 className="booking-success-title">Reservation Received!</h2>
          <p className="booking-success-desc">
            Thank you, <strong>{submitted.name}</strong>. Your table request has been received by Château254.
          </p>

          <div className="booking-summary-box">
            <div className="booking-summary-row">
              <span>Date & Time</span>
              <strong>{submitted.diningTime}</strong>
            </div>
            <div className="booking-summary-row">
              <span>Party Size</span>
              <strong>{submitted.partySize} {submitted.partySize === 1 ? 'Guest' : 'Guests'}</strong>
            </div>
            {submitted.phone && (
              <div className="booking-summary-row">
                <span>Contact Phone</span>
                <strong>{submitted.phone}</strong>
              </div>
            )}
            {submitted.notes && (
              <div className="booking-summary-row">
                <span>Guest Notes</span>
                <strong>{submitted.notes}</strong>
              </div>
            )}
          </div>

          <div className="booking-success-actions">
            <a
              className="booking-whatsapp-cta-button"
              href={submitted.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FiMessageCircle /> Message Chateau on whatsapp to confirm my reservation
            </a>
            <button
              type="button"
              className="booking-secondary-button"
              onClick={() => setSubmitted(null)}
            >
              Make another reservation
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="content-page booking-page">
      <div className="booking-top-bar">
        <button type="button" className="auth-back" onClick={() => window.history.back()}>
          <FiArrowLeft /> Back
        </button>
      </div>

      <div className="booking-header">
        <span className="booking-eyebrow">Table Reservation</span>
        <h1 className="booking-title">Book a Table</h1>
        <p className="booking-subtitle">
          Reserve your bespoke dining and wine experience at Château254.
        </p>
      </div>

      <form className="booking-card" onSubmit={handleSubmit}>
        <div className="booking-grid-2">
          <div className="booking-field">
            <label className="booking-field-label" htmlFor="booking-name">
              Your Name <span className="booking-field-required">*</span>
            </label>
            <div className="booking-input">
              <FiUser />
              <input
                id="booking-name"
                name="name"
                type="text"
                placeholder="e.g. Jane Wanjiku"
                defaultValue={user?.full_name || ''}
                required
              />
            </div>
          </div>

          <div className="booking-field">
            <label className="booking-field-label" htmlFor="booking-phone">
              Phone Number {!user && <span className="booking-field-required">*</span>}
            </label>
            <div className="booking-input">
              <FiPhone />
              <input
                id="booking-phone"
                name="phone"
                type="tel"
                placeholder="+254 7XX XXX XXX"
                defaultValue={user?.phone || ''}
                required={!user}
              />
            </div>
          </div>
        </div>

        <div className="booking-grid-2">
          <div className="booking-field">
            <label className="booking-field-label" htmlFor="booking-party">
              Number of Guests <span className="booking-field-required">*</span>
            </label>
            <div className="booking-input">
              <FiUsers />
              <input
                id="booking-party"
                name="party_size"
                type="number"
                min="1"
                max="30"
                defaultValue="2"
                required
              />
            </div>
          </div>

          <div className="booking-field">
            <label className="booking-field-label" htmlFor="booking-time">
              Preferred Dining Time <span className="booking-field-required">*</span>
            </label>
            <div className="booking-input">
              <FiCalendar style={{ color: '#fff' }} />
              <input
                id="booking-time"
                name="dining_time"
                type="datetime-local"
                min={today()}
                defaultValue={today()}
                required
              />
            </div>
          </div>
        </div>

        <div className="booking-field">
          <label className="booking-field-label">Pre-selected Menu Items</label>
          {selectedItems.length === 0 ? (
            <div className="booking-empty-items">
              <FiShoppingBag />
              <span>No items selected yet. You can browse our Dine-In menu to pre-select dishes and wines before reserving.</span>
            </div>
          ) : (
            <div className="booking-selected-list">
              {selectedItems.map((item) => (
                <div key={item.id} className="booking-selected-item">
                  <div className="booking-item-meta">
                    <strong>{item.name}</strong>
                    <span className="booking-item-price">KES {Number(item.price).toLocaleString()}</span>
                  </div>
                  <button
                    type="button"
                    className="booking-item-remove"
                    onClick={() => onClearSelections?.((prev) => prev.filter((i) => i.id !== item.id))}
                    aria-label={`Remove ${item.name}`}
                  >
                    <FiX />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="booking-field">
          <label className="booking-field-label" htmlFor="booking-notes">
            Notes & Special Requests
          </label>
          <div className="booking-textarea">
            <FiClipboard />
            <textarea
              id="booking-notes"
              name="notes"
              placeholder="Dietary restrictions, allergies, seating preference (terrace, wine cellar, cozy booth)..."
              rows={3}
            />
          </div>
        </div>

        <div className="booking-whatsapp-callout">
          <FiMessageCircle className="booking-whatsapp-icon" />
          <div className="booking-whatsapp-text">
            <strong>Instant WhatsApp Confirmation</strong>
            <span>After requesting your reservation, you can tap to message Château on WhatsApp with your details.</span>
          </div>
        </div>

        {error && (
          <div className="auth-error" role="alert">
            <FiAlertCircle />
            <span>{error}</span>
          </div>
        )}

        <button className="booking-submit-button" type="submit" disabled={loading}>
          {loading ? 'Reserving...' : 'Request Reservation'}
        </button>
      </form>
    </main>
  );
};

export default Booking;