import React, { useState, useEffect } from 'react';
import Cart from './Cart';
import { mockCategories, mockRecommendations } from './mockData.js';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginErr, setLoginErr] = useState('');

  const [weight, setWeight] = useState('');
  const [goal, setGoal] = useState('bulking');
  const [topN, setTopN] = useState(5);
  const [category, setCategory] = useState('');
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [cartItems, setCartItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [paymentState, setPaymentState] = useState('idle');
  const [showProfile, setShowProfile] = useState(false);
  const [addressInput, setAddressInput] = useState('');
  const [savingAddress, setSavingAddress] = useState(false);

  const restaurants = {
    'Vegetarian': 'Green Earth Eats',
    'Vegan': 'Plant Power Kitchen',
    'Low Carb': 'Keto Clean',
    'High Protein': 'Muscle Meals',
    'Balanced': 'Cloud 9 Diners'
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (user) fetchOrders();
  }, [user]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginErr('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUser, password: loginPass })
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data);
      } else {
        setLoginErr(data.error || 'Login failed');
      }
    } catch (err) {
      setLoginErr('Backend offline');
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategories(data);
    } catch (err) {
      setCategories(mockCategories);
    }
  };

  const fetchOrders = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/orders?user_id=${user.user_id}`);
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      setOrders([]);
    }
  };

  const clearHistory = async () => {
    if (!window.confirm('Are you sure you want to clear your order history?')) return;
    try {
      await fetch('/api/orders/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.user_id })
      });
      fetchOrders();
    } catch (err) {
      console.error(err);
    }
  };

  const saveAddress = async (e) => {
    e.preventDefault();
    setSavingAddress(true);
    try {
      const res = await fetch('/api/user/address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.user_id, address: addressInput })
      });
      if (res.ok) {
        setUser(prev => ({ ...prev, address: addressInput }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingAddress(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setShowProfile(false);
    setCartItems([]);
    setOrders([]);
  };

  const handleRecommend = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weight: parseFloat(weight), goal, top_n: parseInt(topN), category })
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        // Fallback to mock data
        setTimeout(() => {
          setRecommendations(mockRecommendations);
        }, 1000);
      } else {
        setRecommendations(data);
      }
    } catch (err) {
      setError('Backend down - using mock data');
      setTimeout(() => {
        setRecommendations(mockRecommendations);
      }, 1500);
    }
    setLoading(false);
  };

  const addToCart = async (rec) => {
    setCartItems(prev => {
      const existing = prev.find(i => i.food_id === rec.food_id);
      if (existing) {
        return prev.map(i => i.food_id === rec.food_id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...rec, quantity: 1 }];
    });
  };

  const checkout = async (items) => {
    setPaymentState('processing');
    try {
      await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.user_id, items: items })
      });
      
      setTimeout(() => {
        setPaymentState('success');
        setCartItems([]);
        fetchOrders();
        setTimeout(() => {
          setPaymentState('idle');
          setShowCart(false);
        }, 2000);
      }, 1500); // Wait briefly to mimic gateway
    } catch {
      setPaymentState('idle');
    }
  };

  if (!user) {
    return (
      <div className="login-overlay">
        <div className="login-backdrop"></div>
        <div className="login-card">
          <h2>MacroCloud</h2>
          <p>Login or register to curate your physique meals.</p>
          <form onSubmit={handleLogin}>
            <input type="text" placeholder="Username" value={loginUser} onChange={e => setLoginUser(e.target.value)} required />
            <input type="password" placeholder="Password" value={loginPass} onChange={e => setLoginPass(e.target.value)} required />
            {loginErr && <div style={{color: '#ff6b6b', fontSize: '0.9rem'}}>{loginErr}</div>}
            <button className="submit-btn" type="submit">Unlock Dining</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="App" onClick={(e) => {
      // auto close profile modal if clicking outside
      if (!e.target.closest('.profile-modal') && !e.target.closest('.profile-trigger')) {
        setShowProfile(false);
      }
    }}>
      <nav className="navbar">
        <h1>MacroCloud</h1>
        <div style={{display: 'flex', gap: '20px', alignItems: 'center', position: 'relative'}}>
          <span 
            className="profile-trigger"
            style={{fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: '15px'}} 
            onClick={() => setShowProfile(!showProfile)}
          >
            Hi, {user.username} ▼
          </span>
          {showProfile && (
            <div className="profile-modal">
              <h4>My Profile</h4>
              <div className="address-box">
                <strong>Delivery Address:</strong><br/>
                {user.address ? user.address : 'Address not set'}
              </div>
              <button className="logout-btn" onClick={handleLogout}>Log Out</button>
            </div>
          )}
          <button onClick={() => setShowCart(!showCart)} className="cart-toggle">
            🛒 Cart ({cartItems.reduce((acc, item) => acc + item.quantity, 0)})
          </button>
        </div>
      </nav>

      {user && !user.address && (
        <div className="cart-overlay" style={{zIndex: 2500}}>
          <div className="login-card" style={{margin: 'auto', marginTop: '150px'}}>
            <h2>Delivery Details</h2>
            <p>Where are we sending your curated meals?</p>
            <form onSubmit={saveAddress}>
              <input type="text" placeholder="Enter full block/street address" value={addressInput} onChange={e => setAddressInput(e.target.value)} required />
              <button className="submit-btn" type="submit" disabled={savingAddress}>
                {savingAddress ? 'Saving...' : 'Save Address'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showCart && (
        <div className="cart-overlay" onClick={(e) => {if(e.target.className === 'cart-overlay') setShowCart(false)}}>
          <Cart 
            cartItems={cartItems}
            paymentState={paymentState}
            onAdd={(item) => setCartItems(prev => prev.map(i => i.food_id === item.food_id ? {...i, quantity: i.quantity+1} : i))}
            onRemove={(item) => {
              if (item.quantity > 1) setCartItems(prev => prev.map(i => i.food_id === item.food_id ? {...i, quantity: i.quantity-1} : i));
              else setCartItems(prev => prev.filter(i => i.food_id !== item.food_id));
            }}
            onCheckout={checkout}
          />
        </div>
      )}

      <div className="hero">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h2>Premium Smart Dining</h2>
          <p>AI-driven high performance meals crafted for your physique goals.</p>
          
          <form onSubmit={handleRecommend}>
            <div className="form-group">
              <label>Body Weight (kg)</label>
              <input type="number" placeholder="Eg. 75" value={weight} onChange={e => setWeight(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Fitness Goal</label>
              <select value={goal} onChange={e => setGoal(e.target.value)}>
                <option value="bulking">Bulking</option>
                <option value="cutting">Cutting</option>
                <option value="lean_bulk">Lean Bulk</option>
              </select>
            </div>
            <div className="form-group">
              <label>Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}>
                <option value="">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Results</label>
              <input type="number" placeholder="Top N" value={topN} onChange={e => setTopN(e.target.value)} min="1" max="20" />
            </div>
            <button className="submit-btn" type="submit" disabled={loading}>
              {loading ? 'Curating AI...' : 'Curate Meals'}
            </button>
          </form>
        </div>
      </div>

      <main>
        {recommendations && (
          <section className="recommend-section">
            <h3 className="section-title">
              Top Chef Recommendations
              <span>Match optimized for {recommendations.user_profile.goal.replace('_', ' ')} protocol</span>
            </h3>
            
            <div className="meals-grid">
              {recommendations.recommendations.map(rec => (
                <div key={rec.rank} className="meal-card">
                  <div className="meal-rank">#{rec.rank}</div>
                  <h4>{rec.meal_name}</h4>
                  <div className="restaurant-label">🍴 {restaurants[rec.category] || 'Swiggy Cloud'}</div>
                  <div className="meal-category">{rec.category} • Match: {(rec.match_score*100).toFixed(0)}%</div>
                  
                  <div className="macros">
                    <div className="macro-box"><span>Calories</span><strong>{rec.calories} kcal</strong></div>
                    <div className="macro-box"><span>Protein</span><strong>{rec.protein_g}g</strong></div>
                    <div className="macro-box"><span>Carbs</span><strong>{rec.carbs_g}g</strong></div>
                    <div className="macro-box"><span>Fat</span><strong>{rec.fat_g}g</strong></div>
                  </div>
                  
                  <div className="meal-footer">
                    <div className="meal-price">₹{rec.price}</div>
                    <button className="add-btn" onClick={() => addToCart(rec)}>
                      + ADD
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="orders-section">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '30px', paddingBottom: '15px'}}>
            <h2 className="section-title" style={{borderBottom: 'none', margin: 0, padding: 0}}>Recent Orders</h2>
            {orders.length > 0 && (
              <button 
                onClick={clearHistory} 
                style={{background: 'rgba(255, 107, 107, 0.1)', color: '#ff6b6b', border: '1px solid rgba(255, 107, 107, 0.3)', padding: '8px 20px', borderRadius: '20px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.3s'}}
                onMouseOver={e => {e.target.style.background='#ff6b6b'; e.target.style.color='#fff';}}
                onMouseOut={e => {e.target.style.background='rgba(255, 107, 107, 0.1)'; e.target.style.color='#ff6b6b';}}
              >
                🗑 Clear History
              </button>
            )}
          </div>
          <div className="orders-list">
            {orders.slice(0,5).map(order => (
              <div key={order.id} className="order-item">
                <div>
                  <div className="order-meta">Order #{order.id} • {order.status}</div>
                  <div className="order-desc">{order.items}</div>
                </div>
                <div className="meal-price">₹{order.total_amount}</div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {cartItems.length > 0 && !showCart && (
        <div className="swiggy-bottom-cart" onClick={() => setShowCart(true)}>
          <div className="cart-summary-text">
            <span>{cartItems.reduce((acc, item) => acc + item.quantity, 0)} ITEM{cartItems.reduce((acc, item) => acc + item.quantity, 0) > 1 ? 'S' : ''}</span>
            <span> | </span>
            <span>₹{cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0).toFixed(0)}</span>
          </div>
          <div className="view-cart-btn">
            VIEW CART ➔
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

