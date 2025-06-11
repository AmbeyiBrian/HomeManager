import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import NetInfo from '@react-native-community/netinfo';

// Import API configuration from central config file
import { 
  API_BASE_URL, 
  API_URL, 
  API_USERS, 
  API_PROPERTIES,
  API_TENANTS,
  API_MAINTENANCE,
  API_PAYMENTS,
  API_NOTICES,
  API_ORGANIZATIONS
} from '../config/apiConfig';

// Setup offline data caching
const LOCAL_STORAGE_KEYS = {
  USER_DATA: 'user_data',
  PROPERTIES: 'properties_data',
  UNITS: 'units_data',
  TENANTS: 'tenants_data',
  TICKETS: 'tickets_data',
  PAYMENTS: 'payments_data',
  OFFLINE_QUEUE: 'offline_action_queue',
};

// Create the auth context
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({
    token: null,
    authenticated: false,
    user: null,
    loading: true,
    isOffline: false,
    currentOrganization: null,
    offlineEnabled: true,
    // Add roles and role management loading states
    roles: [],
    rolesLoading: false,
    rolesError: null,
    memberships: [],
    membershipsLoading: false,
    membershipsError: null,
    properties: [],
    propertiesLoading: false,
    propertiesError: null,
    propertiesFromCache: false,
    // Property detail state
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
          console.log('Coming back online, syncing offline actions...');
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
        const token = await SecureStore.getItemAsync('token');
        const offlineEnabled = await SecureStore.getItemAsync('offline_enabled');
        const currentOrgId = await SecureStore.getItemAsync('current_org_id');
        
        if (token) {
          // Set auth header
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Set organization header if available
          if (currentOrgId) {
            axios.defaults.headers.common['X-Organization-ID'] = currentOrgId;
          }
          
          try {
            // Get user data
            const userResponse = await axios.get(`${API_USERS}/me/`);
            
            setAuthState(prevState => ({
              ...prevState,
              token,
              authenticated: true,
              user: userResponse.data,
              loading: false,
              offlineEnabled: offlineEnabled === 'true',
            }));
          } catch (error) {
            console.error('Error loading user data:', error);
            // Token might be expired, clear it
            await SecureStore.deleteItemAsync('token');
            delete axios.defaults.headers.common['Authorization'];
            
            setAuthState(prevState => ({
              ...prevState,
              loading: false,
              offlineEnabled: offlineEnabled === 'true',
            }));
          }
        } else {
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
    
    loadToken();
  }, []);
  
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
      
      console.log('Auth token response:', response.data);
      
      // Ensure we correctly extract the token from the response
      const token = response.data?.access;
      
      if (!token) {
        throw new Error('No access token received');
      }
      
      // Store token in secure storage - This is small enough for SecureStore
      await SecureStore.setItemAsync('token', token);
      
      // Set auth header for future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Get user data
      const userResponse = await axios.get(`${API_USERS}/me/`);
      // Directly use our hybrid storage approach for user data
      console.log(userResponse);
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
        console.log('Network error during login, checking for cached data...');
        // Try to authenticate with cached data in offline mode
        const cachedUserData = await getCachedData(LOCAL_STORAGE_KEYS.USER_DATA);
        
        if (cachedUserData) {
          console.log('Found cached user data, allowing offline login');
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
      // Clear token and sensitive data from secure storage
      await SecureStore.deleteItemAsync('token');
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
  
  // Sync offline actions when coming back online
  const syncOfflineActions = async () => {
    try {
      const offlineQueue = await SecureStore.getItemAsync(LOCAL_STORAGE_KEYS.OFFLINE_QUEUE);
      
      if (!offlineQueue) return;
      
      const actions = JSON.parse(offlineQueue);
      
      if (actions.length === 0) return;
      
      // Process each action
      for (const action of actions) {
        try {
          console.log('Processing offline action:', action.type);
          // Process different types of actions here
        } catch (actionError) {
          console.error('Error processing offline action:', actionError);
        }
      }
      
      // Clear the queue after processing
      await SecureStore.setItemAsync(LOCAL_STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify([]));
      
    } catch (error) {
      console.error('Error syncing offline actions:', error);
    }
  };
  
  // Queue an action for when coming back online
  const queueOfflineAction = async (actionType, actionData) => {
    try {
      const offlineQueue = await SecureStore.getItemAsync(LOCAL_STORAGE_KEYS.OFFLINE_QUEUE);
      const actions = offlineQueue ? JSON.parse(offlineQueue) : [];
      
      actions.push({
        type: actionType,
        data: actionData,
        timestamp: new Date().toISOString()
      });
      
      await SecureStore.setItemAsync(
        LOCAL_STORAGE_KEYS.OFFLINE_QUEUE,
        JSON.stringify(actions)
      );
      
      return { success: true };
    } catch (error) {
      console.error('Error queuing offline action:', error);
      return { success: false, error };
    }
  };
  
  
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
            // Try to refresh the token (if your backend supports refresh tokens)
            const refreshToken = await SecureStore.getItemAsync('refreshToken');
            if (refreshToken) {
              const result = await login(); // You might want to implement a refresh token method instead
              
              if (result.success) {
                // Retry the original request with the new token
                return axios(originalRequest);
              } else {
                // If refresh failed, proceed with the error
                return Promise.reject(error);
              }
            }
          } catch (refreshError) {
            // If an error occurs during refresh, proceed with the original error
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
  
  // Constants for storage
  const SECURE_STORE_MAX_SIZE = 2000; // Slightly below the 2048 limit to be safe
  const SENSITIVE_KEYS = ['token', 'user_data', 'offline_enabled', 'current_org_id'];
  
  // Save data for offline use, using appropriate storage based on size and sensitivity
  const cacheDataForOffline = async (key, data) => {
    if (!authState.offlineEnabled) return;
    
    try {
      const jsonData = JSON.stringify(data);
      
      // Determine where to store the data based on size and sensitivity
      if (jsonData.length > SECURE_STORE_MAX_SIZE) {
        console.log(`Data for ${key} exceeds SecureStore size limit, using AsyncStorage`);
        // Store a reference in SecureStore pointing to AsyncStorage
        await AsyncStorage.setItem(`async_${key}`, jsonData);
        await SecureStore.setItemAsync(key, JSON.stringify({ 
          isAsyncStorage: true, 
          timestamp: new Date().toISOString() 
        }));
      } else {
        // Small enough for SecureStore or is sensitive data
        await SecureStore.setItemAsync(key, jsonData);
      }
    } catch (error) {
      console.error(`Error caching ${key} data:`, error);
    }
  };
  
  // Get cached data for offline use
  const getCachedData = async (key) => {
    try {
      // First try to get from SecureStore
      const data = await SecureStore.getItemAsync(key);
      
      if (!data) return null;
      
      const parsedData = JSON.parse(data);
      
      // Check if this is a reference to AsyncStorage
      if (parsedData && parsedData.isAsyncStorage) {
        // Retrieve the actual data from AsyncStorage
        const asyncData = await AsyncStorage.getItem(`async_${key}`);
        return asyncData ? JSON.parse(asyncData) : null;
      }
      
      // Regular SecureStore data
      return parsedData;
    } catch (error) {
      console.error(`Error getting cached ${key} data:`, error);
      return null;
    }
  };
  
  // Clear cached data properly from both storage systems
  const clearCachedData = async (key) => {
    try {
      // First check if there's a reference in SecureStore
      const data = await SecureStore.getItemAsync(key);
      
      if (data) {
        try {
          const parsedData = JSON.parse(data);
          if (parsedData && parsedData.isAsyncStorage) {
            // Also clear the AsyncStorage entry
            await AsyncStorage.removeItem(`async_${key}`);
          }
        } catch (e) {
          // If parsing fails, just continue to clear SecureStore
        }
        
        // Now clear the SecureStore entry
        await SecureStore.deleteItemAsync(key);
      }
    } catch (error) {
      console.error(`Error clearing cached ${key} data:`, error);
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
  
  // Set current organization
  const setCurrentOrganization = async (organization) => {
    try {
      if (organization) {
        await SecureStore.setItemAsync('current_org_id', organization.id.toString());
        axios.defaults.headers.common['X-Organization-ID'] = organization.id.toString();
      } else {
        await SecureStore.deleteItemAsync('current_org_id');
        delete axios.defaults.headers.common['X-Organization-ID'];
      }
      
      setAuthState(prevState => ({
        ...prevState,
        currentOrganization: organization
      }));
      
      return { success: true };
    } catch (error) {
      console.error('Error setting current organization:', error);
      return { success: false, error };
    }
  };
  
  // Fetch properties with offline support
  const fetchProperties = async (forceRefresh = false) => {
    try {
      console.log('=== fetchProperties Debug ===');
      console.log('Force refresh:', forceRefresh);
      console.log('Is offline:', authState.isOffline);
      console.log('Current properties count:', authState.properties?.length);
      console.log('API endpoint:', `${API_PROPERTIES}/`);
      
      // Set loading state
      setAuthState(prev => ({ ...prev, propertiesLoading: true }));
      
      // If we're offline or we have cached data and aren't forcing refresh
      if ((authState.isOffline || !forceRefresh) && !authState.propertiesLoading) {
        const cachedData = await getCachedData(LOCAL_STORAGE_KEYS.PROPERTIES);
        
        if (cachedData) {
          setAuthState(prev => ({ 
            ...prev, 
            properties: cachedData, 
            propertiesLoading: false,
            propertiesError: null,
            propertiesFromCache: true
          }));
          
          return {
            success: true,
            data: cachedData,
            fromCache: true
          };
        }
      }
      
      // If we're online, make the API call
      if (!authState.isOffline) {        
        console.log('Making API call to fetch properties...');
        const response = await axios.get(`${API_PROPERTIES}/`);
        console.log('API response status:', response.status);
        console.log('API response data:', response.data);
        
        const data = response.data.results || response.data || [];
        console.log('Processed properties data:', data);
        console.log('Properties count:', data.length);
        
        // Cache the data for offline use
        if (authState.offlineEnabled) {
          await cacheDataForOffline(LOCAL_STORAGE_KEYS.PROPERTIES, data);
          console.log('Properties cached for offline use');
        }
        
        // Update state
        setAuthState(prev => ({ 
          ...prev, 
          properties: data, 
          propertiesLoading: false,
          propertiesError: null,
          propertiesFromCache: false
        }));
        
        console.log('Properties state updated successfully');
        
        return {
          success: true,
          data,
          fromCache: false
        };
      }
      
      // If we're offline and have no cached data
      setAuthState(prev => ({ 
        ...prev, 
        propertiesLoading: false,
        propertiesError: 'No cached data available while offline',
      }));
      
      return {
        success: false,
        error: 'No cached data available while offline',
        fromCache: false
      };
    } catch (error) {
      console.error('Error fetching properties:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
    
      // Try to get cached data as fallback
      const cachedData = await getCachedData(LOCAL_STORAGE_KEYS.PROPERTIES);
      
      if (cachedData) {
        setAuthState(prev => ({ 
          ...prev, 
          properties: cachedData, 
          propertiesLoading: false,
          propertiesError: error.message,
          propertiesFromCache: true
        }));
        
        return {
          success: true,
          data: cachedData,
          fromCache: true,
          error: error.message
        };
      }
      
      // Update error state
      setAuthState(prev => ({ 
        ...prev, 
        propertiesLoading: false,
        propertiesError: error.message,
      }));
      
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };
  
  // Fetch property details, units and stats with offline support
  const fetchPropertyDetails = async (propertyId, forceRefresh = false) => {
    try {
      // Reset current property data and set loading state
      setAuthState(prev => ({ 
        ...prev, 
        propertyDetailsLoading: true,
        // Initialize with default values to prevent undefined errors
        currentPropertyUnits: [],
        currentPropertyStats: {
          totalUnits: 0,
          occupiedUnits: 0,
          vacantUnits: 0,
          rentCollected: 0,
          pendingRent: 0,
          openTickets: 0,
        }
      }));
      
      // If we're offline or we have cached data and aren't forcing refresh
      if ((authState.isOffline || !forceRefresh) && !authState.propertyDetailsLoading) {
        const cachedUnits = await getCachedData(`${LOCAL_STORAGE_KEYS.UNITS}_${propertyId}`);
        const cachedStats = await getCachedData(`property_stats_${propertyId}`);
        
        if (cachedUnits && cachedStats) {
          setAuthState(prev => ({ 
            ...prev, 
            currentPropertyUnits: cachedUnits, 
            currentPropertyStats: cachedStats,
            propertyDetailsLoading: false,
            propertyDetailsError: null,
            propertyDetailsFromCache: true
          }));
          
          return {
            success: true,
            units: cachedUnits,
            stats: cachedStats,
            fromCache: true
          };
        }
      }
      
      // If we're online, make the API calls
      if (!authState.isOffline) {        
        // Fetch units for this property using the correct units endpoint
        const unitsResponse = await axios.get(`${API_URL}/properties/units/?property=${propertyId}`);
        const unitData = unitsResponse.data.results || unitsResponse.data || [];
        
        // Calculate statistics
        const occupied = unitData.filter(unit => unit.is_occupied).length;
        const vacant = unitData.length - occupied;
        
        // Get rent stats using the correct properties endpoint
        const rentResponse = await axios.get(`${API_PROPERTIES}/${propertyId}/rent_stats/`);
        const rentStats = rentResponse.data || { collected: 0, pending: 0 };
        
        // Get open tickets count
        const ticketsResponse = await axios.get(`${API_MAINTENANCE}/tickets/?property=${propertyId}&status=new&status=assigned&status=in_progress&status=on_hold`);
        const openTicketsCount = ticketsResponse.data.count || 0;
        
        const stats = {
          totalUnits: unitData.length,
          occupiedUnits: occupied,
          vacantUnits: vacant,
          rentCollected: rentStats.collected || 0,
          pendingRent: rentStats.pending || 0,
          openTickets: openTicketsCount,
        };
        
        // Cache the data for offline use
        if (authState.offlineEnabled) {
          await cacheDataForOffline(`${LOCAL_STORAGE_KEYS.UNITS}_${propertyId}`, unitData);
          await cacheDataForOffline(`property_stats_${propertyId}`, stats);
        }
        
        // Update state
        setAuthState(prev => ({ 
          ...prev, 
          currentPropertyUnits: unitData,
          currentPropertyStats: stats,
          propertyDetailsLoading: false,
          propertyDetailsError: null,
          propertyDetailsFromCache: false
        }));
        
        return {
          success: true,
          units: unitData,
          stats: stats,
          fromCache: false
        };
      }

      // If we're offline and have no cached data
      setAuthState(prev => ({ 
        ...prev, 
        propertyDetailsLoading: false,
        propertyDetailsError: 'No cached data available while offline',
      }));
      
      return {
        success: false,
        error: 'No cached data available while offline',
        fromCache: false
      };
    } catch (error) {
      console.error('Error fetching property details:', error);
      
      // Try to get cached data as fallback
      const cachedUnits = await getCachedData(`${LOCAL_STORAGE_KEYS.UNITS}_${propertyId}`);
      const cachedStats = await getCachedData(`property_stats_${propertyId}`);
      
      if (cachedUnits && cachedStats) {
        setAuthState(prev => ({ 
          ...prev, 
          currentPropertyUnits: cachedUnits,
          currentPropertyStats: cachedStats,
          propertyDetailsLoading: false,
          propertyDetailsError: error.message,
          propertyDetailsFromCache: true
        }));
        
        return {
          success: true,
          units: cachedUnits,
          stats: cachedStats,
          fromCache: true,
          error: error.message
        };
      }
      
      // Update error state
      setAuthState(prev => ({ 
        ...prev, 
        propertyDetailsLoading: false,
        propertyDetailsError: error.message,
      }));
      
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };
  
  // Clear property details when navigating away
  const clearPropertyDetails = () => {
    setAuthState(prev => ({ 
      ...prev, 
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
      propertyDetailsFromCache: false
    }));
  };

  // Fetch roles with offline support
  const fetchRoles = async (forceRefresh = false) => {
    try {
      // Set loading state
      setAuthState(prev => ({ ...prev, rolesLoading: true }));
      
      // If we're offline or we have cached data and aren't forcing refresh
      if ((authState.isOffline || !forceRefresh) && authState.offlineEnabled) {
        const cachedData = await getCachedData('roles_data');
        
        if (cachedData) {
          setAuthState(prev => ({ 
            ...prev, 
            roles: cachedData, 
            rolesLoading: false,
            rolesError: null
          }));
          
          return {
            success: true,
            data: cachedData,
            fromCache: true
          };
        }
      }
      
      // If we're online, make the API call
      if (!authState.isOffline) {
        const response = await axios.get(`${API_ORGANIZATIONS}/roles/`);
        const data = response.data.results || response.data || [];
        
        // Cache the data for offline use
        if (authState.offlineEnabled) {
          await cacheDataForOffline('roles_data', data);
        }
        
        // Update state
        setAuthState(prev => ({ 
          ...prev, 
          roles: data, 
          rolesLoading: false,
          rolesError: null
        }));
        
        return {
          success: true,
          data,
          fromCache: false
        };
      }
      
      // If we're offline and have no cached data
      setAuthState(prev => ({ 
        ...prev, 
        rolesLoading: false,
        rolesError: 'No cached data available while offline',
      }));
      
      return {
        success: false,
        error: 'No cached data available while offline'
      };
    } catch (error) {
      console.error('Error fetching roles:', error);
      
      // Try to get cached data as fallback
      const cachedData = await getCachedData('roles_data');
      
      if (cachedData) {
        setAuthState(prev => ({ 
          ...prev, 
          roles: cachedData, 
          rolesLoading: false,
          rolesError: error.message
        }));
        
        return {
          success: true,
          data: cachedData,
          fromCache: true,
          error: error.message
        };
      }
      
      // Update error state
      setAuthState(prev => ({ 
        ...prev, 
        rolesLoading: false,
        rolesError: error.message,
      }));
      
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };

  // Fetch organization memberships with role details
  const fetchMemberships = async (forceRefresh = false) => {
    try {
      setAuthState(prev => ({ ...prev, membershipsLoading: true }));
      
      // If we're offline or we have cached data and aren't forcing refresh
      if ((authState.isOffline || !forceRefresh) && authState.offlineEnabled) {
        const cachedData = await getCachedData('memberships_data');
        
        if (cachedData) {
          setAuthState(prev => ({ 
            ...prev, 
            memberships: cachedData, 
            membershipsLoading: false,
            membershipsError: null
          }));
          
          return {
            success: true,
            data: cachedData,
            fromCache: true
          };
        }
      }
      
      // If we're online, make the API call
      if (!authState.isOffline) {
        const response = await axios.get(`${API_ORGANIZATIONS}/memberships/`);
        const data = response.data.results || response.data || [];
        
        // Cache the data for offline use
        if (authState.offlineEnabled) {
          await cacheDataForOffline('memberships_data', data);
        }
        
        // Update state
        setAuthState(prev => ({ 
          ...prev, 
          memberships: data, 
          membershipsLoading: false,
          membershipsError: null
        }));
        
        return {
          success: true,
          data,
          fromCache: false
        };
      }
      
      // If we're offline and have no cached data
      setAuthState(prev => ({ 
        ...prev, 
        membershipsLoading: false,
        membershipsError: 'No cached data available while offline',
      }));
      
      return {
        success: false,
        error: 'No cached data available while offline'
      };
    } catch (error) {
      console.error('Error fetching memberships:', error);
      
      // Try to get cached data as fallback
      const cachedData = await getCachedData('memberships_data');
      
      if (cachedData) {
        setAuthState(prev => ({ 
          ...prev, 
          memberships: cachedData, 
          membershipsLoading: false,
          membershipsError: error.message
        }));
        
        return {
          success: true,
          data: cachedData,
          fromCache: true,
          error: error.message
        };
      }
      
      // Update error state
      setAuthState(prev => ({ 
        ...prev, 
        membershipsLoading: false,
        membershipsError: error.message,
      }));
      
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };
  
  // Create or update a role
  const createOrUpdateRole = async (roleData, roleId = null) => {
    try {
      if (authState.isOffline) {
        return await queueOfflineAction('createOrUpdateRole', { roleData, roleId });
      }

      let response;
      
      // Convert permissions array to role details format expected by the backend
      const apiRoleData = {
        name: roleData.name,
        description: roleData.description || '',
        ...(roleId === null || roleData.nameChanged ? {
          slug: roleData.name.toLowerCase().replace(/\s+/g, '-')
        } : {}),
        ...(roleData.permissions ? {
          can_manage_users: roleData.permissions.includes('manage_users'),
          can_manage_billing: roleData.permissions.includes('manage_payments'),
          can_manage_properties: roleData.permissions.includes('manage_properties'),
          can_manage_tenants: roleData.permissions.includes('manage_tenants'),
          can_view_reports: roleData.permissions.includes('view_analytics')
        } : {})
      };
      
      if (roleId) {
        response = await axios.put(`${API_ORGANIZATIONS}/roles/${roleId}/`, apiRoleData);
      } else {
        response = await axios.post(`${API_ORGANIZATIONS}/roles/`, apiRoleData);
      }
      
      // Refresh roles list
      await fetchRoles(true);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error creating/updating role:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };
  
  // Delete a role
  const deleteRole = async (roleId) => {
    try {
      if (authState.isOffline) {
        return await queueOfflineAction('deleteRole', { roleId });
      }

      await axios.delete(`${API_ORGANIZATIONS}/roles/${roleId}/`);
      
      // Refresh roles list
      await fetchRoles(true);
      
      return {
        success: true
      };
    } catch (error) {
      console.error('Error deleting role:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };
  
  // Assign a role to a user
  const assignRole = async (userId, roleId) => {
    try {
      if (authState.isOffline) {
        return await queueOfflineAction('assignRole', { userId, roleId });
      }

      const response = await axios.post(`${API_ORGANIZATIONS}/memberships/`, {
        user: userId,
        role: roleId
      });
      
      // Refresh memberships list
      await fetchMemberships(true);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error assigning role:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };
  
  // Helper function to convert role details to permissions array
  const getRolePermissions = (roleDetails) => {
    if (!roleDetails) return [];
    
    const permissions = [];
    
    // Map backend permission booleans to permission strings
    if (roleDetails.can_manage_users) permissions.push('manage_users');
    if (roleDetails.can_manage_billing) permissions.push('manage_payments');
    if (roleDetails.can_manage_properties) permissions.push('manage_properties');
    if (roleDetails.can_manage_tenants) permissions.push('manage_tenants');
    if (roleDetails.can_view_reports) permissions.push('view_analytics');
    
    // Add additional permissions based on role type
    if (roleDetails.role_type === 'owner' || roleDetails.role_type === 'admin') {
      permissions.push('manage_roles');
      permissions.push('system_settings');
    }
    
    if (roleDetails.role_type !== 'guest') {
      permissions.push('view_dashboard');
    }
    
    return permissions;
  };
  
  // Helper function to check if the current user has a specific permission
  const hasPermission = (permissionName) => {
    if (!authState.user || !authState.memberships) return false;
    
    // Get user's current organization memberships
    const userRoles = authState.memberships.filter(membership => 
      membership.user === authState.user.id && 
      membership.organization === authState.currentOrganization?.id
    );
    
    if (userRoles.length > 0) {
      // Check if any of the user's roles have the required permission
      const allPermissions = userRoles.flatMap(getRolePermissions);
      return allPermissions.includes(permissionName);
    }
    return false;
  };
  
  // Function to fetch a unit's details
  const fetchUnitDetails = async (unitId, forceRefresh = false) => {
    try {
      // Try to get cached data first
      if ((authState.isOffline || !forceRefresh) && authState.offlineEnabled) {
        const cachedUnitDetails = await getCachedData(`unit_details_${unitId}`);
        if (cachedUnitDetails) {
          return {
            success: true,
            data: cachedUnitDetails,
            fromCache: true
          };
        }
      }
      
      if (!authState.isOffline) {
        // Get the token directly from authState or SecureStore
        const token = authState.token || await SecureStore.getItemAsync('token');
        const headers = { Authorization: `Bearer ${token}` };
        
        // Get authorization headers and make API request
        const response = await axios.get(`${API_PROPERTIES}/units/${unitId}/`, { headers });
        
        if (response.status === 200) {
          const unitData = response.data;
          
          // Cache for offline use
          if (authState.offlineEnabled) {
            await cacheDataForOffline(`unit_details_${unitId}`, unitData);
          }
          
          return {
            success: true,
            data: unitData,
            fromCache: false
          };
        }
      }
      
      return {
        success: false,
        error: 'Unable to fetch unit details'
      };
    } catch (error) {
      console.error('Error fetching unit details:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };
  
  // Function to fetch tenants for a unit
  const fetchUnitTenants = async (unitId, forceRefresh = false) => {
    try {
      // Try to get cached data first
      if ((authState.isOffline || !forceRefresh) && authState.offlineEnabled) {
        const cachedTenants = await getCachedData(`unit_tenants_${unitId}`);
        if (cachedTenants) {
          return {
            success: true,
            data: cachedTenants,
            fromCache: true
          };
        }
      }
      
      if (!authState.isOffline) {
        const response = await axios.get(`${API_TENANTS}/tenants/?unit=${unitId}`);
        const tenantsData = response.data.results || response.data || [];
        
        // Cache for offline use
        if (authState.offlineEnabled) {
          await cacheDataForOffline(`unit_tenants_${unitId}`, tenantsData);
        }
        
        return {
          success: true,
          data: tenantsData,
          fromCache: false
        };
      }
      
      return {
        success: false,
        error: 'Unable to fetch unit tenants'
      };
    } catch (error) {
      console.error('Error fetching unit tenants:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };
  
  // Function to fetch lease for a unit
  const fetchUnitLease = async (unitId, forceRefresh = false) => {
    try {
      // Try to get cached data first
      if ((authState.isOffline || !forceRefresh) && authState.offlineEnabled) {
        const cachedLease = await getCachedData(`unit_lease_${unitId}`);
        if (cachedLease) {
          return {
            success: true,
            data: cachedLease,
            fromCache: true
          };
        }
      }
      
      if (!authState.isOffline) {
        const response = await axios.get(`${API_TENANTS}/leases/?unit=${unitId}`);
        const leaseData = response.data.results || response.data || [];
        
        // Cache for offline use
        if (authState.offlineEnabled) {
          await cacheDataForOffline(`unit_lease_${unitId}`, leaseData);
        }
        
        return {
          success: true,
          data: leaseData,
          fromCache: false
        };
      }
      
      return {
        success: false,
        error: 'Unable to fetch unit lease'
      };
    } catch (error) {
      console.error('Error fetching unit lease:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };
  
  // Function to fetch payments for a unit
  const fetchUnitPayments = async (unitId, forceRefresh = false) => {
    try {
      // Try to get cached data first
      if ((authState.isOffline || !forceRefresh) && authState.offlineEnabled) {
        const cachedPayments = await getCachedData(`unit_payments_${unitId}`);
        if (cachedPayments) {
          return {
            success: true,
            data: cachedPayments,
            fromCache: true
          };
        }
      }
      
      if (!authState.isOffline) {
        const response = await axios.get(`${API_PAYMENTS}/rent/?unit=${unitId}`);
        const paymentsData = response.data.results || response.data || [];
        
        // Cache for offline use
        if (authState.offlineEnabled) {
          await cacheDataForOffline(`unit_payments_${unitId}`, paymentsData);
        }
        
        return {
          success: true,
          data: paymentsData,
          fromCache: false
        };
      }
      
      return {
        success: false,
        error: 'Unable to fetch unit payments'
      };
    } catch (error) {
      console.error('Error fetching unit payments:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };
  
  // Function to fetch tickets for a unit
  const fetchUnitTickets = async (unitId, forceRefresh = false) => {
    try {
      // Try to get cached data first
      if ((authState.isOffline || !forceRefresh) && authState.offlineEnabled) {
        const cachedTickets = await getCachedData(`unit_tickets_${unitId}`);
        if (cachedTickets) {
          return {
            success: true,
            data: cachedTickets,
            fromCache: true
          };
        }
      }
      
      if (!authState.isOffline) {
        const response = await axios.get(`${API_MAINTENANCE}/tickets/?unit=${unitId}`);
        const ticketsData = response.data.results || response.data || [];
        
        // Cache for offline use
        if (authState.offlineEnabled) {
          await cacheDataForOffline(`unit_tickets_${unitId}`, ticketsData);
        }
        
        return {
          success: true,
          data: ticketsData,
          fromCache: false
        };
      }
      
      return {
        success: false,
        error: 'Unable to fetch unit tickets'
      };
    } catch (error) {
      console.error('Error fetching unit tickets:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };
  
  // Function to create a tenant
  const createTenant = async (tenantData) => {
    try {
      if (authState.isOffline) {
        return await queueOfflineAction('createTenant', tenantData);
      }
      
      const response = await axios.post(`${API_TENANTS}/tenants/`, tenantData);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error creating tenant:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };

  return (
    <AuthContext.Provider value={{
      authState,
      setAuthState,
      register,
      login,
      logout,
      setOfflineEnabled,
      setCurrentOrganization,
      fetchProperties,
      fetchPropertyDetails,
      fetchRoles,
      fetchMemberships,
      createOrUpdateRole,
      deleteRole,
      assignRole,
      hasPermission,
      fetchUnitDetails,
      fetchUnitTenants,
      fetchUnitLease,
      fetchUnitPayments,
      fetchUnitTickets,
      createTenant,
      // Add storage helper functions
      cacheDataForOffline,
      getCachedData,
      clearCachedData,
      // Extract common properties from authState for easier access
      user: authState.user,
      isOffline: authState.isOffline,
      authenticated: authState.authenticated,
      // Extract properties-related state for easier access
      properties: authState.properties,
      propertiesLoading: authState.propertiesLoading,
      propertiesError: authState.propertiesError,
      propertiesFromCache: authState.propertiesFromCache,
      // Extract property details state
      currentPropertyUnits: authState.currentPropertyUnits,
      currentPropertyStats: authState.currentPropertyStats,
      propertyDetailsLoading: authState.propertyDetailsLoading,
      propertyDetailsError: authState.propertyDetailsError,
      propertyDetailsFromCache: authState.propertyDetailsFromCache,
      // Add clearPropertyDetails function
      clearPropertyDetails,
      // Add roles and memberships state
      roles: authState.roles,
      rolesLoading: authState.rolesLoading,
      rolesError: authState.rolesError,
      memberships: authState.memberships,
      membershipsLoading: authState.membershipsLoading,
      membershipsError: authState.membershipsError,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
