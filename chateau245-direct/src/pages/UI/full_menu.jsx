import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiBookOpen,
  FiCalendar,
  FiSearch,
  FiX,
  FiChevronUp,
  FiTag,
} from 'react-icons/fi';
import {
  GiWineBottle,
  GiForkKnifeSpoon,
  GiCakeSlice,
  GiCoffeeCup,
  GiSparkles,
} from 'react-icons/gi';
import { RiRestaurant2Line } from 'react-icons/ri';
import { MenuCardSkeleton, LoaderSkeleton } from '../../components/ui/loaders-skeleton';
import { isTakeoutEnabled } from '../../config/features';
import { useToast } from '../../contexts/ToastContext';
import './styles/full_menu.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const parseOfferPercent = (offerText = '') => {
  const match = String(offerText).match(/(\d+(?:\.\d+)?)\s*%/);
  return match ? parseFloat(match[1]) : null;
};

const calculateOfferPrice = (price, offerText = '') => {
  const percent = parseOfferPercent(offerText);
  if (!percent) return null;
  const discounted = price * (1 - percent / 100);
  return Math.round(discounted);
};

// Category icon helper
const getCategoryIcon = (category = '') => {
  const cat = String(category).toLowerCase();
  if (cat.includes('wine') || cat.includes('cellar')) return <GiWineBottle />;
  if (cat.includes('dessert') || cat.includes('cake') || cat.includes('pastr')) return <GiCakeSlice />;
  if (cat.includes('drink') || cat.includes('beverage') || cat.includes('coffee') || cat.includes('tea')) return <GiCoffeeCup />;
  return <GiForkKnifeSpoon />;
};

