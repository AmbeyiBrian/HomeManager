import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import NetInfo from '@react-native-community/netinfo';
import * as SecureStore from 'expo-secure-store';

import { API_URL, API_USERS } from '../../config/apiConfig';
import { LOCAL_STORAGE_KEYS } from './constants';
import { useAuthState } from './state/authState';
import { useStorageHelpers } from './helpers/storageHelpers';
import { useNetworkHelpers } from './helpers/networkHelpers';
import { useTokenHelpers } from './helpers/tokenHelpers';

// Import all feature modules
import {
  authModule,
  organizationModule,
  roleModule,
  propertyModule,
  tenantModule,
  maintenanceModule,
  paymentModule,
  noticeModule,
  subscriptionModule
} from './modules';

// Create the auth context
const AuthContext = createContext();

export { AuthContext };

export const AuthProvider = ({ children }) => {
  // Import all states and functions from modularized hooks
  const { authState, setAuthState, extractCommonStates } = useAuthState();
  const { cacheDataForOffline, getCachedData, clearCachedData } = useStorageHelpers(authState, setAuthState);
  const { syncOfflineActions, queueOfflineAction } = useNetworkHelpers(authState, cacheDataForOffline, getCachedData);
  const { refreshToken, checkAndRefreshToken, isTokenExpired } = useTokenHelpers(authState, setAuthState);
  
  // Initialize all feature modules with the necessary dependencies
  const auth = authModule(authState, setAuthState, { cacheDataForOffline, getCachedData, clearCachedData });
  const organization = organizationModule(authState, setAuthState, { cacheDataForOffline, getCachedData, queueOfflineAction });
  const role = roleModule(authState, setAuthState, { cacheDataForOffline, getCachedData, queueOfflineAction });
  const property = propertyModule(authState, setAuthState, { cacheDataForOffline, getCachedData, queueOfflineAction });
  const tenant = tenantModule(authState, setAuthState, { cacheDataForOffline, getCachedData, queueOfflineAction });
  const maintenance = maintenanceModule(authState, setAuthState, { cacheDataForOffline, getCachedData, queueOfflineAction });
  const payment = paymentModule(authState, setAuthState, { cacheDataForOffline, getCachedData, queueOfflineAction });
  const notice = noticeModule(authState, setAuthState, { cacheDataForOffline, getCachedData, queueOfflineAction });
  const subscription = subscriptionModule(authState, setAuthState, { cacheDataForOffline, getCachedData });
  
  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const isOffline = !state.isConnected;
      
      if (authState.isOffline !== isOffline) {
        setAuthState(prevState => ({
          ...prevState,
          isOffline: isOffline
        }));
        
        // If coming back online and authenticated, sync offline actions
        if (!isOffline && authState.authenticated) {
          syncOfflineActions();
        }
      }
    });
    
    return () => unsubscribe();
  }, [authState.isOffline, authState.token]);
    // Load token and offline preference from secure storage when the app starts
  useEffect(() => {
    const loadToken = async () => {
      try {
        const offlineEnabled = await SecureStore.getItemAsync('offline_enabled');
        const currentOrgId = await SecureStore.getItemAsync('current_org_id');
        
        // First check if we have a token
        const token = await SecureStore.getItemAsync('token');
        
        if (token) {
          console.log("Found existing token, validating...");
          
          // Check if the token is valid or can be refreshed
          const tokenResult = await checkAndRefreshToken();
          
          if (tokenResult.success) {
            // We have a valid token (either original or refreshed)
            const validToken = tokenResult.data.token;
            
            // Set auth header with valid token
            axios.defaults.headers.common['Authorization'] = `Bearer ${validToken}`;
            
            // Set organization header if available
            if (currentOrgId) {
              axios.defaults.headers.common['X-Organization-ID'] = currentOrgId;
            }
            
            try {
              // Get user data
              const userResponse = await axios.get(`${API_USERS}/me/`);
              
              // Cache user data for offline use
              await cacheDataForOffline(LOCAL_STORAGE_KEYS.USER_DATA, userResponse.data);
              
              // Update state with authenticated user
              setAuthState(prevState => ({
                ...prevState,
                token: validToken,
                authenticated: true,
                user: userResponse.data,
                loading: false,
                offlineEnabled: offlineEnabled === 'true',
              }));
              
              console.log("Auto login successful");
            } catch (error) {
              console.error('Error loading user data:', error);
              handleAuthFailure(offlineEnabled);
            }
          } else {
            console.log("Token validation failed, refreshing failed too");
            handleAuthFailure(offlineEnabled);
          }
        } else {
          // No token found
          setAuthState(prevState => ({
            ...prevState,
            loading: false,
            offlineEnabled: offlineEnabled === 'true',
          }));
        }
      } catch (error) {
        console.error('Error loading authentication state:', error);
        setAuthState(prevState => ({
          ...prevState,
          loading: false,
        }));
      }
    };
    
    // Helper function to handle authentication failures
    const handleAuthFailure = async (offlineEnabled) => {
      // If offline mode is enabled, try to use cached credentials
      if (offlineEnabled === 'true') {
        const cachedUserData = await getCachedData(LOCAL_STORAGE_KEYS.USER_DATA);
        
        if (cachedUserData) {
          setAuthState(prevState => ({
            ...prevState,
            authenticated: true,
            user: cachedUserData,
            loading: false,
            isOffline: true,
            offlineEnabled: true,
          }));
          return;
        }
      }
      
      // Clear token as it's invalid
      await SecureStore.deleteItemAsync('token');
      delete axios.defaults.headers.common['Authorization'];
      
      setAuthState(prevState => ({
        ...prevState,
        loading: false,
        offlineEnabled: offlineEnabled === 'true',
      }));
    };
    
    loadToken();
  }, []);
  
  // Setup axios interceptor to handle token expiration
  useEffect(() => {
    // Add response interceptor to catch 401 errors
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // If error is 401 (Unauthorized) and we haven't tried to refresh the token yet
        if (error.response?.status === 401 && !originalRequest._retry && authState.authenticated) {
          originalRequest._retry = true;
          
          try {
            // Try to refresh the token using our refreshToken function
            const result = await refreshToken();
            
            if (result.success) {
              // Update the original request with the new token
              originalRequest.headers['Authorization'] = `Bearer ${result.data.token}`;
              
              // Retry the original request with the new token
              return axios(originalRequest);
            } else {              // If refresh failed, logout the user and reject the promise
              await auth.logout();
              return Promise.reject(error);
            }
          } catch (refreshError) {
            // If an error occurs during refresh, logout and proceed with the error
            await auth.logout();
            return Promise.reject(error);
          }
        }
        
        // For any other errors, proceed as normal
        return Promise.reject(error);
      }
    );
    
    // Clean up interceptor on unmount
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [authState.authenticated]);
  // Extract common states for easier access
  const commonStates = extractCommonStates();
  
  // Combine all the module functions and states for the context value
  const contextValue = {
    authState,
    setAuthState,
    ...auth,
    ...organization,
    ...role,
    ...property,
    ...tenant,
    ...maintenance,
    ...payment,
    ...notice,
    ...subscription,
    // Add token helpers
    refreshToken,
    checkAndRefreshToken,
    // Add storage helpers
    cacheDataForOffline,
    getCachedData,
    clearCachedData,
    // Include common states for easier access
    ...commonStates,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
