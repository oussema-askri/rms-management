import React, { createContext, useState, useEffect } from 'react';
import { authAPI, setUnauthorizedHandler } from '../services/api';
import { getToken, setToken, clearToken } from '../services/session';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (token) {
      getCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

  // Any 401 means the stored token is no longer usable, so drop the session and
  // let the router send the user back to the login screen.
  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    return () => setUnauthorizedHandler(null);
  }, []);

  const getCurrentUser = async () => {
    try {
      const response = await authAPI.getCurrentUser();
      setUser(response.data.user);
    } catch (error) {
      // Only a 401 means the token is dead; the api interceptor has already
      // cleared it. A network drop or a server error must not sign the user
      // out, or every blip during a reload looks like a lost session.
      console.error('Error getting current user:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      const { token, user } = response.data;
      
      setToken(token);
      setUser(user);
      
      return { success: true, user };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Connexion impossible. Vérifiez votre connexion internet.'
      };
    }
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    isEmployer: user?.role === 'employer',
    isRH: user?.role === 'rh',
    isAdmin: user?.role === 'admin',
    isResponsable: user?.role === 'responsable',
    isComptable: user?.role === 'comptable',
    canManageEmployees: ['rh', 'admin', 'responsable'].includes(user?.role),
    canApproveExpenses: ['rh', 'admin'].includes(user?.role),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};