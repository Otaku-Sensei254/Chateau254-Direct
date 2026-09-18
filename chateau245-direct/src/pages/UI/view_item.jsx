import { useState } from 'react';
import { FiArrowLeft, FiPlus, FiShoppingBag, FiTag, FiCheckCircle, FiClipboard, FiRadio, FiExternalLink, FiCoffee } from 'react-icons/fi';

const DetailFacts = ({ item, onWineFactSelect }) => {
  if (item.category !== 'Wine') return null;

  const facts = [
    { label: 'Style', field: 'type', value: item.type },
    { label: 'Region', field: 'region', value: item.region },
    { label: 'Grape', field: 'grape', value: item.grape },
  ];

  return <div className="detail-facts">
    {facts.map((fact) => (
      <button
        className="detail-fact"
        key={fact.label}
        type="button"
        aria-label={fact.value}
        onClick={() => onWineFactSelect?.(fact.field, fact.value)}
      >
        <span>{fact.label}</span>
        <strong>{fact.value}</strong>
      </button>
    ))}
  </div>;
};

const WinePairing = ({ winePairing, onWinePairingSelect }) => {
  if (!winePairing) return null;
  return (
    <div className="wine-pairing-section">
      <h3><FiCoffee /> Wine Pairing</h3>
      <div className="wine-pairing-grid">
        <button className="pairing-card" type="button" onClick={() => onWinePairingSelect?.(winePairing.primary)}>
          <div className="recom">
          <div className="pairing-label">Recommended</div>
          <div className="recom-inner">
          <strong>{winePairing.primary}</strong>
          <FiExternalLink className="pairing-link" />

          </div>

          </div>
        </button>
        <button className="pairing-card" type="button" onClick={() => onWinePairingSelect?.(winePairing.alternative)}>
          <div className="recom">
          <div className="pairing-label">Alternative</div>
          <div className="recom-inner">
          <strong>{winePairing.alternative}</strong>
          <FiExternalLink className="pairing-link" />

          </div>

          </div>
        </button>
      </div>
      {winePairing.reasoning && (
        <p className="pairing-reasoning">{winePairing.reasoning}</p>
      )}
    </div>
  );
};

const ComponentsList = ({ components }) => {
  if (!components?.length) return null;
  return (
    <div className="components-section">
      <h3><FiClipboard /> What's Included</h3>
      <ul className="components-list">
        {components.map((comp, i) => (
          <li key={i}><FiCheckCircle /> {comp}</li>
        ))}
      </ul>
    </div>
  );
};

const PricingOptions = ({ pricing, price, selectedOption, onSelectOption }) => {
  if (!pricing) return null;
  const { meal_only_kes, wine_only_kes, standalone_total_kes, bundle_price_with_wine_kes, you_save_kes, you_save_percent, display_text } = pricing;

  const options = [
    { key: 'bundle', label: 'Bundle (meal + wine)', price: bundle_price_with_wine_kes, savings: you_save_kes && you_save_percent ? `Save KES ${you_save_kes.toLocaleString()} (${you_save_percent}%)` : null },
    { key: 'separate', label: 'Meal + Wine (separate)', price: standalone_total_kes, savings: null },
    { key: 'meal', label: 'Meal only', price: meal_only_kes, savings: null },
    { key: 'wine', label: 'Wine only', price: wine_only_kes, savings: null },
  ].filter(opt => opt.price != null);

  return (
    <div className="pricing-section">
      <h3><FiTag /> Choose Option</h3>
      <div className="pricing-options">
        {options.map((opt) => (
          <label className={`pricing-option ${selectedOption === opt.key ? 'selected' : ''}`} key={opt.key} onClick={() => onSelectOption(opt.key, opt.price)}>
            <input
              type="radio"
              name="pricing-option"
              value={opt.key}
              checked={selectedOption === opt.key}
            />
            <FiRadio className="radio-icon" />
            <div className="option-content">
              <div className="option-header">
                <strong>{opt.label}</strong>
                <span className="option-price">KES {opt.price.toLocaleString()}</span>
              </div>
              {opt.savings && <div className="option-savings">{opt.savings}</div>}
            </div>
          </label>
        ))}
      </div>
      {display_text && <p className="pricing-display">{display_text}</p>}
    </div>
  );
};

const ViewItem = ({ item, addToCart, onBack, onCart, onWineFactSelect, onWinePairingSelect }) => {
  const [selectedPricing, setSelectedPricing] = useState('bundle');
  const [selectedPrice, setSelectedPrice] = useState(item?.price || 0);

  if (!item) return <main className="content-page empty-state"><p>We could not find that item.</p><button className="primary-button" onClick={onBack}>Back to menu</button></main>;

  const handlePricingSelect = (key, price) => {
    setSelectedPricing(key);
    setSelectedPrice(price);
  };

  return <main className="content-page item-detail-page">
    <button className="detail-back" onClick={onBack}><FiArrowLeft /> Back to menu</button>
    <div className="item-detail">
      <div className="detail-image" style={{ backgroundImage: `url(${item.image})` }}><span className="category-tag">{item.category}</span></div>
      <div className="detail-copy">
        <p className="eyebrow">Château254 selection</p>
        <h1>{item.name}</h1>
        <strong className="detail-price">KES {selectedPrice.toLocaleString()}</strong>
        <p className="detail-description">{item.description}</p>
        {item.notes && <div className="tasting-notes"><span>Tasting notes</span><p>{item.notes}</p></div>}

        <WinePairing winePairing={item.winePairing} onWinePairingSelect={onWinePairingSelect} />
        <ComponentsList components={item.components} />
        <PricingOptions pricing={item.pricing} price={item.price} selectedOption={selectedPricing} onSelectOption={handlePricingSelect} />

        <DetailFacts item={item} onWineFactSelect={onWineFactSelect} />
        <button className="primary-button detail-add" onClick={() => addToCart({ ...item, price: selectedPrice })}><FiPlus /> Add to cart</button>
        <button className="detail-cart" onClick={onCart}><FiShoppingBag /> View cart</button>
      </div>
    </div>
  </main>;
};

export default ViewItem;