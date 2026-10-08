import React, { useRef, useState, useEffect, useMemo } from "react";
import { RiEBike2Fill } from "react-icons/ri";
import {
  FiCalendar,
  FiPlus,
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
  FiTag,
  FiX,
  FiPlayCircle,
  FiVolume2,
  FiVolumeX
} from "react-icons/fi";
import { GiWineBottle } from "react-icons/gi";
import { useToast } from "../../contexts/ToastContext";
import { useNavigate } from "react-router-dom";
import AccountRequiredModal from "../../components/ui/AccountRequiredModal";
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

// Offers come entirely from the database: any menu item flagged on_offer appears here.
// The discount is parsed from the item's own offer text, so no price or copy is invented.
const buildOffer = (item) => {
  const percent = parseOfferPercent(item.offer);
  const originalPrice = Number(item.price) || 0;
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    image: item.image,
    category: item.category,
    type: item.menuType === 'wine' ? 'wine' : 'meal',
    deal: item.offer || 'On Offer',
    price: percent ? Math.round(originalPrice * (1 - percent / 100)) : originalPrice,
    originalPrice: percent ? originalPrice : null,
    rating: null,
    source: item,
  };
};

const Menu = ({ api,
  items,
  offerItems = [],
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
  onRequireAuth,
  loading = false,
}) => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [promotions, setPromotions] = useState([]);
  const [dismissedPromos, setDismissedPromos] = useState([]);
  const [promoVideo, setPromoVideo] = useState(null);
  const [showPromoVideo, setShowPromoVideo] = useState(false);
  const [promoVideoMuted, setPromoVideoMuted] = useState(false);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const isWineActive = filter === "Wine";

  /* Dine-in plates are reserved for the table, never added to the cart: the
     guest books a table and has the dishes waiting on arrival. `mode` is
     normalised to 'dining' in App.js, so this must compare against 'dining'.
     An earlier version compared against 'dinein', which never matches, so every
     dine-in item silently went to the cart. */
  const isDineIn = mode === "dining" || mode === "dinein";

