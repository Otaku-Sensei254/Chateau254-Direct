import React from "react";
import { RiEBike2Fill } from "react-icons/ri";
import { FiCalendar, FiPlus, FiSearch} from "react-icons/fi";
import { LuPackageOpen } from "react-icons/lu";
import { GiMeal } from "react-icons/gi";
import { useToast } from "../../contexts/ToastContext";
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
  dinein: '🍽️ Dine In Menu',
  takeout: '🛍️ Take Out Menu',
  events: '🎉 Event Catering & Beverage Menu',
};

const Menu = ({
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
  onModeChange,
  onBack,
  dineInSelections,
  addDineInItem,
}) => {
  const { addToast } = useToast();
  const isWineActive = filter === "Wine";

  const handleClassFilter = (field, value) => {
    if (wineClassFilter?.field === field && wineClassFilter?.value === value) {
      // toggle off
      setWineClassFilter(null);
    } else {
      setWineClassFilter({ field, value });
    }
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
        <span className="order-badge">
          <RiEBike2Fill /> 45 min delivery
        </span>
        <button className="order-badge" onClick={onBooking}>
          <FiCalendar /> My Reservations {dineInSelections.length > 0 && <span className="reservation-count">{dineInSelections.length}</span>}
        </button>
      </div>
      
        <div className="menu-mode-toggle">
          <button className="mode-button" onClick={() => onModeChange(mode === "takeout" ? "dinein" : "takeout")} type="button">
            {mode === "takeout" ? <> Dine In <GiMeal className="mode-icon" /></> : <>Take Out <LuPackageOpen className="mode-icon"/> </>}
          </button>
        </div>
      
      <div className="search-box">
        <FiSearch />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search menu..."
        />
      </div>

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
        {items.map((item) => (
          <article className="menu-card" key={item.id}>
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
              </div>
              <div className="menu-card-body">
                <div>
                  <h2>{item.name}</h2>
                  <p>{item.description}</p>
                  <strong>KES {item.price.toLocaleString()}</strong>
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
        ))}
      </div>
      {!items.length && (
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
