import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiArrowLeft, FiCompass, FiCalendar, FiHome } from 'react-icons/fi';
import { GiWineBottle, GiMeal } from 'react-icons/gi';
import { PiWineFill } from 'react-icons/pi';
import './styles/notFound.css';

const NotFound = ({ onHome, onBack }) => {
  const navigate = useNavigate();
  const [searchVal, setSearchVal] = useState('');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchVal.trim()) {
      navigate(`/menu?search=${encodeURIComponent(searchVal.trim())}`);
    } else {
      navigate('/menu');
    }
  };

  const quickLinks = [
    {
      title: 'Our Menu',
      subtitle: 'Dine-in & Lunch & Bar',
      icon: GiMeal,
      path: '/menu',
    },
    {
      title: 'Wine Collection',
      subtitle: 'Curated Pours',
      icon: PiWineFill,
      path: '/wines',
    },
    {
      title: 'My Cellar',
      subtitle: 'Your Saved Bottles',
      icon: GiWineBottle,
      path: '/my-cellar',
    },
    {
      title: 'Reservations',
      subtitle: 'Book a Table',
      icon: FiCalendar,
      path: '/booking',
    },
  ];

  return (
    <main className="notfound-page">
      <div className="notfound-bg-glow" />

      <div className="notfound-card">
        {/* Emblem */}
        <div className="notfound-badge-wrap">
          <span className="notfound-code-pill">404 • Vintage Not Found</span>
        </div>

        <div className="notfound-emblem">
          <GiWineBottle className="notfound-icon-main" />
          <span className="notfound-compass-icon">
            <FiCompass />
          </span>
        </div>

        {/* Headlines */}
        <h1 className="notfound-title">
          This Bottle Hasn't Been <em>Cellared</em> Yet
        </h1>
        <p className="notfound-desc">
          It looks like the page, vintage, or dish you are looking for has been moved, poured,
          or does not exist in our cellar. Let us help you find your way back.
        </p>

        <span className="notfound-divider" />

        {/* Quick Search */}
        <div className="notfound-search">
          <form onSubmit={handleSearchSubmit}>
            <FiSearch style={{ color: 'var(--text-faint)', marginRight: '8px', fontSize: '16px' }} />
            <input
              type="text"
              placeholder="Search dishes, wines, or categories..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
            />
            <button type="submit">Search</button>
          </form>
        </div>

        {/* Quick Links Grid */}
        <div className="notfound-quick-links">
          {quickLinks.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                type="button"
                className="notfound-quick-card"
                onClick={() => navigate(item.path)}
              >
                <span className="notfound-quick-icon">
                  <Icon />
                </span>
                <span className="notfound-quick-label">{item.title}</span>
                <span className="notfound-quick-sub">{item.subtitle}</span>
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="notfound-actions">
          <button
            type="button"
            className="notfound-btn-primary"
            onClick={onHome || (() => navigate('/menu'))}
          >
            <FiHome /> Back to Chateau Menu
          </button>
          {onBack && (
            <button
              type="button"
              className="notfound-btn-secondary"
              onClick={onBack}
            >
              <FiArrowLeft /> Previous Page
            </button>
          )}
        </div>
      </div>
    </main>
  );
};

export default NotFound;
