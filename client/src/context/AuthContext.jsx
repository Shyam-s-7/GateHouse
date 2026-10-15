import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('gatehouse_token') || null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/api/auth/me');
        setUser(res.data.user);
      } catch (err) {
        console.error('Session validation failed:', err);
        localStorage.removeItem('gatehouse_token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [token]);

  const login = async (email, password) => {
    try {
      const res = await api.post('/api/auth/login', { email, password });
      const { token: newToken, user: userData } = res.data;
      localStorage.setItem('gatehouse_token', newToken);
      setToken(newToken);
      setUser(userData);
      toast.success(`Welcome back, ${userData.name}!`);
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please check your credentials.';
      toast.error(msg);
      return { success: false, message: msg };
    }
  };

  const register = async (name, email, password, organization) => {
    try {
      const res = await api.post('/api/auth/register', { name, email, password, organization });
      const { token: newToken, user: userData } = res.data;
      localStorage.setItem('gatehouse_token', newToken);
      setToken(newToken);
      setUser(userData);
      toast.success(`Account created! Welcome to Gatehouse, ${userData.name}.`);
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed.';
      toast.error(msg);
      return { success: false, message: msg };
    }
  };

  const quickDemoLogin = async () => {
    try {
      const res = await api.post('/api/auth/demo');
      const { token: newToken, user: userData } = res.data;
      localStorage.setItem('gatehouse_token', newToken);
      setToken(newToken);
      setUser(userData);
      toast.success(`Welcome, ${userData.name}! Exploring Gatehouse in demo mode.`);
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || 'Demo login failed. Please try again.';
      toast.error(msg);
      return { success: false, message: msg };
    }
  };

  const logout = () => {
    localStorage.removeItem('gatehouse_token');
    setToken(null);
    setUser(null);
    toast.info('You have been signed out.');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        quickDemoLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
