import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Wine,
  Star,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  MapPin,
  Search,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  BookOpen,
  Tag,
  Filter,
  CalendarDays,
  ShoppingBag
} from 'lucide-react';
import useWineCellar from '../../components/wines/useWineCellar';
import AccountRequiredModal from '../../components/ui/AccountRequiredModal';
import { useToast } from '../../contexts/ToastContext';
import { WineCardSkeleton } from '../../components/ui/loaders-skeleton';
import './styles/wines.css';

// Stylized realistic Italian Wine Bottle Graphic for wines without direct photos
const WineBottleGraphic = ({ wine, size = 'card' }) => {
  const isModal = size === 'modal';
  const isSibling = size === 'sibling';
  const width = isModal ? 120 : isSibling ? 46 : 82;
  const height = isModal ? 370 : isSibling ? 96 : 190;
  const color = (wine?.color || '').toLowerCase();

  // Bottle artwork colours. These stay literal hex rather than theme tokens on
  // purpose: a wine bottle is a physical object, with dark glass, a metallic
  // capsule, and a cream label printed with ink. Driving them from --surface-*
  // and --text-* tokens collapsed the glass and the label to the same near-black
  // under the dark theme, which erased the illustration. These are the original
  // artwork values, so the bottle looks the same in both schemes.
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

// Chateau254 Brand-Themed Custom Dropdown Component
const WineDropdown = ({
  label,
  icon: Icon,
  value,
  onChange,
  options,
  placeholder = 'Select...',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];
  const isFiltered = value && value !== 'All' && value !== '';

  return (
    <div className={`wine-dropdown-wrap ${isFiltered ? 'is-active' : ''}`} ref={dropdownRef}>
      <label className="wine-dropdown-label">
        {Icon && <Icon size={13} className="wine-dropdown-label-icon" />}
        <span>{label}</span>
        {isFiltered && <span className="wine-dropdown-active-dot" />}
      </label>

      <button
        type="button"
        className={`wine-dropdown-trigger ${isOpen ? 'open' : ''} ${isFiltered ? 'active-filter' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
      >
        <span className="wine-dropdown-selected-text">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        {selectedOption?.count != null && (
          <span className="wine-dropdown-count-pill">{selectedOption.count}</span>
        )}
        <ChevronDown
          size={16}
          className={`wine-dropdown-chevron ${isOpen ? 'rotated' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="wine-dropdown-menu">
          <ul className="wine-dropdown-list">
            {options.map((opt) => {
              const isSelected = opt.value === value || (!value && opt.value === '');
              return (
                <li
                  key={opt.value}
                  className={`wine-dropdown-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                >
                  <span className="wine-dropdown-item-label">{opt.label}</span>
                  {opt.sub && <span className="wine-dropdown-item-sub">{opt.sub}</span>}
                  {opt.count != null && (
                    <span className="wine-dropdown-item-count">
                      {opt.count}
                    </span>
                  )}
                  {isSelected && <Check size={14} className="wine-dropdown-check" />}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
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

const WinesPage = ({ user, addToCart, addDineInItem, onGoToReservations, onRequireAuth, reservationCount = 0 }) => {
  const { addToast } = useToast();
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState('all');
  const [selectedProducer, setSelectedProducer] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState('All');
  const [selectedGrape, setSelectedGrape] = useState('All');
  const [selectedWine, setSelectedWine] = useState(null);
  const [siblingIndex, setSiblingIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  /* Reads the `wines` table via /api/menu?type=wine and reshapes each row into
     the producer/collection structure this page already renders. Previously the
     catalogue came from three JSON files bundled into the build, so an image
     uploaded through the admin menu never showed up here. */
  const { wines: allWines, loading, error, reload } = useWineCellar();

  /* A bottle can be either bought to take away or reserved for the table, so the
     card carries both actions. Reserve joins the same list dine-in plates use,
     which the booking page picks up; order goes to the takeout cart. The two are
     kept as separate callbacks so a reservation is never priced as an order. */
  const reserveWine = (wine) => {
    /* Reservations need an account, so a guest is prompted to sign in instead
       of silently losing the bottle they picked. */
    if (!user) {
      setAuthPromptOpen(true);
      return;
    }
    if (!addDineInItem) return;
    addDineInItem({
      id: wine.id,
      name: wine.name,
      price: wine.price,
      image: wine.image,
      menuType: 'wine',
      quantity: 1,
    });
    addToast(`${wine.name} reserved for your table`, 'success');
  };

  const orderWine = (wine) => {
    if (!addToCart) return;
    addToCart({
      id: wine.id,
      name: wine.name,
      price: wine.price,
      image: wine.image,
      description: wine.backstory,
      menuType: 'wine',
      quantity: 1,
    });
  };

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

  const grapes = useMemo(() => {
    const grapeSet = new Set();
    allWines.forEach(wine => {
      if (wine.grape) {
        // Split by comma and clean up each grape
        wine.grape.split(',').forEach(g => {
          const cleaned = g.trim();
          if (cleaned) grapeSet.add(cleaned);
        });
      }
    });
    return ['All', ...Array.from(grapeSet).sort()];
  }, [allWines]);

  const regionOptions = useMemo(() => {
    return regions.map(r => ({
      value: r,
      label: r === 'All' ? 'All Regions' : r
    }));
  }, [regions]);

  const grapeOptions = useMemo(() => {
    return grapes.map(g => ({
      value: g,
      label: g === 'All' ? 'All Grapes' : g
    }));
  }, [grapes]);

  const producerOptions = useMemo(() => {
    const allOption = { value: '', label: 'All Producers', count: allWines.length };
    const list = producers.map(p => {
      const flags = [
        p.collections.includes('italian') ? '🇮🇹' : '',
        p.collections.includes('south-african') ? '🇿🇦' : '',
        p.collections.includes('french') ? '🇫🇷' : ''
      ].filter(Boolean).join(' ');

      return {
        value: p.name,
        label: p.name,
        count: p.wineCount,
        sub: flags || null
      };
    });
    return [allOption, ...list];
  }, [producers, allWines.length]);

  const filteredWines = useMemo(() => {
    return allWines.filter(wine => {
      const matchesSearch = wine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wine.producer.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRegion = selectedRegion === 'All' ||
        wine.producerRegion.includes(selectedRegion);
      const matchesGrape = selectedGrape === 'All' ||
        (wine.grape && wine.grape.split(',').map(g => g.trim()).includes(selectedGrape));
      const matchesProducer = !selectedProducer || wine.producer === selectedProducer;
      const matchesCollection = selectedCollection === 'all' || wine.collection === selectedCollection;
      return matchesSearch && matchesRegion && matchesGrape && matchesProducer && matchesCollection;
    });
  }, [allWines, searchTerm, selectedRegion, selectedGrape, selectedProducer, selectedCollection]);

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
        <div className="wines-header-main">
          <h1 className="wines-header-title">
            <Wine size={32} /> Chateau Wine Collection
          </h1>
          <p className="wines-header-subtitle">
            {allWines.length} wines from {producers.length} producers across Italy, South Africa & France
          </p>
        </div>
        {/* Reservations started here sit in the same list as dine-in plates, so
            this reaches the booking page with everything already attached. */}
        {onGoToReservations && (
          <button type="button" className="wine-reservations-link" onClick={onGoToReservations}>
            <CalendarDays size={15} />
            My Reservations
            {reservationCount > 0 && <span className="wine-reservations-count">{reservationCount}</span>}
          </button>
        )}
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

        <WineDropdown
          label="Region"
          icon={MapPin}
          value={selectedRegion}
          onChange={(val) => setSelectedRegion(val)}
          options={regionOptions}
          placeholder="All Regions"
        />

        <WineDropdown
          label="Grape"
          icon={Filter}
          value={selectedGrape}
          onChange={(val) => setSelectedGrape(val)}
          options={grapeOptions}
          placeholder="All Grapes"
        />

        <WineDropdown
          label="Producer"
          icon={Wine}
          value={selectedProducer || ''}
          onChange={(val) => setSelectedProducer(val || null)}
          options={producerOptions}
          placeholder="All Producers"
        />

        <button
          type="button"
          onClick={() => { setSearchTerm(''); setSelectedRegion('All'); setSelectedGrape('All'); setSelectedProducer(null); setSelectedCollection('all'); }}
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
          <button
            type="button"
            className={`wines-collection-btn ${selectedCollection === 'french' ? 'active' : ''}`}
            onClick={() => setSelectedCollection('french')}
          >
            <span className="wines-collection-icon">🇫🇷</span>
            <span className="wines-collection-name">French</span>
            <span className="wines-collection-count">({allWines.filter(w => w.collection === 'french').length})</span>
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            margin: '0 0 24px',
            padding: '12px 16px',
            borderLeft: '3px solid var(--danger, #b4453a)',
            background: 'var(--danger-tint, rgba(180,69,58,.12))',
            color: 'var(--text, inherit)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={reload}
            style={{
              background: 'transparent',
              border: '1px solid currentColor',
              borderRadius: '999px',
              color: 'inherit',
              cursor: 'pointer',
              font: 'inherit',
              fontSize: '13px',
              padding: '6px 14px',
            }}
          >
            Try again
          </button>
        </div>
      )}

      {/* Wine Grid */}
      <div style={{ marginTop: '20px' }}>
        <h2 style={{ marginBottom: '16px', color: 'var(--text-strong)', fontSize: '20px', fontWeight: 700 }}>
          {selectedProducer ? `Wines from ${selectedProducer}` : selectedRegion !== 'All' ? `Wines from ${selectedRegion}` : selectedCollection === 'italian' ? 'Italian Wines' : selectedCollection === 'south-african' ? 'South African Wines' : selectedCollection === 'french' ? 'French Wines' : 'All Wines'}
          <span style={{ fontWeight: 400, fontSize: '16px', color: 'var(--text-muted)', marginLeft: '10px' }}>
            ({filteredWines.length})
          </span>
        </h2>

        {loading ? (
          <div className="wines-grid">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <WineCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredWines.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '18px', marginBottom: '8px', fontWeight: 600 }}>
              {error ? 'The cellar is unavailable' : 'No wines found'}
            </p>
            <p>{error ? 'Please check your connection and try again.' : 'Try adjusting your search query or region filter'}</p>
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
                  {wine.grape && (
                    <div className="wine-card-grape">
                      <span className="wine-grape-label">
                        <Wine size={10} /> Grape:
                      </span>
                      <span 
                        className="wine-grape-value clickable"
                        onClick={(e) => {
                          e.stopPropagation();
                          const firstGrape = wine.grape.split(',')[0].trim();
                          setSelectedGrape(firstGrape);
                        }}
                        title="Click to filter by this grape"
                      >
                        {wine.grape}
                      </span>
                    </div>
                  )}
                  {/* Shows the same `price` the admin menu edits. The catalogue
                      range (price_range_kes) came from the source JSON and was
                      never reconciled with the sellable price, so showing both
                      put two different prices on one card. */}
                  {wine.price > 0 && (
                    <div className="wine-card-price">
                      <Tag size={11} className="wine-price-icon" />
                      <span>KES {wine.price.toLocaleString()}</span>
                    </div>
                  )}
                  {wine.producerIndex > 0 && (
                    <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                      {wine.producerIndex + 1} of {wine.siblings.length} from {wine.producer}
                    </div>
                  )}
                  {/* Reserve for the table, or order to take away. stopPropagation
                      keeps the card's own click -- which opens the detail modal --
                      from firing underneath either action. */}
                  <div className="wine-card-actions" onClick={(event) => event.stopPropagation()}>
                    <button
                      type="button"
                      className="wine-action wine-action-reserve"
                      onClick={() => reserveWine(wine)}
                      disabled={!wine.price}
                      title={wine.price ? 'Reserve this bottle for your table' : 'No price set yet'}
                    >
                      <CalendarDays size={13} />
                      Reserve
                    </button>
                    <button
                      type="button"
                      className="wine-action wine-action-order"
                      onClick={() => orderWine(wine)}
                      disabled={!wine.price}
                      title={wine.price ? 'Add to cart to take away' : 'No price set yet'}
                    >
                      <ShoppingBag size={13} />
                      Order
                    </button>
                  </div>
                  {!wine.price && (
                    <div className="wine-card-unpriced">Price not set — contact the team to reserve</div>
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
                              background: 'var(--surface-subtle)',
                              color: 'var(--danger-edge-ink)',
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

                {/* Grape & Price */}
                {(selectedWine.grape || selectedWine.price > 0) && (
                  <div className="wine-grape-price-row">
                    {selectedWine.grape && (
                      <div className="wine-info-card wine-grape-card">
                        <div className="wine-info-card-header">
                          <Wine size={14} />
                          <span>Grape Type</span>
                        </div>
                        <p className="wine-info-card-value clickable"
                           onClick={() => {
                             const firstGrape = selectedWine.grape.split(',')[0].trim();
                             setSelectedGrape(firstGrape);
                             closeDetail();
                           }}
                           title="Click to filter by this grape">
                          {selectedWine.grape}
                        </p>
                      </div>
                    )}
                    {/* The admin-managed price, so the detail view can never
                        quote a different figure from the card or the checkout. */}
                    {selectedWine.price > 0 && (
                      <div className="wine-info-card wine-price-card">
                        <div className="wine-info-card-header">
                          <Tag size={14} />
                          <span>Price</span>
                        </div>
                        <p className="wine-info-card-value">
                          KES {selectedWine.price.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                )}

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
                            <span style={{ color: 'var(--danger-edge-ink)', fontWeight: 700 }}>
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
                        <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: 1.5 }}>
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

      <AccountRequiredModal
        open={authPromptOpen}
        onClose={() => setAuthPromptOpen(false)}
        onSignIn={() => { setAuthPromptOpen(false); onRequireAuth?.(); }}
        action="item"
      />
    </div>
  );
};

export default WinesPage;