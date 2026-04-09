import React, { createContext, useContext, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import * as api from '../src/api';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [paymentState, setPaymentState] = useState('idle'); // idle | processing | success

  const login = async (username, password) => {
    const res = await api.login(username, password);
    setUser(res.data);
    return res.data;
  };

  const logout = () => {
    setUser(null);
    setCartItems([]);
    setOrders([]);
  };

  const fetchOrders = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.getOrders(user.user_id);
      setOrders(res.data);
    } catch {
      setOrders([]);
    }
  }, [user]);

  const addToCart = (item) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.food_id === item.food_id);
      if (existing) {
        return prev.map((i) =>
          i.food_id === item.food_id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (item, delta) => {
    setCartItems((prev) => {
      const updated = prev.map((i) =>
        i.food_id === item.food_id ? { ...i, quantity: i.quantity + delta } : i
      );
      return updated.filter((i) => i.quantity > 0);
    });
  };

  const clearCart = () => setCartItems([]);

  const placeOrder = async () => {
    if (!user) return;
    setPaymentState('processing');
    try {
      await api.checkout(user.user_id, cartItems);
      setTimeout(() => {
        setPaymentState('success');
        setCartItems([]);
        fetchOrders();
        setTimeout(() => setPaymentState('idle'), 2500);
      }, 1500);
    } catch {
      setPaymentState('idle');
      Alert.alert('Error', 'Order failed. Please try again.');
    }
  };

  const clearHistory = async () => {
    if (!user) return;
    await api.clearOrders(user.user_id);
    setOrders([]);
  };

  const updateAddress = async (address) => {
    if (!user) return;
    const res = await api.updateAddress(user.user_id, address);
    setUser((prev) => ({ ...prev, address: res.data.address }));
  };

  const cartCount = cartItems.reduce((acc, i) => acc + i.quantity, 0);
  const cartTotal = cartItems.reduce((acc, i) => acc + i.price * i.quantity, 0);

  return (
    <AppContext.Provider
      value={{
        user, login, logout, updateAddress,
        cartItems, cartCount, cartTotal, addToCart, updateQuantity, clearCart,
        orders, fetchOrders, clearHistory,
        paymentState, placeOrder,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
