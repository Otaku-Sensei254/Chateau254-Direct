import React from 'react';
import { FiArrowRight, FiArrowLeft, FiMinus, FiPlus, FiShoppingBag } from 'react-icons/fi';
import { Summary } from './shared';
import { CartItemSkeleton, LoaderSkeleton } from '../../components/ui/loaders-skeleton';

const Cart = ({ cart, subtotal, delivery, changeQuantity, onCheckout, onMenu, user, onBack, loading = false }) => {
  return (
    <main className="content-page cart-page">
      <div className="page-title">
        <p className="eyebrow">Almost there</p>
        <div className="nav0back">
          {user && (
            <button className="back-button" onClick={onBack} type="button">
              <FiArrowLeft />
            </button>
          )}
        </div>
        <span>{loading ? 'Updating items...' : `${cart.length} items selected`}</span>
      </div>

      {loading ? (
        <div className="cart-loading-state">
          <div className="cart-list">
            {[1, 2, 3].map((n) => (
              <CartItemSkeleton key={n} />
            ))}
          </div>
          <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #e9e1dc', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <LoaderSkeleton width={80} height={14} borderRadius={4} />
              <LoaderSkeleton width={100} height={14} borderRadius={4} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <LoaderSkeleton width={90} height={14} borderRadius={4} />
              <LoaderSkeleton width={70} height={14} borderRadius={4} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid #f4eee9' }}>
              <LoaderSkeleton width={60} height={18} borderRadius={4} />
              <LoaderSkeleton width={120} height={18} borderRadius={4} />
            </div>
          </div>
          <LoaderSkeleton width="100%" height={48} borderRadius={8} />
        </div>
      ) : cart.length ? (
        <>
          <div className="cart-list">
            {cart.map((item) => (
              <div className="cart-item" key={item.id}>
                <div className="thumb" style={{ backgroundImage: `url(${item.image})` }} />
                <div className="cart-item-copy">
                  <h2>{item.name}</h2>
                  <span>KES {item.price.toLocaleString()}</span>
                </div>
                <div className="quantity">
                  <button onClick={() => changeQuantity(item.id, -1)}>
                    <FiMinus />
                  </button>
                  <b>{item.quantity}</b>
                  <button onClick={() => changeQuantity(item.id, 1)}>
                    <FiPlus />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Summary subtotal={subtotal} delivery={delivery} />
          <button className="primary-button full" onClick={onCheckout}>
            Checkout <FiArrowRight />
          </button>
        </>
      ) : (
        <div className="empty-state">
          <FiShoppingBag />
          <p>Your cart is waiting for something delicious.</p>
          <button className="primary-button" onClick={onMenu}>
            Browse menu
          </button>
        </div>
      )}
    </main>
  );
};

export default Cart;
