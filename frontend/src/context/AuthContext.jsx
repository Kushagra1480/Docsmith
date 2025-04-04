import React, { createContext, useState, useContext, useEffect } from 'react';
import { login, register, getStoredAuth } from '../services/auth';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedAuth = getStoredAuth();
    if (storedAuth) {
      setCurrentUser(storedAuth);
    }
    setLoading(false);
  }, []);

  async function loginUser(username, password) {
    try {
      const userData = await login(username, password);
      setCurrentUser(userData);
      return userData;
    } catch (error) {
      throw error;
    }
  }

  async function registerUser(username, password) {
    try {
      const userData = await register(username, password);
      setCurrentUser(userData);
      return userData;
    } catch (error) {
      throw error;
    }
  }

  function logout() {
    localStorage.removeItem('auth');
    setCurrentUser(null);
  }

  const value = {
    currentUser,
    loginUser,
    registerUser,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}