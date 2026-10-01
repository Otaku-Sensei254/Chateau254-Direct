import React, { useRef, useState, useEffect, useMemo } from "react";
import { RiEBike2Fill } from "react-icons/ri";
import {
  FiCalendar,
  FiPlus,
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
  FiStar,
  FiTag,
  FiX
} from "react-icons/fi";
import { GiWineBottle } from "react-icons/gi";
import { useToast } from "../../contexts/ToastContext";
import { LoaderSkeleton, MenuCardSkeleton } from "../../components/ui/loaders-skeleton";

const parseOfferPercent = (offerText = "") => {
  const match = String(offerText).match(/(\d+(?:\.\d+)?)\s*%/);
  return match ? parseFloat(match[1]) : null;
};

const calculateOfferPrice = (price, offerText = "") => {
  const percent = parseOfferPercent(offerText);
  if (!percent) return null;
  const discounted = price * (1 - percent / 100);
  return Math.round(discounted);
};

// Classification filter groups shown when Wine category is active
const WINE_CLASS_FILTERS = [
  {
    label: "Colour",
    field: "color",
    options: ["Red", "White", "Rosé"],
  },
  {
    label: "Bubbles",
    field: "carbonation",
    options: ["Still", "Sparkling"],
  },
  {
    label: "Sweetness",
    field: "sweetness",
    options: ["Dry", "Dry (Brut)", "Dry (high alcohol, rich fruit)", "Sweet (Dessert Wine, Botrytized)", "Sweet (Fortified Dessert Style)"],
  },
  {
    label: "Fortification",
    field: "fortification",
    options: ["Unfortified", "Fortified (grape spirit added)"],
  },
];

const MODE_LABELS = {
  dining: '🍽️ Dine In Menu',
  dinein: '🍽️ Dine In Menu',
  takeout: '🛍️ Take Out Menu',
  lunchbox: '🍱 Lunch & Bar',
  events: '🎉 Event Catering & Beverage Menu',
};

// Curated specials: 3 wines, 2 dinner packages, 1 paired reservation discount
const OFFERS_DATA = [
  {
    id: "luxury-wine-1",
    name: "Krug Grande Cuvée",
    type: "wine",
    category: "Wine",
    deal: "Buy 1, get 1 FREE",
    badge: "Members only",
    badgeType: "members",
    rating: { score: "4.9", count: "Vivino 97 pts" },
    originalPrice: 14000,
    price: 11900,
    image: "https://ik.imagekit.io/drinksvine/products/krug-grande-cuvee.webp",
    description: "Prestige multi-vintage Champagne with toasted brioche and hazelnut finish."
  },
  {
    id: "full-signature-mains-5",
    name: "Master's Tomahawk Feast",
    type: "meal",
    category: "Signature Mains",
    deal: "Dinner Package • 20% OFF",
    badge: "Bundled deal",
    badgeType: "bundled",
    rating: null,
    originalPrice: 6500,
    price: 5200,
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80",
    description: "600g dry-aged prime Tomahawk, rosemary herb butter, crisp fries & rich jus."
  },
  {
    id: "luxury-wine-0",
    name: "Dom Pérignon Vintage",
    type: "wine",
    category: "Wine",
    deal: "Special Reserve • 15% OFF",
    badge: "Great value",
    badgeType: "great-value",
    rating: { score: "4.9", count: "98 pts" },
    originalPrice: 16500,
    price: 13900,
    image: "https://images.unsplash.com/photo-1569919659476-f0852f6834b7?auto=format&fit=crop&w=900&q=80",
    description: "Prestige cuvée, crisp minerality, toasted brioche and lingering citrus vibrancy."
  },
  {
    id: "reservation-steak-pairing",
    name: "Steak & Bordeaux Paired Tasting",
    type: "reservation",
    category: "Dine In Special",
    deal: "Paired Menu • Save KES 2,000",
    badge: null,
    badgeType: null,
    rating: null,
    originalPrice: 8800,
    price: 6800,
    image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=900&q=80",
    description: "3-course dry-aged steak dinner paired with sommelier French vintage pours."
  },
  {
    id: "luxury-wine-2",
    name: "Château Margaux Grand Cru",
    type: "wine",
    category: "Wine",
    deal: "Cellar Promo • 20% OFF",
    badge: "Smart value",
    badgeType: "smart-value",
    rating: { score: "4.8", count: "96 pts" },
    originalPrice: 12500,
    price: 9900,
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQHs0yVN6uSQeQL1S_OvDdbEzPEiV1jJ8ReASwbASBRGg&s=10",
    description: "Silky tannins, deep dark fruits, floral cedar notes. Premier Grand Cru Classé."
  },
  {
    id: "full-signature-mains-2",
    name: "28-Day Dry-Aged Sirloin & Truffle Duo",
    type: "meal",
    category: "Signature Mains",
    deal: "Dinner Package • Save KES 1,200",
    badge: "Great price",
    badgeType: "great-price",
    rating: null,
    originalPrice: 5800,
    price: 4600,
    image: "https://karoobraai.com/wp-content/uploads/2024/05/Sirloin-Steak-1.jpg",
    description: "300g marbled sirloin served alongside signature creamy truffle risotto."
  }
];

