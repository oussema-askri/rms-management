// src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { setUnauthorizedHandler } from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  // A 401 from any request means the stored token is no longer usable, so drop
  // the in-memory session too and let the navigator fall back to the login screen.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setToken(null);
      setUser(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const loadStoredAuth = async () => {
    try {
      const remembered = await AsyncStorage.getItem('rememberMe');
      const storedToken = await AsyncStorage.getItem('token');
      const storedUser = await AsyncStorage.getItem('user');

      if (remembered === 'true' && storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } else {
        // Not remembered — clear any leftover session data
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
      }
    } catch (error) {
      console.error('Error loading auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, rememberMe = false) => {
    try {
      const response = await api.post('/auth/login', { email, password });

      const { token: newToken, user: userData } = response.data;

      // Always store token for current session (axios interceptor needs it)
      await AsyncStorage.setItem('token', newToken);
      await AsyncStorage.setItem('user', JSON.stringify(userData));

      // Only persist the "remember me" flag for next app launch
      if (rememberMe) {
        await AsyncStorage.setItem('rememberMe', 'true');
      } else {
        await AsyncStorage.removeItem('rememberMe');
      }

      setToken(newToken);
      setUser(userData);

      return { success: true };
    } catch (error) {
      // Deliberately not logging the email or the response body here: these
      // lines end up in device logs and crash reports.
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Erreur de connexion'
      };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('rememberMe');
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const isRH = () => user?.role === 'rh' || user?.role === 'admin';
  const isAdmin = () => user?.role === 'admin';
  const isEmployer = () => user?.role === 'employer';
  const isResponsable = () => user?.role === 'responsable';
  const isComptable = () => user?.role === 'comptable';
  const canManageEmployees = () => ['rh', 'admin', 'responsable'].includes(user?.role);

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      logout,
      isAuthenticated: !!token,
      isRH,
      isAdmin,
      isEmployer,
      isResponsable,
      isComptable,
      canManageEmployees,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;