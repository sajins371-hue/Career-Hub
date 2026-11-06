import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('app_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);

  const persist = useCallback((token, userData) => {
    localStorage.setItem('app_token', token);
    localStorage.setItem('app_user', JSON.stringify(userData));
    setUser(userData);
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const { token, user: userData } = await authApi.login({ email, password });
      persist(token, userData);
      return userData;
    } finally {
      setLoading(false);
    }
  }, [persist]);

  const register = useCallback(async (data) => {
    setLoading(true);
    try {
      const result = await authApi.register(data);
      if (result.token) persist(result.token, result.user);
      return result;
    } finally {
      setLoading(false);
    }
  }, [persist]);

  const refreshUser = useCallback(async () => {
    const result = await authApi.me();
    const userData = result.user;
    localStorage.setItem('app_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('app_token');
    localStorage.removeItem('app_user');
    setUser(null);
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => setUser(null);
    window.addEventListener('app:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('app:unauthorized', handleUnauthorized);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, refreshUser, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