const Menu = ({ api,
  items,
  categories,
  filter,
  setFilter,
  query,
  setQuery,
  addToCart,
  cartCount,
  onCart,
  onViewItem,
  onBooking,
  user,
  wineFilter,
  onClearWineFilter,
  wineClassFilter,
  setWineClassFilter,
  mode,
  winePairingFilter,
  onClearWinePairingFilter,
  onBack,
  dineInSelections,
  addDineInItem,
  loading = false,
}) => {
  const { addToast } = useToast();
  const [promotions, setPromotions] = useState([]);
  const [dismissedPromos, setDismissedPromos] = useState([]);
  const isWineActive = filter === "Wine";

  useEffect(() => {
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
  console.log("[promo-menu] promotions", promotions, "dismissed", dismissedPromos, "activePromo", activePromo);
  console.log("[promo] activePromo", activePromo);

  // Carousel slider state & drag handlers
  const carouselTrackRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftPos, setScrollLeftPos] = useState(0);
  const [hasDragged, setHasDragged] = useState(false);

  // Auto-slide effect (slides right to left, loops seamlessly, pauses on hover/drag)
  useEffect(() => {
    if (isHovered || isDragging) return;

    const interval = setInterval(() => {
      const el = carouselTrackRef.current;
      if (!el) return;

      const maxScroll = el.scrollWidth - el.clientWidth;
      if (el.scrollLeft >= maxScroll - 15) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        const step = Math.min(290, el.clientWidth * 0.75);
        el.scrollBy({ left: step, behavior: "smooth" });
      }
    }, 3800);

    return () => clearInterval(interval);
  }, [isHovered, isDragging]);

  const slide = (direction) => {
    const el = carouselTrackRef.current;
    if (!el) return;

    const scrollAmount = 290;
    if (direction === "left") {
      if (el.scrollLeft <= 10) {
        el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
      } else {
        el.scrollBy({ left: -scrollAmount, behavior: "smooth" });
      }
    } else {
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 15) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: scrollAmount, behavior: "smooth" });
      }
    }
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0 || !carouselTrackRef.current) return;
    setIsDragging(true);
    setHasDragged(false);
    setStartX(e.pageX - carouselTrackRef.current.offsetLeft);
    setScrollLeftPos(carouselTrackRef.current.scrollLeft);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !carouselTrackRef.current) return;
    e.preventDefault();
    const x = e.pageX - carouselTrackRef.current.offsetLeft;
    const walk = (x - startX) * 1.35;
    if (Math.abs(walk) > 4) {
      setHasDragged(true);
    }
    carouselTrackRef.current.scrollLeft = scrollLeftPos - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setTimeout(() => setHasDragged(false), 50);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setIsHovered(false);
    setTimeout(() => setHasDragged(false), 50);
  };

  const handleOfferAction = (e, offer) => {
    e.stopPropagation();

    if (offer.type === "wine") {
      const wineItem = {
        id: offer.id,
        name: offer.name,
        price: offer.price,
        description: offer.description,
        category: "Wine",
        image: offer.image
      };
      addToCart(wineItem);
      addToast(`${offer.name} added to your cellar!`, "success");
    } else if (offer.type === "meal") {
      const mealItem = {
        id: offer.id,
        name: offer.name,
        price: offer.price,
        description: offer.description,
        category: offer.category || "Meals",
        image: offer.image
      };
      if (mode === "dinein" && addDineInItem) {
        addDineInItem(mealItem);
        addToast(`${offer.name} added to reservation!`, "success");
      } else {
        addToCart(mealItem);
        addToast(`${offer.name} added to cart!`, "success");
      }
    } else if (offer.type === "reservation") {
      if (onBooking) {
        onBooking();
        addToast(`Booking reservation for ${offer.name}!`, "info");
      }
    }
  };

  const handleCardClick = (offer) => {
    if (hasDragged) return;
    if (offer.type === "reservation") {
      if (onBooking) onBooking();
    } else if (onViewItem) {
      onViewItem(offer);
    }
  };

  const handleClassFilter = (field, value) => {
    if (wineClassFilter?.field === field && wineClassFilter?.value === value) {
      // toggle off
      setWineClassFilter(null);
    } else {
      setWineClassFilter({ field, value });
    }
  };


  // Search dropdown & loading state
  const searchWrapperRef = useRef(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);

  // Debounced search loading animation effect
  useEffect(() => {
    if (!query.trim()) {
      setIsSearchLoading(false);
      return;
    }
    setIsSearchLoading(true);
    const timer = setTimeout(() => {
      setIsSearchLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, []);

  // Filter matching items for the search dropdown
  const searchMatches = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return items.filter((item) => {
      const name = (item.name || "").toLowerCase();
      const desc = (item.description || "").toLowerCase();
      const cat = (item.category || "").toLowerCase();
      const type = (item.type || "").toLowerCase();
      const grape = (item.grape || "").toLowerCase();
      return (
        name.includes(q) ||
        desc.includes(q) ||
        cat.includes(q) ||
        type.includes(q) ||
        grape.includes(q)
      );
    }).slice(0, 8); // top 8 matches
  }, [items, query]);

  const handleDropdownItemClick = (item) => {
    setIsSearchFocused(false);
    if (onViewItem) {
      onViewItem(item);
    }
  };

  const handleClearSearch = () => {
    setQuery("");
    setIsSearchFocused(false);
  };

  return (
    <main className="content-page menu-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Welcome back, {user?.full_name || ""}</p>
          <h1>
            What are you
            <br />
            <em>craving today?</em>
          </h1>
        </div>
        <div className="badges">
          <span className="order-badge">
            <RiEBike2Fill /> 45 min delivery
          </span>
          <button className="order-badge" onClick={onBooking}>
            <FiCalendar /> My Reservations {dineInSelections.length > 0 && <span className="reservation-count">{dineInSelections.length}</span>}
          </button>
        </div>
      </div>

      {activePromo && (
        <div className="promo-banner promo-modal" role="status" aria-live="polite" onClick={(event) => { if (event.target === event.currentTarget) dismissPromotion(activePromo.id); }}>
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
          <div className="promo-content">
            <h3>Coming Soon</h3>
            <p>We have exciting promotions coming your way. Stay tuned!</p>
          </div>
        </div>
      )} */}

      {/* Search Bar with Autocomplete Dropdown & Skeleton Loader */}
      <div className="search-wrapper" ref={searchWrapperRef}>
        <div className="search-box">
          <FiSearch />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setIsSearchFocused(true);
            }}
            onFocus={() => setIsSearchFocused(true)}
            placeholder="Search menu..."
          />
          {query && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={handleClearSearch}
              aria-label="Clear search"
            >
              <FiX size={16} />
            </button>
          )}
        </div>

        {/* Dropdown Menu */}
        {isSearchFocused && query.trim().length > 0 && (
          <div className="search-dropdown" role="listbox">
            <div className="search-dropdown-header">
              <span>Matching Items</span>
              {!isSearchLoading && (
                <span className="search-dropdown-count">
                  {searchMatches.length} {searchMatches.length === 1 ? "result" : "results"}
                </span>
              )}
            </div>

            {isSearchLoading ? (
              <div className="search-dropdown-loading">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="search-dropdown-skeleton">
                    <LoaderSkeleton width={44} height={44} borderRadius={8} />
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                      <LoaderSkeleton width="65%" height={14} borderRadius={4} />
                      <LoaderSkeleton width="85%" height={11} borderRadius={4} />
                      <LoaderSkeleton width="30%" height={12} borderRadius={4} />
                    </div>
                  </div>
                ))}
              </div>
            ) : searchMatches.length > 0 ? (
              <ul className="search-dropdown-list">
                {searchMatches.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="search-dropdown-item"
                      onClick={() => handleDropdownItemClick(item)}
                    >
                      <div
                        className="search-dropdown-thumb"
                        style={{ backgroundImage: `url(${item.image})` }}
                      />
                      <div className="search-dropdown-info">
                        <div className="search-dropdown-title-row">
                          <span className="search-dropdown-name">{item.name}</span>
                          {item.category && (
                            <span className="search-dropdown-cat">{item.category}</span>
                          )}
                        </div>
                        <p className="search-dropdown-desc">
                          {item.description || item.notes || `${item.type || ""} ${item.region ? "• " + item.region : ""}`}
                        </p>
                        <strong className="search-dropdown-price">
                          KES {(item.price || 0).toLocaleString()}
                        </strong>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="search-dropdown-empty">
                <p>No matching menu items found for "{query}"</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Offers & Curated Specials Carousel */}
      <section className="offers-section" aria-label="Special Offers">
        <div className="offers-header">
          <div className="offers-header-left">
            <span className="offer-badge"><FiTag /> 10% off on all wines this week!</span>
            <h2 className="offers-title">Exclusive Offers & Packages</h2>
          </div>
          <div className="offers-controls">
            <button
              type="button"
              className="offers-nav-btn prev"
              onClick={() => slide("left")}
              aria-label="Previous offer"
              title="Previous offer"
            >
              <FiChevronLeft />
            </button>
            <button
              type="button"
              className="offers-nav-btn next"
              onClick={() => slide("right")}
              aria-label="Next offer"
              title="Next offer"
            >
              <FiChevronRight />
            </button>
          </div>
        </div>

        <div
          className={`offers-carousel ${isDragging ? "dragging" : ""}`}
          ref={carouselTrackRef}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={handleMouseLeave}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={() => setIsHovered(true)}
          onTouchEnd={() => setIsHovered(false)}
        >
          {OFFERS_DATA.map((offer) => (
            <article
              key={offer.id}
              className="offer-card"
              onClick={() => handleCardClick(offer)}
            >
              <div className="offer-top-row">
                <span className="offer-deal-pill">
                  {offer.deal}
                </span>
                {offer.badge && (
                  <span className={`offer-note ${offer.badgeType}`}>
                    {offer.badge}
                  </span>
                )}
              </div>

              <div className="offer-image-wrap">
                <img
                  src={offer.image}
                  alt={offer.name}
                  className={`offer-image ${offer.type === "wine" ? "contain" : ""}`}
                  loading="lazy"
                  onError={(e) => {
                    e.target.src = offer.type === "wine"
                      ? "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=900&q=80"
                      : "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80";
                  }}
                />
                {offer.rating && (
                  <div className="offer-rating-badge">
                    <FiStar fill="currentColor" />
                    <strong>{offer.rating.score}</strong>
                    {offer.rating.count && <span>• {offer.rating.count}</span>}
                  </div>
                )}
              </div>

              <div className="offer-content">
                <h3 className="offer-title" title={offer.name}>{offer.name}</h3>
                <p className="offer-desc">{offer.description}</p>
                <div className="offer-pricing">
                  <span className="offer-price">KES {offer.price.toLocaleString()}</span>
                  {offer.originalPrice && (
                    <span className="offer-original-price">
                      KES {offer.originalPrice.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              {offer.type === "wine" ? (
                <button
                  type="button"
                  className="offer-action-btn wine-btn"
                  onClick={(e) => handleOfferAction(e, offer)}
                >
                  <GiWineBottle /> Add to cellar
                </button>
              ) : offer.type === "meal" ? (
                <button
                  type="button"
                  className="offer-action-btn meal-btn"
                  onClick={(e) => handleOfferAction(e, offer)}
                >
                  <FiPlus /> Add to cart
                </button>
              ) : (
                <button
                  type="button"
                  className="offer-action-btn reservation-btn"
                  onClick={(e) => handleOfferAction(e, offer)}
                >
                  <FiCalendar /> Make reservation
                </button>
              )}
            </article>
          ))}
        </div>
      </section>

      {mode && MODE_LABELS[mode] && (
        <div className="mode-badge">{MODE_LABELS[mode]}</div>
      )}

      <div className="filter-row">
        {categories.map((category) => (
          <button
            className={filter === category ? "active" : ""}
            key={category}
            onClick={() => setFilter(category)}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Wine classification sub-filter — visible only when Wine is selected */}
      {isWineActive && (
        <div className="wine-class-filter-section">
          {WINE_CLASS_FILTERS.map(({ label, field, options }) => (
            <div className="wine-class-group" key={field}>
              <span className="wine-class-label">{label}</span>
              <div className="wine-class-options">
                {options.map((opt) => (
                  <button
                    key={opt}
                    className={
                      wineClassFilter?.field === field && wineClassFilter?.value === opt
                        ? "wine-class-btn active"
                        : "wine-class-btn"
                    }
                    onClick={() => handleClassFilter(field, opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {wineFilter && (
        <div className="wine-filter-chip">
          <span>Wine {wineFilter.field}: {wineFilter.value}</span>
          <button type="button" onClick={onClearWineFilter}>Clear</button>
        </div>
      )}
      {winePairingFilter && (
        <div className="wine-filter-chip">
          <span>Wine pairing: {winePairingFilter}</span>
          <button type="button" onClick={onClearWinePairingFilter}>Clear</button>
        </div>
      )}
      <div className="menu-grid">
        {loading ? (
          [1, 2, 3, 4, 5, 6].map((n) => <MenuCardSkeleton key={n} />)
        ) : (
          items.map((item) => {
            const isOnOffer = Boolean(
              item.on_offer || item.on_Offer || item.classification?.on_offer || item.classification?.on_Offer
            );
          const offerText = item.offer || item.classification?.offer || "On Offer";
          const offerPrice = isOnOffer ? calculateOfferPrice(item.price, offerText) : null;

          return (
            <article className={`menu-card ${isOnOffer ? "is-on-offer" : ""}`} key={item.id}>
              <button
                className="menu-card-view"
                onClick={() => onViewItem(item)}
                aria-label={`View ${item.name}`}
              >
                <div
                  className="food-image"
                  style={{ backgroundImage: `url(${item.image})` }}
                >
                  <span className="category-tag">{item.category}</span>
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
                          <strong className="menu-card-offer-price">KES {offerPrice.toLocaleString()}</strong>
                          <span className="menu-card-original-price">KES {item.price.toLocaleString()}</span>
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
                aria-label={mode === "dinein" ? `Book ${item.name}` : `Add ${item.name}`}
                onClick={() => {
                  if (mode === "dinein") {
                    addDineInItem(item);
                    addToast(`${item.name} added to reservation`, "success");
                  } else {
                    addToCart(item);
                  }
                }}
              >
                {mode === "dinein" ? <FiCalendar /> : <FiPlus />}
              </button>
            </article>
          );
        }))}
      </div>
      {!loading && !items.length && (
        <div className="empty-state">Not found. Try another search.</div>
      )}
      {cartCount > 0 && (
        <button className="floating-cart" onClick={onCart}>
          View cart <span>{cartCount}</span>
        </button>
      )}

      {/* <div className="whatsapp-float">
        <Link
          to="https://wa.me/254114100680"
          target="_blank"
          rel="noopener noreferrer"
        >
          <RiWhatsappFill />
        </Link>
      </div> */}
    </main>
  );
};

export default Menu;
