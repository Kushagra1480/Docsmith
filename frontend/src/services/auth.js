import api from './api';

export function getStoredAuth() {
  try {
    const auth = localStorage.getItem('auth');
    return auth ? JSON.parse(auth) : null;
  } catch (error) {
    // If parsing fails, the stored value might be the token itself
    console.error('Error parsing auth data:', error);
    localStorage.removeItem('auth'); // Clear the invalid data
    return null;
  }
}

export async function login(username, password) {
  try {
    const response = await api.post('/login', { username, password });
    const userData = response.data;
    localStorage.setItem('auth', JSON.stringify(userData));
    return userData;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Login failed');
  }
}

export async function register(username, password) {
  try {
    const response = await api.post('/register', { username, password });
    const userData = response.data;
    localStorage.setItem('auth', JSON.stringify(userData));
    return userData;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Registration failed');
  }
}