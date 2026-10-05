import React, { useState, useEffect } from 'react';
import { FiBookOpen, FiCalendar } from 'react-icons/fi';
import fullMenuData from '../../components/data/chateau254_full_menu.json';
import { MenuCardSkeleton, LoaderSkeleton } from '../../components/ui/loaders-skeleton';
import { isTakeoutEnabled } from '../../config/features';

const normalizeFullMenu = (data) => {
  const categories = data?.categories || [];
  return categories.flatMap((entry) => {
    const subCategory = entry['sub-category'] || entry.category || '';
    const items = entry.items || [];
    return items.map((item, i) => ({
      id: `full-${String(subCategory || '').replace(/\W+/g, '-').toLowerCase()}-${i}`,
      name: item.name,
      description: item.description || '',
      price: item.price || 0,
      category: subCategory || '',
      image: item.image || '',
      tag: item.tag || null,
      portion: item.portion || null,
      serves: item.serves || null,
      quantity: item.quantity || null,
      vegetarian: item.vegetarian || false,
      note: item.note || null,
      pricing_options: item.pricing_options || null,
      sides: item.sides || null,
      sides_note: item.sides_note || null,
    }));
  });
};

const FullMenu = ({ onMakeOrder, onReserveTable, loading: propLoading }) => {
  const [loading, setLoading] = useState(propLoading ?? false);
  const menuItems = normalizeFullMenu(fullMenuData);
  const categories = [...new Set(menuItems.map((item) => item.category))];

  useEffect(() => {
    if (propLoading !== undefined) {
      setLoading(propLoading);
    }
  }, [propLoading]);

  return (
    <main className="content-page full-menu-page">
      <div className="section-heading">
        <div>
          <h1>Chateau254 Full Menu</h1>
          <p>Browse our complete dine-in selection</p>
        </div>
        <div className="action-buttons">
          {/* "Make an Order" routes into the Take-Out menu, so it is withheld
              alongside it. Left in place but disabled. */}
          <button
            className="primary-button"
            onClick={onMakeOrder}
            type="button"
            disabled={!isTakeoutEnabled()}
            aria-disabled={!isTakeoutEnabled()}
            title={isTakeoutEnabled() ? undefined : 'Take-Out is not available yet'}
          >
            <FiBookOpen /> Make an Order
          </button>
          <button className="primary-button" onClick={onReserveTable} type="button">
            <FiCalendar /> Reserve a Table
          </button>
        </div>
      </div>

      {loading ? (
        <div>
          <div style={{ marginBottom: '24px' }}>
            <LoaderSkeleton width={180} height={24} borderRadius={4} style={{ marginBottom: '16px' }} />
            <div className="menu-grid">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <MenuCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      ) : (
        categories.map((category) => {
          const categoryItems = menuItems.filter((item) => item.category === category);
          return (
            <section key={category} className="menu-category-section">
              <h2>{category}</h2>
              <div className="menu-grid">
                {categoryItems.map((item) => (
                  <article className="menu-card" key={item.id}>
                    <div className="food-image" style={{ backgroundImage: `url(${item.image})` }}>
                      <span className="category-tag">{item.category}</span>
                    </div>
                    <div className="menu-card-body">
                      <div>
                        <h3>{item.name}</h3>
                        <p>{item.description}</p>
                        <strong>KES {item.price.toLocaleString()}</strong>
                        {item.portion && <span className="portion">({item.portion})</span>}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })
      )}
    </main>
  );
};

export default FullMenu;
