import React from 'react';

const Cart = ({ cartItems, onAdd, onRemove, onCheckout, paymentState }) => {
  const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (paymentState === 'processing') {
    return (
      <div className="cart-panel">
        <div className="payment-overlay">
          <div className="spinner"></div>
          <h3>Processing Payment...</h3>
          <p>Please wait securely.</p>
        </div>
      </div>
    );
  }

  if (paymentState === 'success') {
    return (
      <div className="cart-panel">
        <div className="payment-overlay">
          <div className="payment-success">✓</div>
          <h3>Payment Successful!</h3>
          <p>Your order is placed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-panel">
      <h3>🛒 Shopping Cart ({cartItems.length})</h3>
      {cartItems.length === 0 ? (
        <p>Your cart is empty. Add AI-recommended meals!</p>
      ) : (
        <>
          <div className="cart-items">
            {cartItems.map(item => (
              <div key={item.food_id || item.rank} className="cart-item">
                <div className="item-details">
                  <strong>{item.meal_name || item.food_name}</strong>
                  <br />
                  ₹{item.price} × {item.quantity} = ₹{(item.price * item.quantity).toFixed(0)}
                </div>
                <div className="quantity-controls">
                  <button onClick={() => onRemove(item)}>-</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => onAdd(item)}>+</button>
                </div>
              </div>
            ))}
          </div>
          <div className="cart-footer">
            <div className="total">
              <strong>Total: ₹{total.toFixed(0)}</strong>
            </div>
            <button className="checkout-btn" onClick={() => onCheckout(cartItems)}>
              ✅ Place Order
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Cart;

