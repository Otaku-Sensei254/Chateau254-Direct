import React, { useState, useMemo, useEffect } from 'react';
import { 
  Wine, 
  Star, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  MapPin, 
  Search, 
  RotateCcw,
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  BookOpen
} from 'lucide-react';
import italianWinesData from '../../components/data/italian_wines_producer_grouped.json';
import southAfricanWinesData from '../../components/data/chateau_south_african_wines.json';
import './styles/wines.css';

// Stylized realistic Italian Wine Bottle Graphic for wines without direct photos
const WineBottleGraphic = ({ wine, size = 'card' }) => {
  const isModal = size === 'modal';
  const isSibling = size === 'sibling';
  const width = isModal ? 120 : isSibling ? 46 : 82;
  const height = isModal ? 370 : isSibling ? 96 : 190;
  const color = (wine?.color || '').toLowerCase();

  // Choose bottle glass color & capsule colors based on wine color
  let glassDark = '#1b0c10';
  let glassLight = '#3e1622';
  let foilDark = '#5e1022';
  let foilLight = '#921c35';
  let foilAccent = '#d4af37'; // gold
  let labelAccent = '#761329';

  if (color.includes('white')) {
    glassDark = '#1b2615';
    glassLight = '#3b4e2f';
    foilDark = '#8c7025';
    foilLight = '#cca029';
    foilAccent = '#fde29e';
    labelAccent = '#8c7025';
  } else if (color.includes('ros')) {
    glassDark = '#3d1825';
    glassLight = '#6d2941';
    foilDark = '#963d58';
    foilLight = '#cb597a';
    foilAccent = '#f3c4d1';
    labelAccent = '#963d58';
  } else if (color.includes('spark')) {
    glassDark = '#132115';
    glassLight = '#2c402d';
    foilDark = '#96741b';
    foilLight = '#d4af37';
    foilAccent = '#fff2b3';
    labelAccent = '#96741b';
  }

  // Safe unique prefix for gradients
  const uid = `wb-${(wine?.producer || 'p')}-${(wine?.name || 'n')}-${size}`.replace(/[^a-zA-Z0-9]/g, '');

  // Sanitize wine title and producer for label
  const producerShort = (wine?.producer || 'RESERVA').toUpperCase().slice(0, 16);
  const wineNameShort = (wine?.name || 'Vino Italiano')
    .replace(wine?.producer || '', '')
    .trim()
    .slice(0, 22) || 'Selezione';

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 100 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="wine-svg-bottle"
      aria-hidden="true"
    >
      <defs>
        {/* Glass Gradient */}
        <linearGradient id={`glass-${uid}`} x1="20" y1="0" x2="80" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={glassDark} />
          <stop offset="25%" stopColor={glassLight} />
          <stop offset="52%" stopColor={glassDark} />
          <stop offset="85%" stopColor={glassLight} />
          <stop offset="100%" stopColor={glassDark} />
        </linearGradient>

        {/* Foil Capsule Gradient */}
        <linearGradient id={`foil-${uid}`} x1="38" y1="0" x2="62" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={foilDark} />
          <stop offset="35%" stopColor={foilLight} />
          <stop offset="70%" stopColor={foilDark} />
          <stop offset="100%" stopColor={foilLight} />
        </linearGradient>

        {/* Glass Specular Glare */}
        <linearGradient id={`spec-${uid}`} x1="26" y1="0" x2="33" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.38" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.04" />
        </linearGradient>

        {/* Label Background */}
        <linearGradient id={`lbl-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fdfbf7" />
          <stop offset="100%" stopColor="#eee7dc" />
        </linearGradient>
      </defs>

      {/* Ground Shadow */}
      <ellipse cx="50" cy="286" rx="32" ry="7" fill="rgba(33, 29, 27, 0.22)" />

      {/* Main Bottle Body & Neck */}
      <path
        d="M 42 16
           L 42 58
           C 42 75 22 95 22 120
           L 22 272
           C 22 278 26 282 32 282
           L 68 282
           C 74 282 78 278 78 272
           L 78 120
           C 78 95 58 75 58 58
           L 58 16
           Z"
        fill={`url(#glass-${uid})`}
      />

      {/* Specular Glare Highlight */}
      <path
        d="M 44 20 L 44 56 C 44 72 26 92 26 118 L 26 270 C 26 271 27 272 28 272 L 31 272 L 31 118 C 31 93 47 73 47 56 L 47 20 Z"
        fill={`url(#spec-${uid})`}
      />

      {/* Capsule / Foil Top */}
      <path
        d="M 41 12
           C 41 10 43 9 46 9
           L 54 9
           C 57 9 59 10 59 12
           L 59 55
           C 59 56 57 58 55 58
           L 45 58
           C 43 58 41 56 41 55
           Z"
        fill={`url(#foil-${uid})`}
      />
      {/* Foil Ring Accent */}
      <rect x="41" y="48" width="18" height="2" fill={foilAccent} opacity="0.9" />
      <rect x="41" y="24" width="18" height="1.5" fill={foilAccent} opacity="0.65" />

      {/* Wine Label */}
      <rect
        x="26"
        y="134"
        width="48"
        height="86"
        rx="3"
        fill={`url(#lbl-${uid})`}
        stroke="#ded6c9"
        strokeWidth="0.8"
      />
      {/* Label Inner Inset Border */}
      <rect
        x="28.5"
        y="136.5"
        width="43"
        height="81"
        rx="2"
        fill="none"
        stroke={labelAccent}
        strokeWidth="0.6"
        opacity="0.4"
      />

      {/* Label Coat-of-Arms / Crest Emblem */}
      <path
        d="M 50 143
           L 53 147 L 50 152 L 47 147 Z"
        fill={foilAccent}
      />
      <circle cx="50" cy="148" r="1.2" fill={labelAccent} />

      {/* Producer Text on Label */}
      <text
        x="50"
        y="160"
        fontFamily="Georgia, serif"
        fontSize="5"
        fontWeight="bold"
        fill="#2c2724"
        textAnchor="middle"
        letterSpacing="0.4"
      >
        {producerShort}
      </text>

      {/* Decorative divider on label */}
      <line x1="36" y1="164" x2="64" y2="164" stroke={foilAccent} strokeWidth="0.5" />

      {/* Wine Name on Label */}
      <text
        x="50"
        y="173"
        fontFamily="-apple-system, sans-serif"
        fontSize="4.8"
        fontWeight="600"
        fill={labelAccent}
        textAnchor="middle"
      >
        {wineNameShort.slice(0, 12)}
      </text>
      {wineNameShort.length > 12 && (
        <text
          x="50"
          y="179"
          fontFamily="-apple-system, sans-serif"
          fontSize="4.5"
          fontWeight="500"
          fill="#4a423d"
          textAnchor="middle"
        >
          {wineNameShort.slice(12, 24)}
        </text>
      )}

      {/* Vintage / Classification on Label */}
      <text
        x="50"
        y="194"
        fontFamily="Georgia, serif"
        fontSize="3.8"
        letterSpacing="0.8"
        fill="#8a8076"
        textAnchor="middle"
      >
        ITALIA
      </text>
      <text
        x="50"
        y="200"
        fontFamily="-apple-system, sans-serif"
        fontSize="3.4"
        fontWeight="600"
        letterSpacing="0.5"
        fill={foilAccent}
        textAnchor="middle"
      >
        ★ D.O.C. ★
      </text>

      {/* Right Edge Reflection */}
      <path
        d="M 75 125 L 75 270"
        stroke="#ffffff"
        strokeWidth="1.2"
        strokeOpacity="0.12"
        strokeLinecap="round"
      />
    </svg>
  );
};

// Reusable Wine Bottle Thumbnail Component (Real Image with Graceful SVG Fallback)
const WineBottleThumb = ({ wine, size = 'card', className = '' }) => {
  const [hasError, setHasError] = useState(false);
  const src = wine?.image;

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const isInvalidUrl = !src || src.includes('Special:MediaSearch') || src.includes('/w/index.php?search=');

  if (isInvalidUrl || hasError) {
    return <WineBottleGraphic wine={wine} size={size} />;
  }

  return (
    <img
      src={src}
      alt={wine?.name || 'Wine bottle'}
      className={className}
      onError={() => setHasError(true)}
      loading="lazy"
    />
  );
};

const getColorBadgeClass = (color) => {
  const c = (color || '').toLowerCase();
  if (c.includes('red')) return 'color-red';
  if (c.includes('white')) return 'color-white';
  if (c.includes('ros')) return 'color-rose';
  if (c.includes('spark')) return 'color-sparkling';
  return 'color-red';
};

const getConfidenceBadgeClass = (confidence) => {
  switch (confidence) {
    case 'confirmed': return 'confidence-confirmed';
    case 'likely': return 'confidence-likely';
    case 'unconfirmed': return 'confidence-unconfirmed';
    default: return '';
  }
};

const WinesPage = () => {
  const [selectedCollection, setSelectedCollection] = useState('all');
  const [selectedProducer, setSelectedProducer] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState('All');
  const [selectedWine, setSelectedWine] = useState(null);
  const [siblingIndex, setSiblingIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const collections = useMemo(() => [
    { id: 'italian', name: 'Italian Wines', icon: '🇮🇹', data: italianWinesData },
    { id: 'south-african', name: 'South African Wines', icon: '🇿🇦', data: southAfricanWinesData }
  ], []);

  // Merge all wines from both collections into one unified list
  const allWines = useMemo(() => {
    const wines = [];
    collections.forEach(collection => {
      collection.data.producers.forEach(producer => {
        producer.wines.forEach((wine, idx) => {
          wines.push({
            ...wine,
            producer: producer.producer,
            producerRegion: producer.producer_region,
            producerIndex: idx,
            siblings: producer.wines,
            collection: collection.id
          });
        });
      });
    });
    return wines;
  }, [collections]);

  const producers = useMemo(() => {
    const producerMap = new Map();
    allWines.forEach(wine => {
      if (!producerMap.has(wine.producer)) {
        producerMap.set(wine.producer, {
          name: wine.producer,
          region: wine.producerRegion,
          wineCount: 0,
          collections: new Set()
        });
      }
      const p = producerMap.get(wine.producer);
      p.wineCount++;
      p.collections.add(wine.collection);
    });
    return Array.from(producerMap.values()).map(p => ({
      ...p,
      collections: Array.from(p.collections)
    }));
  }, [allWines]);

  const regions = useMemo(() => {
    const regionSet = new Set();
    allWines.forEach(wine => {
      const region = wine.producerRegion.split(',')[0].trim();
      regionSet.add(region);
    });
    return ['All', ...Array.from(regionSet).sort()];
  }, [allWines]);

  const filteredWines = useMemo(() => {
    return allWines.filter(wine => {
      const matchesSearch = wine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           wine.producer.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRegion = selectedRegion === 'All' || 
                           wine.producerRegion.includes(selectedRegion);
      const matchesProducer = !selectedProducer || wine.producer === selectedProducer;
      const matchesCollection = selectedCollection === 'all' || wine.collection === selectedCollection;
      return matchesSearch && matchesRegion && matchesProducer && matchesCollection;
    });
  }, [allWines, searchTerm, selectedRegion, selectedProducer, selectedCollection]);

  const handleWineClick = (wine) => {
    setSelectedWine(wine);
    setSiblingIndex(wine.producerIndex);
  };

  const navigateSibling = (direction) => {
    if (!selectedWine) return;
    const siblings = selectedWine.siblings;
    const newIndex = (siblingIndex + direction + siblings.length) % siblings.length;
    setSiblingIndex(newIndex);
    setSelectedWine({ ...selectedWine, ...siblings[newIndex], producerIndex: newIndex });
  };

  const closeDetail = () => {
    setSelectedWine(null);
    setSiblingIndex(0);
  };

  // Close modal on Escape key and prevent background scroll
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeDetail();
      }
    };
    if (selectedWine) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [selectedWine]);

  return (
    <div className="wines-page">
      <header className="wines-header">
        <h1 className="wines-header-title">
          <Wine size={32} /> Chateau Wine Collection
        </h1>
        <p className="wines-header-subtitle">
          {allWines.length} wines from {producers.length} producers across Italy & South Africa
        </p>
      </header>

      {/* Filters */}
      <div className="wines-filters">
        <div className="wines-filter-group search">
          <label className="wines-filter-label">
            <Search size={14} /> Search Wine
          </label>
          <div className="wines-input-wrap">
            <Search size={16} className="wines-input-icon" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by wine name or producer..."
              className="wines-search-input"
            />
          </div>
        </div>

        <div className="wines-filter-group select">
          <label className="wines-filter-label">
            <MapPin size={14} /> Region
          </label>
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="wines-select"
          >
            {regions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div className="wines-filter-group select">
          <label className="wines-filter-label">
            <Wine size={14} /> Producer
          </label>
          <select
            value={selectedProducer || ''}
            onChange={(e) => setSelectedProducer(e.target.value || null)}
            className="wines-select"
          >
            <option value="">All Producers</option>
            {producers.map(p => (
              <option key={p.name} value={p.name}>
                {p.name} ({p.wineCount}) {p.collections.includes('italian') ? '🇮🇹' : ''} {p.collections.includes('south-african') ? '🇿🇦' : ''}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => { setSearchTerm(''); setSelectedRegion('All'); setSelectedProducer(null); setSelectedCollection('all'); }}
          className="wines-clear-btn"
          title="Reset filters"
        >
          <RotateCcw size={14} /> Clear Filters
        </button>
      </div>

      {/* Collection Filter Buttons */}
      <div className="wines-collection-filter">
        <span className="wines-collection-filter-label">Collection:</span>
        <div className="wines-collection-buttons">
          <button
            type="button"
            className={`wines-collection-btn ${selectedCollection === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedCollection('all')}
          >
            <span className="wines-collection-icon">🌍</span>
            <span className="wines-collection-name">All Wines</span>
            <span className="wines-collection-count">({allWines.length})</span>
          </button>
          <button
            type="button"
            className={`wines-collection-btn ${selectedCollection === 'italian' ? 'active' : ''}`}
            onClick={() => setSelectedCollection('italian')}
          >
            <span className="wines-collection-icon">🇮🇹</span>
            <span className="wines-collection-name">Italian</span>
            <span className="wines-collection-count">({allWines.filter(w => w.collection === 'italian').length})</span>
          </button>
          <button
            type="button"
            className={`wines-collection-btn ${selectedCollection === 'south-african' ? 'active' : ''}`}
            onClick={() => setSelectedCollection('south-african')}
          >
            <span className="wines-collection-icon">🇿🇦</span>
            <span className="wines-collection-name">South African</span>
            <span className="wines-collection-count">({allWines.filter(w => w.collection === 'south-african').length})</span>
          </button>
        </div>
      </div>

      {/* Wine Grid */}
      <div style={{ marginTop: '20px' }}>
        <h2 style={{ marginBottom: '16px', color: '#211d1b', fontSize: '20px', fontWeight: 700 }}>
          {selectedProducer ? `Wines from ${selectedProducer}` : selectedRegion !== 'All' ? `Wines from ${selectedRegion}` : selectedCollection === 'italian' ? 'Italian Wines' : selectedCollection === 'south-african' ? 'South African Wines' : 'All Wines'}
          <span style={{ fontWeight: 400, fontSize: '16px', color: '#746c65', marginLeft: '10px' }}>
            ({filteredWines.length})
          </span>
        </h2>

        {filteredWines.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#888' }}>
            <p style={{ fontSize: '18px', marginBottom: '8px', fontWeight: 600 }}>No wines found</p>
            <p>Try adjusting your search query or region filter</p>
          </div>
        ) : (
          <div className="wines-grid">
            {filteredWines.map((wine) => (
              <div
                key={`${wine.producer}-${wine.name}`}
                onClick={() => handleWineClick(wine)}
                className="wine-card"
              >
                <div className="wine-card-thumb">
                  <WineBottleThumb
                    wine={wine}
                    size="card"
                  />
                  <div className={`wine-card-badge ${getColorBadgeClass(wine.color)}`}>
                    {wine.color}
                  </div>
                </div>
                <div className="wine-card-info">
                  <div className="wine-card-header-row">
                    <p className="wine-card-producer">{wine.producer}</p>
                    <span className="wine-card-region-pill">{wine.producerRegion.split(',')[0]}</span>
                  </div>
                  <h3 className="wine-card-title">{wine.name}</h3>
                  <div className="wine-card-meta">
                    <span className="wine-card-category-badge">
                      {wine.category_filter}
                    </span>
                    {wine.rating?.found && (
                      <span className="wine-badge rating" style={{ padding: '2px 8px', fontSize: '11px' }}>
                        <Star size={11} fill="currentColor" /> {wine.rating.score}
                      </span>
                    )}
                    <span
                      className={`wine-badge ${getConfidenceBadgeClass(wine.confidence)}`}
                      style={{ padding: '2px 8px', fontSize: '11px', marginLeft: 'auto' }}
                    >
                      {wine.confidence}
                    </span>
                  </div>
                  {wine.producerIndex > 0 && (
                    <div style={{ marginTop: '8px', fontSize: '11px', color: '#8c8278' }}>
                      {wine.producerIndex + 1} of {wine.siblings.length} from {wine.producer}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Wine Detail Modal ("View Item") */}
      {selectedWine && (
        <div
          className="wine-modal-overlay"
          onClick={closeDetail}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="wine-modal-container"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with close */}
            <div className="wine-modal-header">
              <div className="wine-modal-header-text">
                <p className="wine-modal-producer">
                  {selectedWine.producer}
                </p>
                <h2 className="wine-modal-title">
                  {selectedWine.name}
                </h2>
              </div>
              <button
                type="button"
                className="wine-modal-close"
                onClick={closeDetail}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content: Balanced bottle showcase + spacious right info column */}
            <div className="wine-modal-body">
              {/* Left Column: Focused Bottle Showcase & Sibling Carousel */}
              <div className="wine-showcase-column">
                {/* Main Image Box */}
                <div className="wine-main-thumb-box">
                  <WineBottleThumb
                    wine={selectedWine}
                    size="modal"
                  />
                </div>

                {/* Sibling Carousel */}
                {selectedWine.siblings.length > 1 && (
                  <div className="wine-siblings-wrap">
                    <div className="wine-siblings-header">
                      <h4 className="wine-siblings-title">
                        <Wine size={14} /> More from {selectedWine.producer}
                      </h4>
                      <span className="wine-siblings-badge">
                        {selectedWine.siblings.length} wines
                      </span>
                    </div>

                    <div className="wine-siblings-carousel">
                      {selectedWine.siblings.map((sib, idx) => (
                        <button
                          key={`${selectedWine.producer}-${sib.name}`}
                          type="button"
                          onClick={() => navigateSibling(idx - siblingIndex)}
                          className={`wine-sibling-card ${idx === siblingIndex ? 'active' : ''}`}
                          title={sib.name}
                        >
                          <div className="wine-sibling-thumb">
                            <WineBottleThumb
                              wine={sib}
                              size="sibling"
                            />
                          </div>
                          <p className="wine-sibling-name">{sib.name}</p>
                          <p className="wine-sibling-sub">
                            {sib.color} • {sib.category_filter}
                          </p>
                          {sib.rating?.found && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              marginTop: '4px',
                              fontSize: '10px',
                              background: '#fff7ed',
                              color: '#c2410c',
                              padding: '1px 5px',
                              borderRadius: '6px',
                              fontWeight: 700,
                              width: 'fit-content'
                            }}>
                              ★ {sib.rating.score}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Prev/Next Navigation */}
                    <div className="wine-sibling-nav">
                      <button
                        type="button"
                        className="wine-sibling-nav-btn"
                        onClick={() => navigateSibling(-1)}
                        aria-label="Previous wine"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <span className="wine-sibling-nav-count">
                        {siblingIndex + 1} / {selectedWine.siblings.length}
                      </span>
                      <button
                        type="button"
                        className="wine-sibling-nav-btn"
                        onClick={() => navigateSibling(1)}
                        aria-label="Next wine"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Information, Badges, Region & Ratings */}
              <div className="wine-details-column">
                {/* Badges */}
                <div className="wine-badges-row">
                  <span className={`wine-badge ${getColorBadgeClass(selectedWine.color)}`}>
                    <Wine size={13} />
                    {selectedWine.color}
                  </span>
                  <span className="wine-badge category">
                    {selectedWine.category_filter}
                  </span>
                  <span className={`wine-badge ${getConfidenceBadgeClass(selectedWine.confidence)}`}>
                    {selectedWine.confidence === 'confirmed' && <CheckCircle2 size={13} />}
                    {selectedWine.confidence === 'likely' && <AlertCircle size={13} />}
                    {selectedWine.confidence === 'unconfirmed' && <HelpCircle size={13} />}
                    {selectedWine.confidence}
                  </span>
                  {selectedWine.rating?.found && (
                    <span className="wine-badge rating">
                      <Star size={13} fill="currentColor" /> {selectedWine.rating.score} / {selectedWine.rating.scale}
                    </span>
                  )}
                </div>

                {/* Region */}
                <div className="wine-info-card">
                  <div className="wine-info-card-header">
                    <MapPin size={14} />
                    <span>Producer Region</span>
                  </div>
                  <p className="wine-info-card-value">
                    {selectedWine.producerRegion}
                  </p>
                </div>

                {/* Backstory */}
                <div className="wine-story-section">
                  <h3 className="wine-section-heading">
                    <BookOpen size={16} /> Story & Background
                  </h3>
                  <p className="wine-story-text">
                    {selectedWine.backstory}
                  </p>
                </div>

                {/* Rating Details */}
                {selectedWine.rating && (
                  <div className="wine-info-card">
                    <div className="wine-info-card-header">
                      <Star size={14} />
                      <span>Critic & Community Ratings</span>
                    </div>
                    <div className="wine-rating-breakdown">
                      <div className="wine-rating-row">
                        <span className="wine-rating-label">Source</span>
                        <span className="wine-rating-val">{selectedWine.rating.source}</span>
                      </div>
                      <div className="wine-rating-row">
                        <span className="wine-rating-label">Score</span>
                        <span className="wine-rating-val">
                          {selectedWine.rating.found ? (
                            <span style={{ color: '#c2410c', fontWeight: 700 }}>
                              ★ {selectedWine.rating.score} / {selectedWine.rating.scale}
                            </span>
                          ) : (
                            selectedWine.rating.score
                          )}
                        </span>
                      </div>
                      {selectedWine.rating.count && selectedWine.rating.count !== 'N/A' && (
                        <div className="wine-rating-row">
                          <span className="wine-rating-label">Reviews</span>
                          <span className="wine-rating-val">{selectedWine.rating.count}</span>
                        </div>
                      )}
                      {selectedWine.rating.reason && !selectedWine.rating.found && (
                        <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#888078', fontStyle: 'italic', lineHeight: 1.5 }}>
                          {selectedWine.rating.reason}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Source Note */}
                {selectedWine.source_note && (
                  <div className="wine-source-note">
                    <strong>Catalog Note:</strong> {selectedWine.source_note}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WinesPage;