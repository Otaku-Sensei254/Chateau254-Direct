import React, { useState } from 'react';
import {
  FiCalendar,
  FiUser,
  FiMail,
  FiPhone,
  FiUsers,
  FiCheckCircle,
  FiAward,
  FiArrowRight,
  FiArrowLeft
} from 'react-icons/fi';
import { RiWhatsappFill } from 'react-icons/ri';
import { Link, useNavigate } from 'react-router-dom';
import './styles/events.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const FEATURED_EVENTS = [
  {
    id: 'wine-tasting',
    title: 'Wine Tasting Masterclass',
    subtitle: 'Sip, Swirl & Discover',
    schedule: 'Every Saturday • 5:00 PM – 8:00 PM',
    price: 'KES 4,500 per person',
    tag: 'Weekly Tasting',
    eventType: 'Private Wine Tasting & Dinner',
    image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=900&q=80',
    description:
      'Guided tasting across French, Italian, and boutique African vintages with our certified sommelier. Paired with artisanal cheeses and cured meats.',
  },
  {
    id: 'karaoke-night',
    title: 'Karaoke & Cocktails Night',
    subtitle: 'Sing Loud, Sip Proud',
    schedule: 'Every Friday • 7:30 PM till late',
    price: 'Free Entry • Happy Hour Jugs',
    tag: 'Weekend Vibe',
    eventType: 'Cocktail Party & Mixer',
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=900&q=80',
    description:
      'The weekend kicks off with your favourite tracks, top-tier audio, signature craft cocktails, and sharing platters for your squad.',
  },
  {
    id: 'red-wine-thursday',
    title: 'Red Wine Thursday',
    subtitle: 'Cellar Night Special',
    schedule: 'Every Thursday • 6:00 PM – 11:00 PM',
    price: '20% Off All Bottle Reds',
    tag: 'Cellar Special',
    eventType: 'Anniversary & Romantic Dinner',
    image: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=900&q=80',
    description:
      'Candlelit ambiance, gentle acoustic melodies, and exclusive discounts on Bordeaux blends, Super Tuscans, and rich South African reds.',
  },
  {
    id: 'sunday-sundowner',
    title: 'Sunday Sundowner & Live Jazz',
    subtitle: 'Rhythm & Rosé',
    schedule: 'Every Sunday • 4:00 PM – 9:00 PM',
    price: 'Complimentary Welcome Glass',
    tag: 'Live Music',
    eventType: 'Birthday Celebration',
    image: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=900&q=80',
    description:
      'Unwind from the week with our live saxophone trio, sunset skyline views on the terrace, and crisp sparkling champagne pours.',
  },
];

const EVENT_TYPES = [
  'Birthday Celebration',
  'Corporate Dinner & Gala',
  'Wedding Reception & Bridal Shower',
  'Private Wine Tasting & Dinner',
  'Cocktail Party & Mixer',
  'Anniversary & Romantic Dinner',
  'Year-End / Office Party',
  'Other Custom Gathering',
];

const todayDate = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().slice(0, 16);
};

