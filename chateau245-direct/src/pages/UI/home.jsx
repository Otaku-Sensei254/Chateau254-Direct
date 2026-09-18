import React, { useState, useEffect } from "react";
import {
  FiClock,
  FiMapPin,
  FiUser,
} from "react-icons/fi";
import { Brand } from "./shared";
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
  return "Good evening";
};

const Home = ({ onTakeout, onDining, onEvents, onAuth }) => {
  const [currentPhrase, setCurrentPhrase] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

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
      <section className="hero-section">
        <div className="hero-left">
          <p className="eyebrow">Nairobi's finest dining room</p>
          <h1>
            {getGreeting()}
            <span>at Château254</span>
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
