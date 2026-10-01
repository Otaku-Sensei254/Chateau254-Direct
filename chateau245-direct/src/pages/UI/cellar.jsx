import React, { useState, useMemo, useRef } from 'react';
import { FiSearch, FiArrowLeft, FiMoreVertical, FiTrash2, FiExternalLink, FiMapPin } from 'react-icons/fi';
import { GiWineBottle } from 'react-icons/gi';
import { PiWineFill } from 'react-icons/pi';
import cellarHeroBg from '../../components/images/cellar-hero.png';
import { LoaderSkeleton } from '../../components/ui/loaders-skeleton';
import './styles/cellar.css';

/* ── Curated sample bottles (would come from user's saved/purchased wines) ── */
const SAMPLE_CELLAR = [
  {
    id: 'lw-2',
    name: 'Château Margaux',
    subname: 'Margaux Grand Cru',
    color: 'Red',
    region: 'France',
    vintage: '2018',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQHs0yVN6uSQeQL1S_OvDdbEzPEiV1jJ8ReASwbASBRGg&s=10',
    addedOn: '12 Jun 2025',
    notes: 'Elegant, silky tannins, floral and cedar notes',
    price: 'KES 15,500',
  },
  {
    id: 'lw-1',
    name: 'Krug Grande Cuvée',
    subname: 'Champagne',
    color: 'White',
    region: 'France',
    vintage: '2015',
    image: 'https://ik.imagekit.io/drinksvine/products/krug-grande-cuvee.webp',
    addedOn: '22 May 2025',
    notes: 'Rich, complex, multi-vintage blend with nutty depth',
    price: 'KES 14,000',
  },
  {
    id: 'lw-4',
    name: 'Penfolds Grange',
    subname: 'Shiraz',
    color: 'Red',
    region: 'Australia',
    vintage: '2019',
    image: 'https://75cl.sg/cdn/shop/files/STARKCONDEFIELDBLEND_grande.png?v=1749711104',
    addedOn: '10 Apr 2025',
    notes: "Australia's most iconic red — rich, dense and structured",
    price: 'KES 22,000',
  },
  {
    id: 'lw-sa-1',
    name: 'Whispering Angel',
    subname: 'Rosé',
    color: 'Rosé',
    region: 'France',
    vintage: '2023',
    image: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=400&q=80',
    addedOn: '28 Mar 2025',
    notes: 'Pale, elegant Provence rosé with delicate fruit',
    price: 'KES 7,200',
  },
  {
    id: 'lw-7',
    name: 'Sassicaia',
    subname: 'Chianti Classico',
    color: 'Red',
    region: 'Italy',
    vintage: '2020',
    image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=400&q=80',
    addedOn: '15 Feb 2025',
    notes: 'Pioneer of the Super Tuscan movement, structured and aromatic',
    price: 'KES 12,500',
  },
  {
    id: 'lw-6',
    name: 'Opus One',
    subname: 'Napa Valley',
    color: 'Red',
    region: 'USA',
    vintage: '2019',
    image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=400&q=80',
    addedOn: '03 Jan 2025',
    notes: 'Joint venture prestige wine, polished and refined',
    price: 'KES 18,900',
  },
];

const COLOR_BADGE = {
  Red: 'cellar-badge--red',
  White: 'cellar-badge--white',
  Rosé: 'cellar-badge--rose',
  Sparkling: 'cellar-badge--sparkling',
};

const QUOTES = [
  '"Good wine is not just a drink, it\'s a story in a bottle."',
  '"Wine is the most civilised thing in the world." — Ernest Hemingway',
  '"In wine there is wisdom, in beer there is freedom." — Benjamin Franklin',
  '"Wine is sunlight, held together by water." — Galileo',
];

