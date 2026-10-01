import React, { useState, useEffect } from "react";
import {
  FiClock,
  FiMapPin,
  FiUser,
  FiX,
} from "react-icons/fi";
import Brand from '../../components/Navigation';
import { RiWhatsappFill } from "react-icons/ri";
import { Link } from "react-router-dom";
import { RiEBike2Fill } from "react-icons/ri";
import { GiMeal } from "react-icons/gi";
import { GiPartyPopper } from "react-icons/gi";
const typewriterPhrases = [
  "Welcome to Chateau254",
  "Serene Dining",
  "Ecstatic Events",
  "Fine Wine",
  "Thrilling Chateau Experience",
];

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 22) return "Good evening";
  return "Good night";
};

const Home = ({ api, onTakeout, onDining, onEvents, onAuth }) => {
  const [currentPhrase, setCurrentPhrase] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [promotions, setPromotions] = useState([]);
  const [dismissedPromos, setDismissedPromos] = useState([]);

  useEffect(() => {
    console.log('[promo] useEffect running');
    fetch(`${api}/promotions`)
      .then((res) => { console.log('[promo] fetch status', res.status); return res.json(); })
      .then((data) => { console.log('[promo] fetched', data.promotions?.length || 0); setPromotions(data.promotions || []); })
      .catch((err) => { console.error('[promo] fetch failed', err); });
    const dismissed = JSON.parse(localStorage.getItem('chateau254_dismissed_promotions') || '[]');
    setDismissedPromos(dismissed);
  }, [api]);

  const dismissPromotion = (id) => {
    const updated = [...dismissedPromos, id];
    setDismissedPromos(updated);
    localStorage.setItem('chateau254_dismissed_promotions', JSON.stringify(updated));
  };

  // For testing: run clearDismissedPromos() in console to reset dismissed promos
  if (typeof window !== 'undefined') {
    window.clearDismissedPromos = () => {
      localStorage.removeItem('chateau254_dismissed_promotions');
      setDismissedPromos([]);
    };
  }

  const activePromo = promotions.find((p) => !dismissedPromos.includes(p.id) && p.is_active);
  console.log("[promo] promotions", promotions, "dismissed", dismissedPromos, "activePromo", activePromo);

  useEffect(() => {
    const phrase = typewriterPhrases[currentPhrase];
    let timeout;

    if (!isDeleting && displayText === phrase) {
      timeout = setTimeout(() => setIsDeleting(true), 2000);
    } else if (isDeleting && displayText === "") {
      setIsDeleting(false);
      setCurrentPhrase((prev) => (prev + 1) % typewriterPhrases.length);
    } else {
      timeout = setTimeout(
        () => {
          setDisplayText(
            isDeleting
              ? phrase.substring(0, displayText.length - 1)
              : phrase.substring(0, displayText.length + 1),
          );
        },
        isDeleting ? 40 : 80,
      );
    }
    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, currentPhrase]);

  return (
    <main className="home-page">
      <div className="home-overlay" />
      <nav className="home-nav">
        <Brand />
        <button
          className="icon-button light"
          aria-label="Sign in"
          onClick={onAuth}
        >
          <FiUser />
        </button>
      </nav>
      {activePromo && (
        <div
          className="promo-banner promo-modal"
          role="status"
          aria-live="polite"
          onClick={(event) => { if (event.target === event.currentTarget) dismissPromotion(activePromo.id); }}
        >
          <div className="promo-modal-card">
            {activePromo.image_url && (
              <div className="promo-media">
                <img src={activePromo.image_url} alt={activePromo.title || 'Promotion'} />
              </div>
            )}
            <div className="promo-modal-shade" aria-hidden="true" />
            <div className="promo-content">
              <div className="promo-copy">
                <span className="promo-kicker">Château feature</span>
                {activePromo.title && <h3>{activePromo.title}</h3>}
                <p>{activePromo.message}</p>
              </div>
            </div>
            <button className="promo-close" onClick={() => dismissPromotion(activePromo.id)} aria-label="Close promotion"><FiX /></button>
          </div>
        </div>
      )}
      {/* {!activePromo && promotions.length === 0 && (
        <div className="promo-banner promo-banner-placeholder">
          <div className="promo-accent" aria-hidden="true" />
          <div className="promo-content">
            <div className="promo-copy">
              <span className="promo-kicker">Coming soon</span>
              <h3>Something special is on the way</h3>
              <p>We have exciting experiences coming your way. Stay tuned!</p>
            </div>
          </div>
        </div>
      )} */}
      <section className="hero-section">
        <div className="hero-left">
          <p className="eyebrow">Nairobi's finest dining room</p>
          <h1>
            {getGreeting()}
            {/* <span>Welcome to Château</span> */}
          </h1>
          <p className="hero-text">
            Great food, fine wine,
            <br />
            delivered to your door.
          </p>
          <span className="options">Enjoy our Chateau Options:</span>
          <div className="cta-btns">
            <button className="cta-button cta-takeout" onClick={onTakeout}>
              <RiEBike2Fill /> Take Out
            </button>
            <button className="cta-button cta-dining" onClick={onDining}>
              <GiMeal /> Dine-in
            </button>
            <button className="cta-button cta-events" onClick={onEvents}>
              <GiPartyPopper />Events
            </button>
             <button className="cta-button cta-events" onClick={onEvents}>
              <GiPartyPopper />Wine Cellar
            </button>
          </div>
        </div>
        <div className="hero-right">
          <div className="typewriter-container">
            <span className="typewriter-text">{displayText}</span>
            <span className="typewriter-cursor">|</span>
          </div>
        </div>
      </section>
      <div className="home-foot">
        <span>
          <FiMapPin /> General Mathenge The Promenade, Nairobi
        </span>
        <span>
          <FiClock /> Open until 11:00 PM
        </span>
        <div className="whatsapp-float">
          <Link
            to="https://wa.me/254114100680"
            target="_blank"
            rel="noopener noreferrer"
          >
            <RiWhatsappFill />
          </Link>
        </div>
      </div>
    </main>
  );
};

export default Home;