const FullMenu = ({ onMakeOrder, onReserveTable, addDineInItem, onViewItem }) => {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [allItems, setAllItems] = useState([]);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryTab, setActiveCategoryTab] = useState('All');
  const [activeSection, setActiveSection] = useState(null);
  const [sortBy, setSortBy] = useState('recommended');
  const [showBackToTop, setShowBackToTop] = useState(false);

  const sectionRefs = useRef({});

  // Fetch full menu items
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/menu?all=true`);
        if (!res.ok) throw new Error('Failed to load menu');
        const data = await res.json();
        if (cancelled) return;

        const rawItems = data.items || data.menu || [];
        const items = rawItems.map((item) => ({
          ...item,
          id: item.id,
          name: item.name,
          description: item.description || '',
          price: Number(item.price) || 0,
          category: item.category || 'Other',
          subcategory: item.subcategory || item.category || 'Other',
          image: item.image || item.image_url || '',
          on_offer: Boolean(item.on_offer || item.on_Offer),
          offer: item.offer || item.on_offer_text || (item.on_offer ? 'On Offer' : null),
        }));

        setAllItems(items);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load menu');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Back to top scroll listener
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Filter & Search Items
  const filteredItems = useMemo(() => {
    let list = allItems;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((item) => {
        return (
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.subcategory.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          (item.producer && item.producer.toLowerCase().includes(q)) ||
          (item.grape && item.grape.toLowerCase().includes(q)) ||
          (item.region && item.region.toLowerCase().includes(q)) ||
          (item.country && item.country.toLowerCase().includes(q))
        );
      });
    }

    // Top Category Tab filter
    if (activeCategoryTab === 'Offers') {
      list = list.filter((item) => item.on_offer || item.offer);
    } else if (activeCategoryTab !== 'All') {
      list = list.filter((item) => item.category === activeCategoryTab);
    }

    // Sort
    if (sortBy === 'price-low') {
      list = [...list].sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      list = [...list].sort((a, b) => b.price - a.price);
    } else if (sortBy === 'name') {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [allItems, searchQuery, activeCategoryTab, sortBy]);

  // Group filtered items into structured sections
  const sections = useMemo(() => {
    const categoryOrder = ['Wine', 'Meals', 'Drinks', 'Desserts', 'Other'];
    const subcategoryOrder = {
      Wine: ['Red', 'White', 'Rosé', 'Sparkling', 'Orange', 'Dessert', 'Cellar Reserve'],
      Meals: [
        'Appetizers',
        'Soups',
        'Salads',
        'Mains',
        'Farinaceous Delicacies',
        'Chateau Classics',
        'Chateau Lunchbox',
        'Bar Bites & Sandwiches',
        'Platters & Boards',
        'Platters',
        'Desserts',
        'Beverages',
        'Fast Food',
        'Combos',
      ],
      Drinks: ['Hot', 'Cold', 'Alcoholic', 'Non-alcoholic', 'Cocktails'],
      Desserts: ['Cakes', 'Ice Cream', 'Pastries', 'Other'],
    };

    const grouped = {};
    filteredItems.forEach((item) => {
      const cat = item.category || 'Other';
      const sub = item.subcategory || cat;
      if (!grouped[cat]) grouped[cat] = {};
      if (!grouped[cat][sub]) grouped[cat][sub] = [];
      grouped[cat][sub].push(item);
    });

    const result = [];
    const sortedCats = Object.keys(grouped).sort((a, b) => {
      const ai = categoryOrder.indexOf(a);
      const bi = categoryOrder.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });

    sortedCats.forEach((cat) => {
      const subs = Object.keys(grouped[cat]).sort((a, b) => {
        const order = subcategoryOrder[cat] || [];
        const ai = order.indexOf(a);
        const bi = order.indexOf(b);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      });
      subs.forEach((sub) => {
        const key = sub && sub !== cat ? sub : cat;
        result.push({
          key,
          category: cat,
          items: grouped[cat][sub],
        });
      });
    });

    return result;
  }, [filteredItems]);

  // Dynamic ScrollSpy with IntersectionObserver
  useEffect(() => {
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const sectionKey = entry.target.getAttribute('data-section-key');
            if (sectionKey) {
              setActiveSection(sectionKey);
            }
          }
        });
      },
      {
        rootMargin: '-120px 0px -70% 0px',
        threshold: 0,
      }
    );

    Object.values(sectionRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections]);

  // Compute category statistics
  const stats = useMemo(() => {
    const wineCount = allItems.filter((i) => i.category === 'Wine').length;
    const mealsCount = allItems.filter((i) => i.category === 'Meals').length;
    const drinksCount = allItems.filter((i) => i.category === 'Drinks').length;
    const dessertsCount = allItems.filter((i) => i.category === 'Desserts').length;
    const offersCount = allItems.filter((i) => i.on_offer || i.offer).length;
    return {
      total: allItems.length,
      wineCount,
      mealsCount,
      drinksCount,
      dessertsCount,
      offersCount,
    };
  }, [allItems]);

  // Navigation to ViewItem design
  const handleViewItem = (item) => {
    if (onViewItem) {
      onViewItem(item);
    } else {
      navigate(`/item/${item.id}`);
    }
  };

  // Table Reservation Request
  const handleReserveDish = (item) => {
    if (addDineInItem) {
      addDineInItem(item);
      addToast?.(`${item.name} reserved for your table`, 'success');
    } else {
      addToast?.(`${item.name} reserved for your table`, 'success');
      onReserveTable?.();
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubnavClick = (sectionKey) => {
    setActiveSection(sectionKey);
    const target = sectionRefs.current[sectionKey];
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <main className="content-page full-menu-page">
      {/* Grand Hero Section */}
      <section className="full-menu-hero">
        <div className="full-menu-hero-header">
          <div className="full-menu-hero-text">
            <div className="full-menu-eyebrow">
              <GiSparkles /> Château254 Fine Dining & Cellar
            </div>
            <h1>
              The <span>Grand Menu</span>
            </h1>
            <p>
              Explore our complete culinary anthology — from sommelier-curated vintages
              and artisanal cellar selections to chef-crafted plates, farinaceous specialties,
              and handcrafted desserts at The Promenade, Westlands.
            </p>
          </div>

          <div className="full-menu-hero-actions">
            <button
              className="primary-button hero-btn-reserve"
              onClick={onReserveTable}
              type="button"
            >
              <FiCalendar /> Reserve a Table
            </button>
            <button
              className="outline-button hero-btn-order"
              onClick={onMakeOrder}
              type="button"
              disabled={!isTakeoutEnabled()}
              title={isTakeoutEnabled() ? 'Order for Take-Out' : 'Take-Out is currently unavailable'}
            >
              <FiBookOpen /> Order Online
            </button>
          </div>
        </div>

        {/* Highlights Stat Row */}
        <div className="full-menu-stats-row">
          <div className="full-menu-stat-item">
            <div className="full-menu-stat-icon">
              <GiWineBottle />
            </div>
            <span>
              Wine Cellar: <strong>{stats.wineCount} Vintages</strong>
            </span>
          </div>
          <div className="full-menu-stat-item">
            <div className="full-menu-stat-icon">
              <RiRestaurant2Line />
            </div>
            <span>
              Kitchen: <strong>{stats.mealsCount} Delicacies</strong>
            </span>
          </div>
          <div className="full-menu-stat-item">
            <div className="full-menu-stat-icon">
              <GiSparkles />
            </div>
            <span>
              Special Offers: <strong>{stats.offersCount} Featured</strong>
            </span>
          </div>
          <div className="full-menu-stat-item">
            <div className="full-menu-stat-icon">
              <GiForkKnifeSpoon />
            </div>
            <span>
              Total Curated: <strong>{stats.total} Selections</strong>
            </span>
          </div>
        </div>
      </section>

      {/* Search & Top Level Filter Tabs */}
      <div className="full-menu-toolbar">
        <div className="full-menu-search-row">
          <div className="full-menu-search-box">
            <FiSearch className="full-menu-search-icon" />
            <input
              type="text"
              placeholder="Search dishes, wines, grapes, regions, ingredients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search full menu"
            />
            {searchQuery && (
              <button
                type="button"
                className="full-menu-search-clear"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <FiX />
              </button>
            )}
          </div>

          <select
            className="full-menu-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Sort menu items"
          >
            <option value="recommended">Sort: Curated Order</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="name">Alphabetical (A-Z)</option>
          </select>
        </div>

        {/* Category Tabs */}
        <div className="full-menu-category-tabs">
          <button
            type="button"
            className={`full-menu-cat-tab ${activeCategoryTab === 'All' ? 'is-active' : ''}`}
            onClick={() => setActiveCategoryTab('All')}
          >
            <GiForkKnifeSpoon /> All Selections
            <span className="full-menu-tab-count">{stats.total}</span>
          </button>
          <button
            type="button"
            className={`full-menu-cat-tab ${activeCategoryTab === 'Wine' ? 'is-active' : ''}`}
            onClick={() => setActiveCategoryTab('Wine')}
          >
            <GiWineBottle /> Wine Cellar
            <span className="full-menu-tab-count">{stats.wineCount}</span>
          </button>
          <button
            type="button"
            className={`full-menu-cat-tab ${activeCategoryTab === 'Meals' ? 'is-active' : ''}`}
            onClick={() => setActiveCategoryTab('Meals')}
          >
            <RiRestaurant2Line /> Mains & Meals
            <span className="full-menu-tab-count">{stats.mealsCount}</span>
          </button>
          <button
            type="button"
            className={`full-menu-cat-tab ${activeCategoryTab === 'Drinks' ? 'is-active' : ''}`}
            onClick={() => setActiveCategoryTab('Drinks')}
          >
            <GiCoffeeCup /> Drinks & Bar
            <span className="full-menu-tab-count">{stats.drinksCount}</span>
          </button>
          <button
            type="button"
            className={`full-menu-cat-tab ${activeCategoryTab === 'Desserts' ? 'is-active' : ''}`}
            onClick={() => setActiveCategoryTab('Desserts')}
          >
            <GiCakeSlice /> Desserts
            <span className="full-menu-tab-count">{stats.dessertsCount}</span>
          </button>
          {stats.offersCount > 0 && (
            <button
              type="button"
              className={`full-menu-cat-tab is-offer-tab ${activeCategoryTab === 'Offers' ? 'is-active' : ''}`}
              onClick={() => setActiveCategoryTab('Offers')}
            >
              <FiTag /> On Offer
              <span className="full-menu-tab-count">{stats.offersCount}</span>
            </button>
          )}
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div>
          <div style={{ marginBottom: '32px' }}>
            <LoaderSkeleton width={200} height={28} borderRadius={6} style={{ marginBottom: '20px' }} />
            <div className="menu-grid">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <MenuCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="full-menu-empty">
          <p style={{ color: 'var(--danger)' }}>{error}</p>
          <button
            type="button"
            className="primary-button"
            onClick={() => window.location.reload()}
          >
            Retry Loading
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="full-menu-empty">
          <div className="full-menu-empty-icon">
            <FiSearch />
          </div>
          <h3>No selections found</h3>
          <p>
            We couldn't find any dishes or wines matching "{searchQuery || activeCategoryTab}".
          </p>
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              setSearchQuery('');
              setActiveCategoryTab('All');
            }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <>
          {/* Sticky Subcategory Carousel Navigator */}
          {sections.length > 1 && (
            <nav className="full-menu-sticky-subnav" aria-label="Menu categories">
              {sections.map((section) => (
                <button
                  key={section.key}
                  className={`subnav-pill ${activeSection === section.key ? 'is-active' : ''}`}
                  onClick={() => handleSubnavClick(section.key)}
                  type="button"
                >
                  {getCategoryIcon(section.category)}
                  <span>{section.key}</span>
                  <span className="subnav-pill-count">({section.items.length})</span>
                </button>
              ))}
            </nav>
          )}

          {/* Render Category Sections with identical Menu Card Design */}
          {sections.map((section) => (
            <section
              key={section.key}
              data-section-key={section.key}
              ref={(el) => { sectionRefs.current[section.key] = el; }}
              className="full-menu-section"
            >
              <div className="full-menu-section-header">
                <div className="full-menu-section-icon">
                  {getCategoryIcon(section.category)}
                </div>
                <h2 className="full-menu-section-title">{section.key}</h2>
                <span className="full-menu-section-badge">
                  {section.items.length} {section.items.length === 1 ? 'item' : 'items'}
                </span>
                <div className="full-menu-section-line" />
              </div>

              {/* Exact menu-card / menu-card-view design from Menu page */}
              <div className="menu-grid">
                {section.items.map((item) => {
                  const isOnOffer = Boolean(
                    item.on_offer || item.on_Offer || item.classification?.on_offer || item.classification?.on_Offer
                  );
                  const offerText = item.offer || item.classification?.offer || 'On Offer';
                  const offerPrice = isOnOffer ? calculateOfferPrice(item.price, offerText) : null;

                  return (
                    <article
                      className={`menu-card ${isOnOffer ? 'is-on-offer' : ''}`}
                      key={item.id}
                    >
                      <button
                        className="menu-card-view"
                        onClick={() => handleViewItem(item)}
                        aria-label={`View ${item.name}`}
                      >
                        <div
                          className="food-image"
                          style={{ backgroundImage: item.image ? `url(${item.image})` : undefined }}
                        >
                          <span className="category-tag">{item.subcategory || item.category}</span>
                          {isOnOffer && (
                            <span className="menu-card-offer-badge">
                              <FiTag /> {offerText}
                            </span>
                          )}
                        </div>
                        <div className="menu-card-body">
                          <div>
                            <h2>{item.name}</h2>
                            <p>{item.description}</p>
                            <div className="menu-card-price-row">
                              {offerPrice ? (
                                <>
                                  <strong className="menu-card-offer-price">
                                    KES {offerPrice.toLocaleString()}
                                  </strong>
                                  <span className="menu-card-original-price">
                                    KES {item.price.toLocaleString()}
                                  </span>
                                </>
                              ) : (
                                <strong>KES {item.price.toLocaleString()}</strong>
                              )}
                              {isOnOffer && (
                                <span className="menu-card-offer-pill">
                                  {offerText}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                      <button
                        className="add-button"
                        aria-label={`Reserve ${item.name} for your table`}
                        title="Reserve for your table"
                        onClick={() => handleReserveDish(item)}
                      >
                        <FiCalendar />
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </>
      )}

      {/* Floating Back to Top Button */}
      {showBackToTop && (
        <button
          type="button"
          className="full-menu-back-to-top"
          onClick={scrollToTop}
          aria-label="Back to top"
          title="Back to top"
        >
          <FiChevronUp />
        </button>
      )}
    </main>
  );
};

export default FullMenu;