const Cellar = ({ user, onMenu, onBack, loading = false }) => {
  const firstName = user?.full_name?.trim().split(' ')[0] || 'Your';

  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [bottles, setBottles] = useState(SAMPLE_CELLAR);
  const menuRef = useRef(null);

  /* ── Derived counts ── */
  const counts = useMemo(() => ({
    All: bottles.length,
    Red: bottles.filter(b => b.color === 'Red').length,
    White: bottles.filter(b => b.color === 'White').length,
    Rosé: bottles.filter(b => b.color === 'Rosé').length,
    Sparkling: bottles.filter(b => b.color === 'Sparkling').length,
  }), [bottles]);

  /* ── Filtered list ── */
  const filtered = useMemo(() => {
    let list = bottles;
    if (activeFilter !== 'All') list = list.filter(b => b.color === activeFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(b =>
        b.name.toLowerCase().includes(q) ||
        b.subname.toLowerCase().includes(q) ||
        b.region.toLowerCase().includes(q) ||
        b.color.toLowerCase().includes(q)
      );
    }
    return list;
  }, [bottles, activeFilter, query]);

  const nextPour = bottles[0] || null;
  const quote = QUOTES[0];

  const handleRemove = (id) => {
    setBottles(prev => prev.filter(b => b.id !== id));
    setMenuOpenId(null);
  };

  const filterTabs = ['All', 'Red', 'White', 'Rosé'];

  return (
    <div className="cellar-page">

      {/* ── Hero Banner ── */}
      <div className="cellar-hero" style={{ backgroundImage: `url(${cellarHeroBg})` }}>
        <div className="cellar-hero-overlay" />
        <div className="cellar-hero-content">
          <button className="cellar-back-btn" onClick={onBack || onMenu}>
            <FiArrowLeft /> Back
          </button>
          <h1 className="cellar-hero-title">
            {firstName}'s <span>Cellar</span>
          </h1>
          <p className="cellar-hero-eyebrow">YOUR CURATED COLLECTION</p>
          <span className="cellar-hero-divider" />
          <p className="cellar-hero-desc">
            The wines you love, all in one place. View, manage and keep track
            of the bottles you've added to your cellar.
          </p>
        </div>
      </div>

      {/* ── Body: Filters + Grid + Sidebar ── */}
      <div className="cellar-body">
        <div className="cellar-main">

          {/* ── Filter Tabs ── */}
          <div className="cellar-filter-row">
            {filterTabs.map(tab => (
              <button
                key={tab}
                className={`cellar-filter-btn ${activeFilter === tab ? 'active' : ''}`}
                onClick={() => setActiveFilter(tab)}
              >
                {tab}{counts[tab] > 0 ? ` (${counts[tab]})` : ''}
              </button>
            ))}
          </div>

          {/* ── Search Bar ── */}
          <div className="cellar-search">
            <FiSearch className="cellar-search-icon" />
            <input
              type="text"
              placeholder="Search your cellar..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="cellar-search-input"
            />
          </div>

          {/* ── Wine Cards Grid ── */}
          {loading ? (
            <div className="cellar-grid">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} style={{ background: 'var(--surface-inverse)', borderRadius: '14px', border: '1px solid var(--border-on-dark-strong)', overflow: 'hidden', padding: '14px' }}>
                  <LoaderSkeleton width="100%" height={165} borderRadius={8} baseColor="var(--text-strong)" highlightColor="rgba(201, 170, 124, 0.15)" />
                  <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <LoaderSkeleton width="70%" height={18} borderRadius={4} baseColor="var(--text-strong)" highlightColor="rgba(201, 170, 124, 0.15)" />
                    <LoaderSkeleton width="45%" height={12} borderRadius={4} baseColor="var(--text-strong)" highlightColor="rgba(201, 170, 124, 0.15)" />
                    <LoaderSkeleton width="55%" height={12} borderRadius={4} baseColor="var(--text-strong)" highlightColor="rgba(201, 170, 124, 0.15)" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="cellar-empty">
              <GiWineBottle />
              <p>No wines match your search.</p>
              <button onClick={() => { setQuery(''); setActiveFilter('All'); }}>
                Clear filters
              </button>
            </div>
          ) : (
            <div className="cellar-grid">
              {filtered.map(bottle => (
                <article key={bottle.id} className="cellar-card">
                  {/* bottle image */}
                  <div className="cellar-card-image-wrap">
                    <img
                      src={bottle.image}
                      alt={bottle.name}
                      className="cellar-card-img"
                      onError={e => {
                        e.target.src = 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=400&q=80';
                      }}
                    />
                    <span className={`cellar-badge ${COLOR_BADGE[bottle.color] || 'cellar-badge--red'}`}>
                      {bottle.color}
                    </span>
                    {/* 3-dot menu */}
                    <div className="cellar-card-menu-wrap">
                      <button
                        className="cellar-card-menu-btn"
                        onClick={() => setMenuOpenId(menuOpenId === bottle.id ? null : bottle.id)}
                        aria-label="Options"
                      >
                        <FiMoreVertical />
                      </button>
                      {menuOpenId === bottle.id && (
                        <div className="cellar-dropdown" ref={menuRef}>
                          <button onClick={() => { if (onMenu) onMenu(); setMenuOpenId(null); }}>
                            <FiExternalLink /> View in menu
                          </button>
                          <button className="danger" onClick={() => handleRemove(bottle.id)}>
                            <FiTrash2 /> Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* card info */}
                  <div className="cellar-card-info">
                    <h3 className="cellar-card-name">{bottle.name}</h3>
                    <p className="cellar-card-subname">{bottle.subname}</p>
                    <div className="cellar-card-meta">
                      <span className="cellar-card-meta-region">
                        <FiMapPin /> {bottle.region}
                      </span>
                      <span className="cellar-card-divider">|</span>
                      <span className="cellar-card-vintage">{bottle.vintage}</span>
                    </div>
                    <span className="cellar-card-rule" />
                    <p className="cellar-card-added">Added on: {bottle.addedOn}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <aside className="cellar-sidebar">
          {/* Cellar Summary */}
          <div className="cellar-summary-card">
            <h2 className="cellar-sidebar-heading">Cellar Summary</h2>
            <div className="cellar-summary-stats">
              <div className="cellar-stat">
                <GiWineBottle className="cellar-stat-icon" />
                <div>
                  <strong>{bottles.length}</strong>
                  <span>Total Bottles</span>
                </div>
              </div>
              <div className="cellar-stat">
                <PiWineFill className="cellar-stat-icon red" />
                <div>
                  <strong>{counts.Red}</strong>
                  <span>Red Wines</span>
                </div>
              </div>
              <div className="cellar-stat">
                <PiWineFill className="cellar-stat-icon white" />
                <div>
                  <strong>{counts.White}</strong>
                  <span>White Wines</span>
                </div>
              </div>
              <div className="cellar-stat">
                <PiWineFill className="cellar-stat-icon rose" />
                <div>
                  <strong>{counts.Rosé}</strong>
                  <span>Rosé Wines</span>
                </div>
              </div>
            </div>
          </div>

          {/* Next Pour */}
          {nextPour && (
            <div className="cellar-next-pour">
              <h2 className="cellar-sidebar-heading">Your Next Pour</h2>
              <div className="cellar-next-pour-card">
                <img
                  src={nextPour.image}
                  alt={nextPour.name}
                  className="cellar-next-pour-img"
                  onError={e => {
                    e.target.src = 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=400&q=80';
                  }}
                />
                <div className="cellar-next-pour-info">
                  <strong>{nextPour.name}</strong>
                  <span>{nextPour.subname}</span>
                  <span>{nextPour.vintage}</span>
                </div>
              </div>
              <button className="cellar-next-pour-btn" onClick={onMenu}>
                View Details <FiExternalLink />
              </button>
            </div>
          )}

          {/* Quote */}
          <div className="cellar-quote-card">
            <p className="cellar-quote">{quote}</p>
            <span className="cellar-quote-rule" />
            <div className="cellar-estate-icon">
              <GiWineBottle />
              <GiWineBottle />
              <GiWineBottle />
            </div>
          </div>
        </aside>
      </div>

      {/* ── Mobile Sticky Summary Bar ── */}
      <div className="cellar-mobile-summary">
        <div className="cellar-mobile-summary-inner">
          <GiWineBottle className="cellar-mobile-summary-icon" />
          <span className="cellar-mobile-summary-label">Cellar Summary</span>
          <div className="cellar-mobile-stats">
            <span><strong>{bottles.length}</strong> Total</span>
            <span><strong>{counts.Red}</strong> Red</span>
            <span><strong>{counts.White}</strong> White</span>
            <span><strong>{counts.Rosé}</strong> Rosé</span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Cellar;
