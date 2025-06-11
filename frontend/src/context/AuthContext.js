import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI, usersAPI } from '../services/api';
import { isTokenExpired, clearAuthData } from '../utils/auth';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentOrganization, setCurrentOrganization] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (token) {
          // Check if the token is expired using our utility function
          if (isTokenExpired(token)) {
            // Token is expired - try to refresh
            const refreshToken = localStorage.getItem('refreshToken');
            if (!refreshToken) {
              throw new Error('No refresh token available');
            }
            
            try {
              const response = await authAPI.refreshToken(refreshToken);
              const newToken = response.data.access;
              localStorage.setItem('token', newToken);
              setToken(newToken);
              return; // Exit early as setToken will trigger this effect again
            } catch (refreshError) {
              throw new Error('Token refresh failed');
            }
          }

          // Get complete user profile from API instead of decoding JWT
          try {
            const response = await usersAPI.getProfile();
            const userData = response.data;
            
            // Set user data
            setCurrentUser(userData);
            
            // Extract organization data from user profile
            if (userData.organization_name) {
              setCurrentOrganization({
                name: userData.organization_name,
                id: userData.organization_id || null,
                // Add any other organization fields that might be available
              });
            }
          } catch (profileError) {
            console.error('Could not fetch user profile:', profileError);
            throw profileError;
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        clearAuthData();
        setToken(null);
        setCurrentUser(null);
        setCurrentOrganization(null);
      } finally {
        setLoading(false);
        setAuthInitialized(true);
      }
    };
    
    initAuth();
  }, [token]);  const login = async (username, password) => {
    try {
      const response = await authAPI.login({
        username,
        password,
      });
      
      const { access, refresh } = response.data;
      
      localStorage.setItem('token', access);
      localStorage.setItem('refreshToken', refresh);
      setToken(access);

      // Get complete user profile from API instead of decoding JWT
      try {
        const userResponse = await usersAPI.getProfile();
        const userData = userResponse.data;
          // Set user data
        setCurrentUser(userData);
        
        // Extract organization data from user profile
        if (userData.organization_name) {
          const orgData = {
            name: userData.organization_name,
            id: userData.organization_id || null,
            slug: userData.organization_slug || null,
            // Add any other organization fields that might be available
          };
          setCurrentOrganization(orgData);
          // Store in localStorage for API interceptor
          localStorage.setItem('currentOrganization', JSON.stringify(orgData));
        }
      } catch (profileError) {
        console.warn('Could not fetch user profile after login:', profileError);
      }

      return { success: true };
    } catch (error) {
      console.error('Login error:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data || { detail: 'Failed to login' }
      };
    }
  };

  const register = async (userData) => {
    try {
      // We need to add a register method to our authAPI in api.js
      await authAPI.register(userData);
      return { success: true };
    } catch (error) {
      console.error('Register error:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data || { detail: 'Registration failed' }
      };
    }
  };  const logout = () => {
    clearAuthData();
    setToken(null);
    setCurrentUser(null);
    setCurrentOrganization(null);
  };
  const updateUser = (userData) => {
    setCurrentUser(prevUser => ({
      ...prevUser,
      ...userData
    }));
      // Update organization data if it's included in user data
    if (userData.organization_name) {
      const orgData = {
        name: userData.organization_name,
        id: userData.organization_id || null,
        slug: userData.organization_slug || null,
      };
      setCurrentOrganization(orgData);
      localStorage.setItem('currentOrganization', JSON.stringify(orgData));
    }
  };

  const updateOrganization = (orgData) => {
    setCurrentOrganization(prevOrg => ({
      ...prevOrg,
      ...orgData
    }));
  };

  // Refresh user data from API
  const refreshUserData = async () => {
    try {
      if (token && !isTokenExpired(token)) {
        const response = await usersAPI.getProfile();
        const userData = response.data;
          setCurrentUser(userData);
        
        if (userData.organization_name) {
          const orgData = {
            name: userData.organization_name,
            id: userData.organization_id || null,
            slug: userData.organization_slug || null,
          };
          setCurrentOrganization(orgData);
          // Store in localStorage for API interceptor
          localStorage.setItem('currentOrganization', JSON.stringify(orgData));
        }
        
        return { success: true, data: userData };
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      return { success: false, error };
    }
  };
  
  // Check if the user is authenticated
  const isAuthenticated = !!currentUser && !!token && !isTokenExpired(token);
  const value = {
    currentUser,
    currentOrganization,
    token,
    loading,
    authInitialized,
    login,
    register,
    logout,
    updateUser,
    updateOrganization,
    refreshUserData,
    isAuthenticated,
    isTokenExpired,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
