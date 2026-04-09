import axios from 'axios';

// ⚠️ Replace this with your PC's local IP address when running on a physical device
// Run `ipconfig` in terminal and use the IPv4 Address (e.g., 192.168.1.x)
// For Android Emulator, use: http://10.0.2.2:5000
const BASE_URL = 'http://10.215.231.205:5000/';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

export const login = (username, password) =>
  api.post('/api/login', { username, password });

export const getCategories = () =>
  api.get('/api/categories');

export const getRecommendations = (weight, goal, top_n, category) =>
  api.post('/api/recommend', { weight, goal, top_n, category });

export const checkout = (user_id, items) =>
  api.post('/api/checkout', { user_id, items });

export const getOrders = (user_id) =>
  api.get(`/api/orders?user_id=${user_id}`);

export const clearOrders = (user_id) =>
  api.post('/api/orders/clear', { user_id });

export const updateAddress = (user_id, address) =>
  api.post('/api/user/address', { user_id, address });

export default api;
