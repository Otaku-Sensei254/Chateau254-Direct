import React from 'react';
import { FiArrowUpRight, FiClock, FiInstagram, FiMapPin, FiMessageCircle } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import Brand from './Brand';
import InstallButton from './InstallButton';

const AppFooter = () => (
  <footer className="app-footer">
    <div className="app-footer-inner">
      <div className="app-footer-main">
        <div className="app-footer-brand">
          <Brand className="app-footer-logo" />
          <p>Great food, fine wine, and memorable Château moments in Nairobi.</p>
          <InstallButton alwaysVisible className="footer-install-button" />
        </div>

        <div className="app-footer-column">
          <h2>Explore</h2>
          <Link to="/menu">Menus <FiArrowUpRight /></Link>
          <Link to="/wines">Wine Cellar <FiArrowUpRight /></Link>
          <Link to="/events">Events <FiArrowUpRight /></Link>
          <Link to="/feed">Feed <FiArrowUpRight /></Link>
        </div>

        <div className="app-footer-column">
          <h2>Order &amp; visit</h2>
          <Link to="/cart">Your cart <FiArrowUpRight /></Link>
          <Link to="/booking">Reserve a table <FiArrowUpRight /></Link>
          <a href="https://wa.me/254114100680" target="_blank" rel="noopener noreferrer">WhatsApp us <FiArrowUpRight /></a>
        </div>

        <div className="app-footer-contact">
          <h2>Find us</h2>
          <p><FiMapPin /><span>General Mathenge<br />The Promenade, Nairobi</span></p>
          <p><FiClock /><span>Open until 11:00 PM</span></p>
          <a href="https://instagram.com/chateau254" target="_blank" rel="noopener noreferrer"><FiInstagram /> @chateau254</a>
          <a href="https://wa.me/254114100680" target="_blank" rel="noopener noreferrer"><FiMessageCircle /> Chat on WhatsApp</a>
        </div>
      </div>

      <div className="app-footer-bottom">
        <span>© {new Date().getFullYear()} Château254. All rights reserved.</span>
        <span>Powered by <strong>WebWorks, D-Huhu Tech Labs</strong></span>
      </div>
    </div>
  </footer>
);

export default AppFooter;
