import React from 'react';
import { FiArrowRight, FiArrowLeft, FiClock, FiMinus, FiPlus, FiShield, FiShoppingBag, FiTrash2 } from 'react-icons/fi';
import { Summary } from './shared';
import { CartItemSkeleton, LoaderSkeleton } from '../../components/ui/loaders-skeleton';

const Cart = ({ cart, subtotal, changeQuantity, onCheckout, onMenu, user, onBack, loading = false }) => {
  const itemCount = cart.reduce((total, item) => total + item.quantity, 0);

  return (
    <main className="content-page cart-page">
      <header className="cart-heading">
        <div className="cart-heading-copy">
          <p className="eyebrow">Almost there</p>
          <h1>Your cart</h1>
          <span>{loading ? 'Updating your selections...' : `${itemCount} ${itemCount === 1 ? 'item' : 'items'} ready for checkout`}</span>
        </div>
        {user && <button className="cart-back-button" onClick={onBack} type="button"><FiArrowLeft /> Back</button>}
      </header>

      {loading ? (
        <div className="cart-loading-state">
          <div className="cart-list">
            {[1, 2, 3].map((n) => (
              <CartItemSkeleton key={n} />
            ))}
          </div>
          <div style={{ background: 'var(--surface-raised)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <LoaderSkeleton width={80} height={14} borderRadius={4} />
              <LoaderSkeleton width={100} height={14} borderRadius={4} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid var(--border-soft)' }}>
              <LoaderSkeleton width={60} height={18} borderRadius={4} />
              <LoaderSkeleton width={120} height={18} borderRadius={4} />
            </div>
          </div>
          <LoaderSkeleton width="100%" height={48} borderRadius={8} />
        </div>
      ) : cart.length ? (
        <div className="cart-layout">
          <section className="cart-items-panel" aria-label="Cart items">
            <div className="cart-panel-heading">
              <div>
                <span className="cart-section-kicker">Your selections</span>
                <h2>Ready when you are</h2>
              </div>
              <span className="cart-item-count">{cart.length} {cart.length === 1 ? 'line item' : 'line items'}</span>
            </div>
            <div className="cart-list">
              {cart.map((item) => (
                <article className="cart-item" key={item.id}>
                  <div className="cart-thumb" style={item.image ? { backgroundImage: `url(${item.image})` } : undefined}>
                    {!item.image && <FiShoppingBag aria-hidden="true" />}
                  </div>
                  <div className="cart-item-copy">
                    <span className="cart-item-category">{item.category || 'Château selection'}</span>
                    <h3>{item.name}</h3>
                    <span className="cart-item-unit">KES {Number(item.price).toLocaleString()} each</span>
                  </div>
                  <div className="cart-item-actions">
                    <div className="quantity" aria-label={`Quantity for ${item.name}`}>
                      <button type="button" onClick={() => changeQuantity(item.id, -1)} aria-label={`Decrease ${item.name}`}><FiMinus /></button>
                      <b>{item.quantity}</b>
                      <button type="button" onClick={() => changeQuantity(item.id, 1)} aria-label={`Increase ${item.name}`}><FiPlus /></button>
                    </div>
                    <strong className="cart-item-total">KES {(Number(item.price) * item.quantity).toLocaleString()}</strong>
                    <button className="cart-remove" type="button" onClick={() => changeQuantity(item.id, -item.quantity)} aria-label={`Remove ${item.name}`} title="Remove item"><FiTrash2 /></button>
                  </div>
                </article>
              ))}
            </div>
          </section>
          <aside className="cart-summary-card">
            <div className="cart-summary-heading">
              <span className="cart-section-kicker">Order total</span>
              <h2>Summary</h2>
            </div>
            <Summary subtotal={subtotal} />
            <div className="cart-assurance">
              <div><FiClock /><span>Freshly prepared<br /><small>Estimated delivery: 45–60 min</small></span></div>
              <div><FiShield /><span>Secure checkout<br /><small>Your details stay protected</small></span></div>
            </div>
            <button className="primary-button full cart-checkout-button" onClick={onCheckout}>
              Continue to checkout <FiArrowRight />
            </button>
          </aside>
        </div>
      ) : (
        <div className="cart-empty-state">
          <div className="cart-empty-icon"><FiShoppingBag /></div>
          <span className="cart-section-kicker">Nothing here yet</span>
          <h2>Your cart is waiting for something delicious.</h2>
          <p>Explore our menus and find something made for your next Château moment.</p>
          <button className="primary-button" onClick={onMenu}>Browse menu <FiArrowRight /></button>
        </div>
      )}

      {!loading && cart.length > 0 && <button className="cart-continue-button" onClick={onMenu}><FiArrowLeft /> Continue browsing</button>}
    </main>
  );
};

export default Cart;
