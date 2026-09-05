import { FiArrowLeft, FiPlus, FiShoppingBag } from 'react-icons/fi';

const DetailFacts = ({ item }) => {
  if (item.category !== 'Wine') return null;

  return <div className="detail-facts">
    <div><span>Style</span><strong>{item.type}</strong></div>
    <div><span>Region</span><strong>{item.region}</strong></div>
    <div><span>Grape</span><strong>{item.grape}</strong></div>
  </div>;
};

const ViewItem = ({ item, addToCart, onBack, onCart }) => {
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
        <DetailFacts item={item} />
        <button className="primary-button detail-add" onClick={() => addToCart(item)}><FiPlus /> Add to cart</button>
        <button className="detail-cart" onClick={onCart}><FiShoppingBag /> View cart</button>
      </div>
    </div>
  </main>;
};

export default ViewItem;