/* Reserving needs an account so the venue knows who is arriving. Guests get
      told why and sent to sign in rather than silently losing the selection. */
  const requestReservation = async (item) => {
    if (!user) {
      setAuthPromptOpen(true);
      return;
    }
    
    // For dine-in reservations, we can optionally process payment before confirming
    // This ensures the venue gets paid upfront for table reservations
    // In a real implementation, this would integrate with the existing Pesapal payment system
    
    try {
      // For now, we'll process the reservation directly
      // In the future, this could include:
      // 1. Payment validation/authorization using the existing Pesapal system
      // 2. Showing payment options (credit card, mpesa, etc.)
      // 3. Processing payment before confirming reservation
      // 4. Handling payment failures appropriately
      
      addDineInItem?.(item);
      addToast(`${item.name} reserved for your table`, "success");
      
      // TODO: Add payment processing for dine-in reservations
      // This would integrate with the existing payment system in App.js
      // For now, reservations are confirmed without payment processing
      
    } catch (error) {
      console.error('Error processing reservation:', error);
      addToast('Unable to process your reservation. Please try again.', "error");
    }
  };

  // Only items the admin flagged on_offer surface here, and they stay put regardless
  // of the active category, search or menu mode.
  const offers = useMemo(
    () => offerItems.filter((item) => item.on_offer).map(buildOffer),
    [offerItems]
  );

  useEffect(() => {
    fetch(`${api}/promotions`)
      .then((res) => { console.log('[promo] fetch status', res.status); return res.json(); })
      .then((data) => { console.log('[promo] fetched', data.promotions?.length || 0); setPromotions(data.promotions || []); })
      .catch((err) => { console.error('[promo] fetch failed', err); });
    const dismissed = JSON.parse(localStorage.getItem('chateau254_dismissed_promotions') || '[]');
    setDismissedPromos(dismissed);
  }, [api]);

  // Fetch today's scheduled promo video
  useEffect(() => {
    fetch(`${api}/promotions/promo-video/today`)
      .then((res) => res.json())
      .then((data) => {
        if (data.promoVideo) {
          setPromoVideo(data.promoVideo);
        }
      })
      .catch((err) => { console.error('[promo-video] fetch failed', err); });
  }, [api]);

  const dismissPromotion = (id) => {
    const updated = [...dismissedPromos, id];
    setDismissedPromos(updated);
    localStorage.setItem('chateau254_dismissed_promotions', JSON.stringify(updated));
    // After ad is dismissed, show promo video if available
    if (promoVideo) {
      setShowPromoVideo(true);
    }
  };

  const dismissPromoVideo = () => {
    setShowPromoVideo(false);
    const weekKey = `chateau254_promo_video_dismissed_${new Date().toISOString().slice(0, 10)}`;
    localStorage.setItem(weekKey, 'true');
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

    // Built from the real menu item so the cart keeps its database id and stays
    // resolvable at checkout; only the price reflects the offer.
    const cartItem = {
      id: offer.source.id,
      name: offer.source.name,
      price: offer.price,
      description: offer.source.description,
      category: offer.source.category,
      image: offer.source.image,
      menuType: offer.source.menuType,
    };

    if (offer.type === "meal" && isDineIn && addDineInItem) {
      requestReservation(cartItem);
    } else {
      addToCart(cartItem);
      addToast(`${offer.name} added to cart!`, "success");
    }
  };

  const handleCardClick = (offer) => {
    if (hasDragged) return;
    if (onViewItem) onViewItem(offer.source);
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
            <RiEBike2Fill /> Quick delivery
          </span>
          <button className="reservations" onClick={onBooking}>
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
                <button className="promo-cta-btn" onClick={() => { navigate('/menu?mode=lunchbox'); dismissPromotion(activePromo.id); }}>
                  View Lunch & Bar
                </button>
              </div>
            </div>
            <button className="promo-close" onClick={() => dismissPromotion(activePromo.id)} aria-label="Close promotion"><FiX /></button>
          </div>
        </div>
      )}
      {/* Promo Video Modal - appears after ad is dismissed */}
      {showPromoVideo && promoVideo && (
        <div
          className="promo-video-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Weekly promo video"
          onClick={(event) => { if (event.target === event.currentTarget) dismissPromoVideo(); }}
        >
          <div className="promo-video-card">
            <div className="promo-video-player">
              <video
                src={promoVideo.mediaUrl}
                poster={promoVideo.thumbnailUrl}
                controls
                autoPlay
                muted
                playsInline
              />
              <div className="promo-video-controls">
                <button
                  className="promo-video-mute-btn"
                  onClick={() => setPromoVideoMuted(!promoVideoMuted)}
                  aria-label={promoVideoMuted ? 'Unmute' : 'Mute'}
                >
                  {promoVideoMuted ? <FiVolumeX /> : <FiVolume2 />}
                </button>
              </div>
            </div>
            <div className="promo-video-content">
              <span className="promo-video-kicker">This Week's Feature</span>
              {promoVideo.title && <h3>{promoVideo.title}</h3>}
              {promoVideo.caption && <p>{promoVideo.caption}</p>}
              {promoVideo.linkUrl && (
                <a
                  href={promoVideo.linkUrl}
                  className="promo-video-cta"
                  onClick={dismissPromoVideo}
                >
                  {promoVideo.linkText || 'View Details'} <FiPlayCircle />
                </a>
              )}
            </div>
            <button className="promo-video-close" onClick={dismissPromoVideo} aria-label="Close promo video"><FiX /></button>
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
            {offers.length > 0 && (
              <span className="offer-badge"><FiTag /> {offers.length} {offers.length === 1 ? "item" : "items"} on offer</span>
            )}
            <h2 className="offers-title">Current Offers</h2>
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
          {offers.map((offer) => (
            <article
              key={offer.id}
              className="offer-card"
              onClick={() => handleCardClick(offer)}
            >
              <div className="offer-top-row">
                <span className="offer-deal-pill">
                  {offer.deal}
                </span>
                {offer.originalPrice && (
                  <span className="offer-note">
                    Save {Math.round((1 - offer.price / offer.originalPrice) * 100)}%
                  </span>
                )}
              </div>

              <div className="offer-image-wrap">
                {offer.image && (
                  <img
                    src={offer.image}
                    alt={offer.name}
                    className={`offer-image ${offer.type === "wine" ? "contain" : ""}`}
                    loading="lazy"
                    onError={(e) => { e.target.style.display = "none"; }}
                  />
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
              ) : (
                <button
                  type="button"
                  className="offer-action-btn meal-btn"
                  onClick={(e) => handleOfferAction(e, offer)}
                >
                  <FiPlus /> Add to cart
                </button>
              )}
            </article>
          ))}
          {/* {!offers.length && (
            <p className="offers-empty">No items are currently on offer. Check back soon.</p>
          )} */}
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
                aria-label={isDineIn ? `Reserve ${item.name} for your table` : `Add ${item.name} to cart`}
                title={isDineIn ? 'Reserve for your table' : 'Add to cart'}
                onClick={() => {
                  if (isDineIn) {
                    requestReservation(item);
                  } else {
                    addToCart(item);
                  }
                }}
              >
                {isDineIn ? <FiCalendar /> : <FiPlus />}
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
      <AccountRequiredModal
        open={authPromptOpen}
        onClose={() => setAuthPromptOpen(false)}
        onSignIn={() => { setAuthPromptOpen(false); onRequireAuth?.(); }}
        action="item"
      />
    </main>
  );
};

export default Menu;