const EventsPage = ({ user, onExploreCatering }) => {
  const navigate = useNavigate();
  const [selectedEventType, setSelectedEventType] = useState(EVENT_TYPES[0]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSelectEventForBooking = (eventType) => {
    setSelectedEventType(eventType);
    const formElement = document.getElementById('book-event-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const name = form.get('name');
    const email = form.get('email');
    const phone = form.get('phone');
    const eventType = form.get('event_type');
    const guests = form.get('guests');
    const date = form.get('event_date');
    const notes = form.get('notes');

    const body = {
      customer_name: name,
      email,
      phone,
      party_size: Number(guests) || 10,
      preferred_item: `Event: ${eventType}`,
      dining_time: date,
      notes: `[EVENT INQUIRY] Type: ${eventType} | Phone: ${phone} | Email: ${email} | Notes: ${notes || 'None'}`,
    };

    try {
      await fetch(`${API_URL}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).catch(() => null);

      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Something went wrong submitting your inquiry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="events-page">
      {/* Top navigation row */}
      <div className="events-top-nav">
        <button
          className="back-button"
          onClick={() => navigate('/')}
          aria-label="Back to home"
        >
          <FiArrowLeft /> Home
        </button>
        {onExploreCatering && (
          <button className="catering-pill-btn" onClick={onExploreCatering}>
            Explore Catering Menu <FiArrowRight />
          </button>
        )}
      </div>

      {/* Hero Header */}
      <header className="events-hero">
        <span className="events-eyebrow">Château254 Experiences</span>
        <h1>Events & Gatherings</h1>
        <p className="events-hero-subtitle">
          From intimate wine tastings and acoustic cellar nights to corporate galas and lavish
          celebrations — host your next memorable moment with us.
        </p>
      </header>

      {/* Featured Weekly Events */}
      <section className="events-section">
        <div className="section-title-wrap">
          <h2>Weekly Curated Events</h2>
          <p>Join us for regular highlights happening throughout the week at Château254.</p>
        </div>

        <div className="events-grid">
          {FEATURED_EVENTS.map((event) => (
            <article className="event-card" key={event.id}>
              <div
                className="event-card-image"
                style={{ backgroundImage: `url(${event.image})` }}
              >
                <span className="event-tag">{event.tag}</span>
              </div>
              <div className="event-card-body">
                <span className="event-subtitle">{event.subtitle}</span>
                <h3>{event.title}</h3>
                <p className="event-description">{event.description}</p>
                <div className="event-meta">
                  <span>
                    <FiCalendar /> {event.schedule}
                  </span>
                  <strong className="event-price">{event.price}</strong>
                </div>
                <button
                  className="event-book-btn"
                  onClick={() => handleSelectEventForBooking(event.eventType)}
                >
                  Book / Inquire <FiArrowRight />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Catering Menu Banner */}
      {onExploreCatering && (
        <section className="catering-banner">
          <div className="catering-banner-content">
            <span className="badge-pill">Food & Beverage Packages</span>
            <h2>Planning Event Catering?</h2>
            <p>
              Explore our specialized event menu with mini skewers, canapés, whole roasted carving
              stations, buffet trays, and bulk celebration bubbly.
            </p>
          </div>
          <button className="primary-button catering-cta" onClick={onExploreCatering}>
            View Event Catering Menu <FiArrowRight />
          </button>
        </section>
      )}

      {/* Book an Event Form */}
      <section className="booking-section" id="book-event-form">
        <div className="section-title-wrap text-center">
          <span className="events-eyebrow">Custom Reservations</span>
          <h2>Book an Event With Château254</h2>
          <p>
            Tell us about your upcoming occasion. Our event coordinator will get in touch within
            24 hours with package recommendations and custom quotes.
          </p>
        </div>

        {submitted ? (
          <div className="event-booking-success">
            <div className="success-icon">
              <FiCheckCircle />
            </div>
            <h3>Inquiry Received!</h3>
            <p>
              Thank you! Your event inquiry has been sent to the Château254 hospitality team. We will
              call or email you shortly with tailored options.
            </p>
            <button
              className="primary-button"
              onClick={() => setSubmitted(false)}
            >
              Submit Another Inquiry
            </button>
          </div>
        ) : (
          <form className="event-form" onSubmit={handleBookingSubmit}>
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="event-name">Full Names *</label>
                <div className="form-input">
                  <FiUser />
                  <input
                    id="event-name"
                    name="name"
                    type="text"
                    defaultValue={user?.full_name || ''}
                    placeholder="e.g. Grace Mwangi"
                    required
                  />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="event-email">Email Address *</label>
                <div className="form-input">
                  <FiMail />
                  <input
                    id="event-email"
                    name="email"
                    type="email"
                    defaultValue={user?.email || ''}
                    placeholder="e.g. grace@example.com"
                    required
                  />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="event-phone">Phone Number *</label>
                <div className="form-input">
                  <FiPhone />
                  <input
                    id="event-phone"
                    name="phone"
                    type="tel"
                    placeholder="+254 7XX XXX XXX"
                    required
                  />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="event-type">Event Type *</label>
                <div className="form-input">
                  <FiAward />
                  <select
                    id="event-type"
                    name="event_type"
                    value={selectedEventType}
                    onChange={(e) => setSelectedEventType(e.target.value)}
                    required
                  >
                    {EVENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="event-guests">Estimated Guests</label>
                <div className="form-input">
                  <FiUsers />
                  <input
                    id="event-guests"
                    name="guests"
                    type="number"
                    min="2"
                    max="500"
                    defaultValue="15"
                    required
                  />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="event-date">Preferred Date & Time *</label>
                <div className="form-input">
                  <FiCalendar />
                  <input
                    id="event-date"
                    name="event_date"
                    type="datetime-local"
                    min={todayDate()}
                    defaultValue={todayDate()}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-field full-width">
              <label htmlFor="event-notes">Event Information & Special Requests</label>
              <div className="form-textarea">
                <textarea
                  id="event-notes"
                  name="notes"
                  rows="4"
                  placeholder="Tell us more: theme, dietary preferences, wine choices, indoor or garden terrace setup..."
                />
              </div>
            </div>

            {error && <p className="auth-error">{error}</p>}

            <button className="primary-button form-submit-btn" type="submit" disabled={loading}>
              {loading ? 'Sending Inquiry...' : 'Submit Event Request'} <FiArrowRight />
            </button>
          </form>
        )}
      </section>

      {/* Floating WhatsApp */}
      <div className="whatsapp-float">
        <Link
          to="https://wa.me/254114100680"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat on WhatsApp"
        >
          <RiWhatsappFill />
        </Link>
      </div>
    </main>
  );
};

export default EventsPage;
