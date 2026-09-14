import { FiArrowLeft, FiPlus, FiShoppingBag } from 'react-icons/fi';

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

const ViewItem = ({ item, addToCart, onBack, onCart, onWineFactSelect }) => {
  if (!item) return <main className="content-page empty-state"><p>We could not find that item.</p><button className="primary-button" onClick={onBack}>Back to menu</button></main>;

  return <main className="content-page item-detail-page">
    <button className="detail-back" onClick={onBack}><FiArrowLeft /> Back to menu</button>
    <div className="item-detail">
      <div className="detail-image" style={{ backgroundImage: `url(${item.image})` }}><span className="category-tag">{item.category}</span></div>
      <div className="detail-copy">
        <p className="eyebrow">Château254 selection</p>
        <h1>{item.name}</h1>
        <strong className="detail-price">KES {item.price.toLocaleString()}</strong>
        <p className="detail-description">{item.description}</p>
        {item.notes && <div className="tasting-notes"><span>Tasting notes</span><p>{item.notes}</p></div>}
        <DetailFacts item={item} onWineFactSelect={onWineFactSelect} />
        <button className="primary-button detail-add" onClick={() => addToCart(item)}><FiPlus /> Add to cart</button>
        <button className="detail-cart" onClick={onCart}><FiShoppingBag /> View cart</button>
      </div>
    </div>
  </main>;
};

export default ViewItem;
