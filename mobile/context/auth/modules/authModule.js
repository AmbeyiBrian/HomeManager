import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL, API_USERS } from '../../../config/apiConfig';
import { LOCAL_STORAGE_KEYS } from '../constants';

export default function authModule(authState, setAuthState, { cacheDataForOffline, getCachedData, clearCachedData }) {
  // Auto login function that attempts to authenticate with a stored token
  const autoLogin = async () => {
    try {
      console.log('Attempting automatic login...');
      
      // Check if we have a token
      const token = await SecureStore.getItemAsync('token');
      
      if (!token) {
        console.log('No token found for automatic login');
        return { success: false, error: { detail: 'No stored token found' } };
      }
      
      // Set auth header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Get user data to validate the token
      const userResponse = await axios.get(`${API_USERS}/me/`);
      
      // Store user data for offline access
      await cacheDataForOffline(LOCAL_STORAGE_KEYS.USER_DATA, userResponse.data);
      
      // Update auth state
      setAuthState(prevState => ({
        ...prevState,
        token,
        authenticated: true,
        user: userResponse.data,
        loading: false
      }));
      
      console.log('Auto login successful');
      return { success: true, data: userResponse.data };
    } catch (error) {
      console.error('Auto login failed:', error);
      
      // Clear invalid token
      if (error.response?.status === 401) {
        await SecureStore.deleteItemAsync('token');
        delete axios.defaults.headers.common['Authorization'];
      }
      
      return { 
        success: false, 
        error: error.response?.data || { detail: 'Auto login failed' } 
      };
    }
  };

  // Register function
  const register = async (username, email, password, firstName, lastName, phoneNumber) => {
    try {
      const response = await axios.post(`${API_URL}/auth/register/`, {
        username,
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber,
      });
      
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Registration error:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data || { detail: 'Network error' }
      };    
    }
  };

  // Login function
  const login = async (username, password) => {
    try {      
      const response = await axios.post(`${API_URL}/auth/token/`, {
        username,
        password,
      });
      
      // Extract tokens from response
      const token = response.data?.access;
      const refreshToken = response.data?.refresh;
      
      if (!token) {
        throw new Error('No access token received');
      }
      
      // Store both access and refresh tokens in secure storage
      await SecureStore.setItemAsync('token', token);
      if (refreshToken) {
        await SecureStore.setItemAsync('refreshToken', refreshToken);
      }
      
      // Set auth header for future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Get user data
      const userResponse = await axios.get(`${API_USERS}/me/`);
      // Directly use our hybrid storage approach for user data
      await cacheDataForOffline(LOCAL_STORAGE_KEYS.USER_DATA, userResponse.data);
        
      setAuthState(prevState => ({
        ...prevState,
        token,
        authenticated: true,
        user: userResponse.data,
        loading: false,
        isOffline: false,      
      }));
      
      return { success: true };    
    } catch (error) {
      // Enhanced error logging
      
      if (error.message === 'Network Error') {
        // Try to authenticate with cached data in offline mode
        const cachedUserData = await getCachedData(LOCAL_STORAGE_KEYS.USER_DATA);
        
        if (cachedUserData) {
          setAuthState(prevState => ({
            ...prevState,
            authenticated: true,
            user: cachedUserData,
            loading: false,
            isOffline: true,
          }));
          
          return { success: true, offline: true };
        }
      }
      
      return { 
        success: false, 
        error: error.response?.data || { detail: 'Authentication failed' }
      };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Clear tokens and sensitive data from secure storage
      await SecureStore.deleteItemAsync('token');
      await SecureStore.deleteItemAsync('refreshToken');
      await clearCachedData(LOCAL_STORAGE_KEYS.USER_DATA);
      
      // Clear all cached data that might be large
      const keysToClean = [
        LOCAL_STORAGE_KEYS.PROPERTIES,
        LOCAL_STORAGE_KEYS.UNITS,
        LOCAL_STORAGE_KEYS.TENANTS,
        LOCAL_STORAGE_KEYS.TICKETS,
        LOCAL_STORAGE_KEYS.PAYMENTS
      ];
      
      // Clean up each key
      for (const key of keysToClean) {
        await clearCachedData(key);
      }
      
      // Clear organization ID 
      await SecureStore.deleteItemAsync('current_org_id');
      
      // Clear AsyncStorage unused items
      const asyncStorageKeys = await AsyncStorage.getAllKeys();
      const unusedKeys = asyncStorageKeys.filter(key => key.startsWith('async_'));
      if (unusedKeys.length > 0) {
        await AsyncStorage.multiRemove(unusedKeys);
      }
      
      // Clear auth header
      delete axios.defaults.headers.common['Authorization'];
      
      setAuthState({
        token: null,
        authenticated: false,
        user: null,
        loading: false,
        isOffline: false,
        currentOrganization: null,
        offlineEnabled: true,
        properties: [],
        propertiesLoading: false,
        propertiesError: null,
        propertiesFromCache: false,
        currentPropertyUnits: [],
        currentPropertyStats: {
          totalUnits: 0,
          occupiedUnits: 0,
          vacantUnits: 0,
          rentCollected: 0,
          pendingRent: 0,
          openTickets: 0,
        },
        propertyDetailsLoading: false,
        propertyDetailsError: null,
        propertyDetailsFromCache: false,
      });
      
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: 'Failed to logout' };
    }
  };

  // Toggle offline mode setting
  const setOfflineEnabled = async (enabled) => {
    try {
      await SecureStore.setItemAsync('offline_enabled', String(enabled));
      setAuthState(prevState => ({
        ...prevState,
        offlineEnabled: enabled
      }));
      return { success: true };
    } catch (error) {
      console.error('Error setting offline mode:', error);
      return { success: false, error };
    }
  };
  
  return {
    register,
    login,
    logout,
    setOfflineEnabled,
    autoLogin,
  };
}
