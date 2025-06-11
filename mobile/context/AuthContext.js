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
  API_UNITS,
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
  NOTICES: 'notices_data',
  OFFLINE_QUEUE: 'offline_action_queue',
};

// Create the auth context
const AuthContext = createContext();

export { AuthContext };

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
    // Subscription state
    subscription: null,
    subscriptionLoading: false,
    subscriptionError: null,
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
  useEffect(() => {    // Add response interceptor to catch 401 errors
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
            } else {
              // If refresh failed, logout the user and reject the promise
              await logout();
              return Promise.reject(error);
            }
          } catch (refreshError) {
            // If an error occurs during refresh, logout and proceed with the error
            await logout();
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
      return { success: false, error: error.message };
    }
  };
  // Fetch my organization (singular - users have only one organization)
  const fetchMyOrganization = async (forceRefresh = false) => {
    try {
      // If we're offline, try to get cached data
      if (authState.isOffline && !forceRefresh) {
        const cachedOrg = await getCachedData('user_organization');
        if (cachedOrg) {
          return {
            success: true,
            data: cachedOrg,
            fromCache: true
          };
        }
        return {
          success: false,
          error: 'No cached organization data available while offline',
          fromCache: false
        };
      }
      
      // If we're online, make the API call to the correct endpoint
      const response = await axios.get(`${API_USERS}/my_organization/`);
      
      // Extract the organization from the response
      let organizationData = null;
      if (response.data.results && response.data.results.length > 0) {
        organizationData = response.data.results[0];
      }
      
      // Cache the data for offline use
      if (authState.offlineEnabled && organizationData) {
        await cacheDataForOffline('user_organization', organizationData);
      }
      
      return {
        success: true,
        data: organizationData,
        fromCache: false
      };
    } catch (error) {
      console.error('Error fetching my organization:', error);
      
      // Try to get cached data as fallback
      const cachedOrg = await getCachedData('user_organization');
      if (cachedOrg) {
        return {
          success: true,
          data: cachedOrg,
          fromCache: true,
          error: error.message
        };
      }
      
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }  };
  
  // Fetch properties with offline support
  const fetchProperties = async (forceRefresh = false) => {
    try {      
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
        const response = await axios.get(`${API_PROPERTIES}/properties/`);        
        
        // Make sure we extract properties correctly regardless of API response format
        const data = response.data.results || response.data || [];
        
        // Cache the data for offline use
        if (authState.offlineEnabled) {
          await cacheDataForOffline(LOCAL_STORAGE_KEYS.PROPERTIES, data);
        }
        
        // Update state
        setAuthState(prev => ({ 
          ...prev, 
          properties: data, 
          propertiesLoading: false,
          propertiesError: null,
          propertiesFromCache: false
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
        // First, try to get cached data if we're offline or not forcing refresh
      if (!forceRefresh || authState.isOffline) {
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
        
        // If we're offline and have no cached data, return error
        if (authState.isOffline) {
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
        }
      }
        // If we're online, make the API calls
      if (!authState.isOffline) {
        
        // Fetch property details using the single endpoint that includes units and stats
        const propertyResponse = await axios.get(`${API_PROPERTIES}/properties/${propertyId}/`);
        
        const propertyData = propertyResponse.data;
        
        // Extract units from the property response
        const unitData = propertyData.units || [];
        // Calculate basic statistics from the property data
        const stats = {
          totalUnits: propertyData.unit_count || unitData.length,
          occupiedUnits: propertyData.occupied_units || unitData.filter(unit => unit.is_occupied).length,
          vacantUnits: (propertyData.unit_count || unitData.length) - (propertyData.occupied_units || unitData.filter(unit => unit.is_occupied).length),
          rentCollected: 0,
          pendingRent: 0,
          openTickets: 0,
        };
        
        // Fetch rent statistics for this property using the dedicated backend endpoint
        try {
          const rentStatsResponse = await axios.get(`${API_PROPERTIES}/properties/${propertyId}/rent_stats/`);
          const rentStats = rentStatsResponse.data;
          
          stats.rentCollected = rentStats.collected || 0;
          stats.pendingRent = rentStats.pending || 0;
          
        } catch (rentStatsError) {
          console.warn('Could not fetch rent stats, falling back to payment calculation:', rentStatsError);
          
          // Fallback: Calculate from individual payment records
          try {
            if (unitData.length > 0) {
              // Get all payments for units in this property
              const paymentPromises = unitData.map(unit => {
                const paymentUrl = `${API_PAYMENTS}/rent/?unit=${unit.id}`;
                return axios.get(paymentUrl);
              });
              
              const paymentResponses = await Promise.all(paymentPromises);
              
              let totalCollected = 0;
              let totalPending = 0;
              
              paymentResponses.forEach((response, index) => {
                const payments = response.data.results || response.data || [];
                
                payments.forEach(payment => {
                  if (payment.status === 'completed') {
                    totalCollected += parseFloat(payment.amount || 0);
                  } else if (payment.status === 'pending') {
                    totalPending += parseFloat(payment.amount || 0);
                  }
                });
              });
              
              stats.rentCollected = totalCollected;
              stats.pendingRent = totalPending;
            } else {
              // No units found for payment calculation
            }
          } catch (paymentError) {
            console.warn('Could not fetch payment data:', paymentError);
            // Keep default values of 0
          }
        }
          // Get open tickets count for this property
        try {
          const ticketsResponse = await axios.get(`${API_MAINTENANCE}/tickets/?property=${propertyId}&status=new&status=assigned&status=in_progress&status=on_hold`);
          stats.openTickets = ticketsResponse.data.count || ticketsResponse.data.length || 0;
        } catch (ticketError) {
          console.warn('Could not fetch tickets count:', ticketError);
        }
        
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
      
      // This should never be reached, but just in case
      setAuthState(prev => ({ 
        ...prev, 
        propertyDetailsLoading: false,
        propertyDetailsError: 'Unable to fetch property details',
      }));
      
      return {
        success: false,
        error: 'Unable to fetch property details',
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

        console.log('Fetched roles:', response);
        
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
          can_manage_users: roleData.permissions.includes('can_manage_users'),
          can_manage_billing: roleData.permissions.includes('can_manage_billing'),
          can_manage_properties: roleData.permissions.includes('can_manage_properties'),
          can_manage_tenants: roleData.permissions.includes('can_manage_tenants'),
          can_view_reports: roleData.permissions.includes('can_view_reports')
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
    if (roleDetails.can_manage_users) permissions.push('can_manage_users');
    if (roleDetails.can_manage_billing) permissions.push('can_manage_billing');
    if (roleDetails.can_manage_properties) permissions.push('can_manage_properties');
    if (roleDetails.can_manage_tenants) permissions.push('can_manage_tenants');
    if (roleDetails.can_view_reports) permissions.push('can_view_reports');
    
    // Add additional permissions based on role type
    if (roleDetails.role_type === 'owner' || roleDetails.role_type === 'admin') {
      permissions.push('can_manage_roles');
      permissions.push('can_manage_system_settings');
    }
    
    if (roleDetails.role_type !== 'guest') {
      permissions.push('can_view_dashboard');
    }
    
    return permissions;
  };
  
  // Function to check if user has a specific permission
  const hasPermission = (permissionName) => {
    // If no roles are loaded yet, return false
    if (!authState.roles || authState.roles.length === 0) {
      return false;
    }
    
    // System admin has all permissions
    if (authState.user && authState.user.is_staff) {
      return true;
    }
    
    // Check if user has any role with this permission
    for (const role of authState.roles) {
      const permissions = getRolePermissions(role);
      if (permissions.includes(permissionName)) {
        return true;
      }
    }
    
    return false;
  };
  
  // Create a new organization
  const createOrganization = async (organizationData) => {
    try {
      if (authState.isOffline) {
        return await queueOfflineAction('createOrganization', { organizationData });
      }

      const response = await axios.post(`${API_ORGANIZATIONS}/organizations/`, organizationData);
      
      // Cache the new organization
      if (authState.offlineEnabled) {
        const orgs = await getCachedData('user_organizations') || [];
        orgs.push(response.data);
        await cacheDataForOffline('user_organizations', orgs);
      }
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error creating organization:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };
  
  // Update an existing organization
  const updateOrganization = async (organizationId, organizationData) => {
    try {
      if (authState.isOffline) {
        return await queueOfflineAction('updateOrganization', { organizationId, organizationData });
      }

      const response = await axios.put(`${API_ORGANIZATIONS}/organizations/${organizationId}/`, organizationData);
      
      // Update cached organization data
      if (authState.offlineEnabled) {
        const orgs = await getCachedData('user_organizations') || [];
        const updatedOrgs = orgs.map(org => 
          org.id === organizationId ? { ...org, ...response.data } : org
        );
        await cacheDataForOffline('user_organizations', updatedOrgs);
        
        // If this is the current organization, update its cache too
        const currentOrgId = await getCachedData('current_org_id');
        if (currentOrgId && currentOrgId === organizationId.toString()) {
          await cacheDataForOffline('current_organization', response.data);
          
          // Update auth state
          setAuthState(prevState => ({
            ...prevState,
            currentOrganization: response.data
          }));
        }
      }
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error updating organization:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };
  
  // Delete an organization
  const deleteOrganization = async (organizationId) => {
    try {
      if (authState.isOffline) {
        return {
          success: false,
          error: 'Cannot delete an organization while offline'
        };
      }

      await axios.delete(`${API_ORGANIZATIONS}/organizations/${organizationId}/`);
      
      // Remove from cached organizations
      if (authState.offlineEnabled) {
        const orgs = await getCachedData('user_organizations') || [];
        const updatedOrgs = orgs.filter(org => org.id !== organizationId);
        await cacheDataForOffline('user_organizations', updatedOrgs);
        
        // If this was the current organization, remove it
        const currentOrgId = await getCachedData('current_org_id');
        if (currentOrgId && currentOrgId === organizationId.toString()) {
          await SecureStore.deleteItemAsync('current_org_id');
          delete axios.defaults.headers.common['X-Organization-ID'];
          
          setAuthState(prevState => ({
            ...prevState,
            currentOrganization: null
          }));
        }
      }
      
      return {
        success: true
      };
    } catch (error) {
      console.error('Error deleting organization:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };
  
  // Invite a user to an organization
  const inviteToOrganization = async (organizationId, email, roleId) => {
    try {
      if (authState.isOffline) {
        return {
          success: false,
          error: 'Cannot send invitations while offline'
        };
      }

      // First create a membership for the user
      const response = await axios.post(`${API_ORGANIZATIONS}/memberships/`, {
        organization: organizationId,
        email: email,
        role: roleId
      });
      
      // Then send the invitation email
      if (response.data && response.data.id) {
        await axios.post(`${API_ORGANIZATIONS}/memberships/${response.data.id}/send_invitation/`);
      }
      
      // Refresh memberships list
      await fetchMemberships(true);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error inviting user to organization:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };
  
  // Get the organization details with related data
  const fetchOrganizationDetails = async (organizationId, forceRefresh = false) => {
    try {
      // Try to get cached data first if we're offline or not forcing refresh
      if ((authState.isOffline || !forceRefresh) && authState.offlineEnabled) {
        const cachedOrgDetails = await getCachedData(`organization_details_${organizationId}`);
        if (cachedOrgDetails) {
          return {
            success: true,
            data: cachedOrgDetails,
            fromCache: true
          };
        }
        
        if (authState.isOffline) {
          return {
            success: false,
            error: 'No cached organization details available while offline',
            fromCache: false
          };
        }
      }
      
      if (!authState.isOffline) {
        const response = await axios.get(`${API_ORGANIZATIONS}/organizations/${organizationId}/`);
        
        // Cache for offline use
        if (authState.offlineEnabled) {
          await cacheDataForOffline(`organization_details_${organizationId}`, response.data);
        }
        
        return {
          success: true,
          data: response.data,
          fromCache: false
        };
      }
      
      return {
        success: false,
        error: 'Unable to fetch organization details'
      };
    } catch (error) {
      console.error('Error fetching organization details:', error);
      
      // Try to get cached data as fallback
      const cachedOrgDetails = await getCachedData(`organization_details_${organizationId}`);
      if (cachedOrgDetails) {
        return {
          success: true,
          data: cachedOrgDetails,
          fromCache: true,
          error: error.message
        };
      }
      
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };
  
  // Function to fetch unit details
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
      
      if (!authState.isOffline) {        // Get the token directly from authState or SecureStore
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
        // Get the token directly from authState or SecureStore if not available
        const token = authState.token || await SecureStore.getItemAsync('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        const response = await axios.get(`${API_TENANTS}/tenants/?unit=${unitId}`, { headers });
        
        let tenantsData;
        
        // Handle all possible data structures that might be returned by the API or dummy data
        if (response.data && response.data.results) {
          // If pagination is used (DRF default)
          tenantsData = response.data.results;
        } else if (Array.isArray(response.data)) {
          // If it's a direct array without pagination
          tenantsData = response.data;
        } else if (response.data && typeof response.data === 'object') {
          // If it's a single tenant object
          tenantsData = [response.data];
        } else {
          // Fallback to empty array
          tenantsData = [];
        }
        
        // Normalize tenant data to ensure consistent format
        tenantsData = tenantsData.map(tenant => {
          // Extract first and last name from name field if needed
          let firstName = tenant.first_name;
          let lastName = tenant.last_name;
          
          if (tenant.name && (!firstName || !lastName)) {
            const nameParts = tenant.name.trim().split(' ');
            firstName = firstName || nameParts[0] || '';
            lastName = lastName || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '');
          }
          
          // Create a standardized tenant object with all possible fields
          return {
            id: tenant.id || tenant._id || null,
            name: tenant.name || `${firstName || ''} ${lastName || ''}`.trim(),
            first_name: firstName || '',
            last_name: lastName || '',
            phone_number: tenant.phone_number || tenant.phone || '',
            email: tenant.email || '',
            move_in_date: tenant.move_in_date || null,
            move_out_date: tenant.move_out_date || null,
            unit_details: tenant.unit_details || null,
            property_name: tenant.property_name || null,
            emergency_contact: tenant.emergency_contact || '',
            added_at: tenant.added_at || null,
            active_lease: tenant.active_lease || null,
            ...tenant  // Keep all original fields
          };
        });
        
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
    } catch (error) {      console.error('Error fetching unit tenants:', error);
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
        // Get the token directly from authState or SecureStore if not available
        const token = authState.token || await SecureStore.getItemAsync('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        const response = await axios.get(`${API_TENANTS}/leases/?unit=${unitId}`, { headers });
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
        // Get the token directly from authState or SecureStore if not available
        const token = authState.token || await SecureStore.getItemAsync('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        const response = await axios.get(`${API_PAYMENTS}/rent/?unit=${unitId}`, { headers });
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
        // Get the token directly from authState or SecureStore if not available
        const token = authState.token || await SecureStore.getItemAsync('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        const response = await axios.get(`${API_MAINTENANCE}/tickets/?unit=${unitId}`, { headers });
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
    }  };
      // Function to fetch all tickets
  const fetchAllTickets = async (forceRefresh = false, page = 1, pageSize = 10, status = null, propertyId = null) => {
    try {
      // Try to get cached data first (only for first page with no filters)
      if (page === 1 && !status && !propertyId && (authState.isOffline || !forceRefresh) && authState.offlineEnabled) {
        const cachedTickets = await getCachedData('all_tickets');
        if (cachedTickets) {
          return {
            success: true,
            data: cachedTickets,
            fromCache: true,
            pagination: {
              hasNext: false,
              hasPrevious: false,
              currentPage: 1,
              totalPages: 1,
              totalCount: cachedTickets.length
            }
          };
        }
      }
      
      if (!authState.isOffline) {
        // Get the token directly from authState or SecureStore if not available
        const token = authState.token || await SecureStore.getItemAsync('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        // Build URL with pagination parameters and optional filters
        let url = `${API_MAINTENANCE}/tickets/?page=${page}&page_size=${pageSize}`;
        
        // Add status filter if provided
        if (status && status !== 'all') {
          url += `&status=${status}`;
        }
        
        // Add property filter if provided
        if (propertyId && propertyId !== 'all') {
          url += `&property=${propertyId}`;
        }
        
        const response = await axios.get(url, { headers });
        let ticketsData;
        let pagination = {};
        
        // Handle all possible data structures that might be returned by the API
        if (response.data && response.data.results) {
          // If pagination is used (DRF default)
          ticketsData = response.data.results;
          pagination = {
            hasNext: !!response.data.next,
            hasPrevious: !!response.data.previous,
            currentPage: page,
            totalCount: response.data.count || ticketsData.length,
            totalPages: Math.ceil((response.data.count || ticketsData.length) / pageSize)
          };
        } else if (Array.isArray(response.data)) {
          // If it's a direct array without pagination
          ticketsData = response.data;
          pagination = {
            hasNext: false,
            hasPrevious: false,
            currentPage: 1,
            totalCount: ticketsData.length,
            totalPages: 1
          };
        }
          // Cache only first page with no filters for offline use
        if (page === 1 && !status && !propertyId && authState.offlineEnabled) {
          await cacheDataForOffline('all_tickets', ticketsData);
        }
        
        return {
          success: true,
          data: ticketsData,
          pagination,
          fromCache: false
        };
      }
      
      return {
        success: false,
        error: 'Unable to fetch all tickets'
      };
    } catch (error) {
      console.error('Error fetching all tickets:', error);
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
      
      // Get the token directly from authState or SecureStore if not available
      const token = authState.token || await SecureStore.getItemAsync('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const response = await axios.post(`${API_TENANTS}/tenants/`, tenantData, { headers });
      
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
  };  // Function to create a unit
  const createUnit = async (unitData) => {
    try {
      if (authState.isOffline) {
        return await queueOfflineAction('createUnit', unitData);
      }
      
      // Get the token directly from authState or SecureStore if not available
      const token = authState.token || await SecureStore.getItemAsync('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const response = await axios.post(`${API_PROPERTIES}/units/`, unitData, { headers });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error creating unit:', error);
      return { success: false, error: error.response?.data || error.message };
    }  };

  // Function to create a property
  const createProperty = async (propertyData) => {
    try {
      if (authState.isOffline) {
        return await queueOfflineAction('createProperty', propertyData);
      }
      
      // Get the token directly from authState or SecureStore if not available
      const token = authState.token || await SecureStore.getItemAsync('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const response = await axios.post(`${API_PROPERTIES}/properties/`, propertyData, { headers });
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error creating property:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };// Function to fetch all tenants across properties
  const fetchAllTenants = async (forceRefresh = false, page = 1, pageSize = 20) => {
    try {
      // Try to get cached data first (only for first page)
      if (page === 1 && (authState.isOffline || !forceRefresh) && authState.offlineEnabled) {
        const cachedTenants = await getCachedData('all_tenants_data');
        if (cachedTenants) {
          return {
            success: true,
            data: cachedTenants,
            fromCache: true,
            pagination: {
              hasNext: false,
              hasPrevious: false,
              currentPage: 1,
              totalPages: 1,
              totalCount: cachedTenants.length
            }
          };
        }
      }
      
      if (!authState.isOffline) {
        // Get the token directly from authState or SecureStore if not available
        const token = authState.token || await SecureStore.getItemAsync('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        // Build URL with pagination parameters
        const url = `${API_TENANTS}/tenants/?page=${page}&page_size=${pageSize}`;
        const response = await axios.get(url, { headers });
        
        let tenantsData;
        let pagination = {};
        
        // Handle all possible data structures that might be returned by the API
        if (response.data && response.data.results) {
          // If pagination is used (DRF default)
          tenantsData = response.data.results;
          pagination = {
            hasNext: !!response.data.next,
            hasPrevious: !!response.data.previous,
            currentPage: page,
            totalCount: response.data.count || tenantsData.length,
            totalPages: Math.ceil((response.data.count || tenantsData.length) / pageSize)
          };
        } else if (Array.isArray(response.data)) {
          // If it's a direct array without pagination
          tenantsData = response.data;
          pagination = {
            hasNext: false,
            hasPrevious: false,
            currentPage: 1,
            totalCount: tenantsData.length,
            totalPages: 1
          };
        } else if (response.data && typeof response.data === 'object') {
          // If it's a single tenant object
          tenantsData = [response.data];
          pagination = {
            hasNext: false,
            hasPrevious: false,
            currentPage: 1,
            totalCount: 1,
            totalPages: 1
          };
        } else {
          // Fallback to empty array
          tenantsData = [];
          pagination = {
            hasNext: false,
            hasPrevious: false,
            currentPage: 1,
            totalCount: 0,
            totalPages: 0
          };
        }
        
        // Normalize tenant data to ensure consistent format
        tenantsData = tenantsData.map(tenant => {
          // Extract first and last name from name field if needed
          let firstName = tenant.first_name;
          let lastName = tenant.last_name;
          
          if (tenant.name && (!firstName || !lastName)) {
            const nameParts = tenant.name.trim().split(' ');
            firstName = firstName || nameParts[0] || '';
            lastName = lastName || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '');
          }
          
          // Create a standardized tenant object with all possible fields
          return {
            id: tenant.id || tenant._id || null,
            name: tenant.name || `${firstName || ''} ${lastName || ''}`.trim(),
            first_name: firstName || '',
            last_name: lastName || '',
            phone_number: tenant.phone_number || tenant.phone || '',
            email: tenant.email || '',
            move_in_date: tenant.move_in_date || null,
            move_out_date: tenant.move_out_date || null,
            unit_details: tenant.unit_details || null,
            unit_number: tenant.unit_details?.unit_number || '',
            property_name: tenant.property_name || '',
            emergency_contact: tenant.emergency_contact || '',
            added_at: tenant.added_at || null,
            active_lease: tenant.active_lease || null,
            ...tenant  // Keep all original fields
          };
        });
        
        // Cache for offline use (only for first page to avoid overwriting)
        if (page === 1 && authState.offlineEnabled) {
          await cacheDataForOffline('all_tenants_data', tenantsData);
        }
          return {
          success: true,
          data: tenantsData,
          fromCache: false,
          pagination
        };
      }
      
      return {
        success: false,
        error: 'Unable to fetch tenants'
      };
    } catch (error) {
      console.error('Error fetching all tenants:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };

  // Function to fetch units for a specific property
  const fetchUnitsByProperty = async (propertyId, forceRefresh = false) => {
    try {
      // Try to get cached data first
      if ((authState.isOffline || !forceRefresh) && authState.offlineEnabled) {
        const cachedUnits = await getCachedData(`property_${propertyId}_units`);
        if (cachedUnits) {
          return {
            success: true,
            data: cachedUnits,
            fromCache: true
          };
        }
      }
        if (!authState.isOffline) {
        // Get the token directly from authState or SecureStore if not available
        const token = authState.token || await SecureStore.getItemAsync('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        // Fix: Use API_UNITS instead of incorrect path
        const response = await axios.get(`${API_UNITS}/?property=${propertyId}`, {
          headers
        });
        
        // Normalize the response - handle both paginated and direct array responses
        const unitsData = response.data.results || response.data || [];
        
        // Cache the data if offline support is enabled
        if (authState.offlineEnabled) {
          await cacheDataForOffline(`property_${propertyId}_units`, unitsData);
        }
        
        return {
          success: true,
          data: unitsData,
          fromCache: false
        };
      } else {
        // Offline mode - return empty array if no cached data
        return {
          success: false,
          error: 'No cached data available and currently offline',
          data: [],
          fromCache: false
        };
      }
    } catch (error) {
      console.error('Error fetching units by property:', error);
      
      // Try to return cached data as fallback
      if (authState.offlineEnabled) {
        const cachedUnits = await getCachedData(`property_${propertyId}_units`);
        if (cachedUnits) {
          return {
            success: true,
            data: cachedUnits,
            fromCache: true,
            error: error.message
          };
        }
      }
      
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to fetch units',
        data: [],
        fromCache: false
      };
    }
  };

  // Function to update a property
  const updateProperty = async (propertyId, propertyData) => {
    try {
      if (authState.isOffline) {
        return await queueOfflineAction('updateProperty', { id: propertyId, data: propertyData });
      }
      
      // Get the token directly from authState or SecureStore for extra safety
      const token = authState.token || await SecureStore.getItemAsync('token');
      
      // Two-step approach: First update text fields, then handle image separately if present
      let hasImage = false;
      let imageUri = null;
      let imageName = null;
      let imageMimeType = null;
      
      // Extract image data from FormData if present
      if (propertyData instanceof FormData) {
        // Check if formData contains an image
        const formDataEntries = Array.from(propertyData.entries());
        for (const [key, value] of formDataEntries) {
          if (key === 'image' && value && value.uri) {
            hasImage = true;
            imageUri = value.uri;
            imageName = value.name || 'image.jpg';
            imageMimeType = value.type || 'image/jpeg';
          }
        }
      }
      
      // Phase 1: Update text fields first (always works reliably)
      // Create a plain object with the text fields
      const textUpdateData = {};
      
      if (propertyData instanceof FormData) {
        // Extract text fields from FormData
        const formDataEntries = Array.from(propertyData.entries());
        for (const [key, value] of formDataEntries) {
          if (key !== 'image') {
            textUpdateData[key] = value;
          }
        }
      } else {
        // Use the data directly if it's already JSON
        Object.assign(textUpdateData, propertyData);
      }
      
      // Basic axios config for text update
      const textUpdateConfig = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        timeout: 30000
      };
        // Send text update
      const textResponse = await axios.patch(
        `${API_PROPERTIES}/properties/${propertyId}/`,
        textUpdateData,
        textUpdateConfig
      );
      
      // If no image to upload, we're done
      if (!hasImage || !imageUri) {
        return {
          success: true,
          data: textResponse.data
        };
      }
        // Phase 2: Upload image separately (more reliable than combined update)
      
      // Create a fresh FormData ONLY for the image
      const imageFormData = new FormData();
      
      // Add the image with proper structure for React Native
      imageFormData.append('image', {
        uri: imageUri,
        name: imageName,
        type: imageMimeType
      });
      
      // Also mark this as a React Native upload explicitly
      imageFormData.append('is_react_native', 'true');
      
      // Add a random nonce to prevent caching issues
      imageFormData.append('nonce', Date.now().toString());
      
      // Special config just for image upload - with additional timeout and retries
      const imageUploadConfig = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data', // ensure proper multipart handling
          'Cache-Control': 'no-cache'
        },
        timeout: 120000, // 2 minutes
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        decompress: true, // Ensure responses are properly decompressed
      };
      
      // Multiple retry approach for image upload
      let uploadSuccess = false;
      let responseData = null;
      let lastError = null;
        // Attempt multiple methods with retries for more robustness
      for (let attempt = 1; attempt <= 2 && !uploadSuccess; attempt++) {
        try {
          // Different methods for different attempts
          if (attempt === 1) {            // Method 1: Standard PATCH with FormData
            const imageResponse = await axios.patch(
              `${API_PROPERTIES}/properties/${propertyId}/`,
              imageFormData,
              imageUploadConfig
            );
            
            uploadSuccess = true;
            responseData = imageResponse.data;
          } 
          else {            // Method 2: Alternative endpoint approach with PUT
            const alternativeResponse = await axios.put(
              `${API_PROPERTIES}/properties/${propertyId}/`,
              imageFormData,
              imageUploadConfig
            );
            
            uploadSuccess = true;
            responseData = alternativeResponse.data;
          }
        } catch (attemptError) {
          lastError = attemptError;
          console.error(`Image upload attempt ${attempt} failed:`, attemptError.message);
            // Add a small delay between retries
          if (attempt < 2) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
      
      // Check final result
      if (uploadSuccess) {
        return {
          success: true,
          data: responseData || textResponse.data
        };
      } else {
        console.error('All image upload attempts failed');
        
        // Return partial success since text fields were updated
        return {
          success: true, // Still return success since text was updated
          partialUpdate: true,
          data: textResponse.data,
          imageError: lastError?.message || 'Multiple upload attempts failed',
          message: 'Property information was updated but image upload failed'
        };
      }
    } catch (error) {
      console.error('Error updating property:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method
      });
      
      return {
        success: false,
        error: error.response?.data || error.message
      };    }
  };

  // Function to fetch all payments with filtering
  const fetchAllPayments = async (options = {}) => {
    const {
      forceRefresh = false,
      page = 1,
      pageSize = 20,
      property = null,
      tenant = null,
      status = null,
      nextPageUrl = null
    } = options;

    try {
      // Try to get cached data first (only for first page with no filters)
      if (page === 1 && !property && !tenant && !status && !nextPageUrl && (authState.isOffline || !forceRefresh) && authState.offlineEnabled) {
        const cachedPayments = await getCachedData(LOCAL_STORAGE_KEYS.PAYMENTS);
        if (cachedPayments) {
          return {
            success: true,
            data: cachedPayments,
            fromCache: true,
            pagination: {
              hasNext: false,
              hasPrevious: false,
              currentPage: 1,
              totalPages: 1,
              totalCount: cachedPayments.length
            }
          };
        }
      }
      
      if (!authState.isOffline) {
        // Get the token directly from authState or SecureStore if not available
        const token = authState.token || await SecureStore.getItemAsync('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        let url;
          // Set the URL based on pagination or construct a new one
        if (nextPageUrl) {
          url = nextPageUrl;
          
          // Important: We don't modify the nextPageUrl with additional filters
          // as the backend should already include all necessary filters in the next URL
        } else {
          // Build URL with pagination parameters and optional filters
          url = `${API_PAYMENTS}/rent/?page=${page}&page_size=${pageSize}`;
          
          // Add property filter if provided
          if (property && property !== 'all') {
            url += `&property=${property}`;
          }
          
          // Add tenant filter if provided
          if (tenant && tenant !== 'all') {
            url += `&tenant=${tenant}`;
          }
          
                                       
          // Add status filter if provided
          if (status && status !== 'all') {
            url += `&status=${status}`;
          }
        }
        
        const response = await axios.get(url, { headers });
        let paymentsData;
        let pagination = {};
        
        // Handle all possible data structures that might be returned by the API
        if (response.data && response.data.results) {
          // If pagination is used (DRF default)
          paymentsData = response.data.results;
          pagination = {
            hasNext: !!response.data.next,
            hasPrevious: !!response.data.previous,
            currentPage: page,
            totalCount: response.data.count || paymentsData.length,
            totalPages: Math.ceil((response.data.count || paymentsData.length) / pageSize),
            nextPageUrl: response.data.next
          };
          
        } else if (Array.isArray(response.data)) {
          // If it's a direct array without pagination
          paymentsData = response.data;
          pagination = {
            hasNext: false,
            hasPrevious: false,
            currentPage: 1,
            totalCount: paymentsData.length,
            totalPages: 1,
            nextPageUrl: null
          };
          
        } else {
          // Fallback in case response structure is unexpected
          paymentsData = [];
          pagination = {
            hasNext: false,
            hasPrevious: false,
            currentPage: 1,
            totalCount: 0,
            totalPages: 1,
            nextPageUrl: null
          };
        }
        
        // Enhance payment data with property and unit information
        const enhancedPayments = paymentsData.map(payment => {
          // Use the backend field names directly from your payment sample
          const propertyName = payment.property_name || 'Unknown Property';
          const unitNumber = payment.unit_number || 'Unknown Unit';
          const tenantName = payment.tenant_name || 'Unknown Tenant';
          
          // Check if payment is overdue
          const today = new Date();
          const dueDate = new Date(payment.due_date);
          let paymentStatus = payment.status;
          
          // If the payment is pending and past due date, mark it as overdue
          if (paymentStatus === 'pending' && dueDate < today) {
            paymentStatus = 'overdue';
          }
          
          return {
            ...payment,
            property_name: propertyName,
            unit_number: unitNumber,
            tenant_name: tenantName,
            status: paymentStatus
          };
        });
        
        // Cache only first page with no filters for offline use
        if (page === 1 && !property && !tenant && !status && authState.offlineEnabled) {
          await cacheDataForOffline(LOCAL_STORAGE_KEYS.PAYMENTS, enhancedPayments);
        }
        
        return {
          success: true,
          data: enhancedPayments,
          pagination,
          nextPageUrl: pagination.nextPageUrl,
          fromCache: false
        };
      }
      
      return {
        success: false,
        error: 'Unable to fetch payments - device is offline'
      };
    } catch (error) {
      console.error('Error fetching payments from context:', error);
      
      // Try to get cached data as fallback
      if (authState.offlineEnabled) {
        const cachedPayments = await getCachedData(LOCAL_STORAGE_KEYS.PAYMENTS);
        
        if (cachedPayments) {
          return {
            success: true,
            data: cachedPayments,
            fromCache: true,
            error: error.message,
            pagination: {
              hasNext: false,
              hasPrevious: false,
              currentPage: 1,
              totalPages: 1,
              totalCount: cachedPayments.length,
              nextPageUrl: null
            }
          };
        }
      }
      
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };

  // Function to fetch all notices with filtering
  const fetchAllNotices = async (options = {}) => {
    const {
      forceRefresh = false,
      page = 1,
      pageSize = 20,
      property = null,
      type = null,
      important = null,
      archived = null,
      nextPageUrl = null
    } = options;

    try {
      // Try to get cached data first (only for first page with no filters)
      if (page === 1 && !property && !type && important === null && archived === null && (authState.isOffline || !forceRefresh) && authState.offlineEnabled) {
        const cachedNotices = await getCachedData(LOCAL_STORAGE_KEYS.NOTICES);
        if (cachedNotices) {
          return {
            success: true,
            data: cachedNotices,
            fromCache: true,
            pagination: {
              hasNext: false,
              hasPrevious: false,
              currentPage: 1,
              totalPages: 1,
              totalCount: cachedNotices.length
            }
          };
        }
      }
      
      if (!authState.isOffline) {
        // Get the token directly from authState or SecureStore if not available
        const token = authState.token || await SecureStore.getItemAsync('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        let url;
        // Set the URL based on pagination or construct a new one
        if (nextPageUrl) {
          url = nextPageUrl;
        } else {
          // Build URL with pagination parameters and optional filters
          url = `${API_NOTICES}/?page=${page}&page_size=${pageSize}`;
          
          // Add property filter if provided
          if (property && property !== 'all') {
            url += `&property=${property}`;
          }
          
          // Add notice type filter if provided
          if (type && type !== 'all') {
            url += `&notice_type=${type}`;
          }
          
          // Add important filter if provided
          if (important !== null) {
            url += `&is_important=${important}`;
          }
          
          // Add archived filter if provided
          if (archived !== null) {
            url += `&is_archived=${archived}`;
          }
          
        }
        
        const response = await axios.get(url, { headers });
        let noticesData;
        let pagination = {};
        
        // Handle all possible data structures that might be returned by the API
        if (response.data && response.data.results) {
          // If pagination is used (DRF default)
          noticesData = response.data.results;
          pagination = {
            hasNext: !!response.data.next,
            hasPrevious: !!response.data.previous,
            currentPage: page,
            totalCount: response.data.count || noticesData.length,
            totalPages: Math.ceil((response.data.count || noticesData.length) / pageSize),
            nextPageUrl: response.data.next
          };
        } else if (Array.isArray(response.data)) {
          // If it's a direct array without pagination
          noticesData = response.data;
          pagination = {
            hasNext: false,
            hasPrevious: false,
            currentPage: 1,
            totalCount: noticesData.length,
            totalPages: 1,
            nextPageUrl: null
          };
        } else {
          // Fallback in case response structure is unexpected
          noticesData = [];
          pagination = {
            hasNext: false,
            hasPrevious: false,
            currentPage: 1,
            totalCount: 0,
            totalPages: 1,
            nextPageUrl: null
          };
        }
        
        // Enhance notice data with additional information
        const enhancedNotices = noticesData.map(notice => {
          // Format date for display
          const createdDate = new Date(notice.created_at);
          const formattedDate = createdDate.toISOString().split('T')[0]; // YYYY-MM-DD
          return {
            ...notice,
            date: formattedDate, // Add formatted date for consistency with UI
            important: notice.is_important, // Alias for UI
            type: notice.notice_type || 'general', // For UI consistency
          };
        });
        
        // Cache only first page with no filters for offline use
        if (page === 1 && !property && !type && important === null && archived === null && authState.offlineEnabled) {
          await cacheDataForOffline(LOCAL_STORAGE_KEYS.NOTICES, enhancedNotices);
        }
        
        return {
          success: true,
          data: enhancedNotices,
          pagination,
          nextPageUrl: pagination.nextPageUrl,
          fromCache: false
        };
      }
      
      return {
        success: false,
        error: 'Unable to fetch notices - device is offline'
      };
    } catch (error) {
      console.error('Error fetching notices:', error);
      
      // Try to get cached data as fallback
      if (authState.offlineEnabled) {
        const cachedNotices = await getCachedData(LOCAL_STORAGE_KEYS.NOTICES);
        
        if (cachedNotices) {
          return {
            success: true,
            data: cachedNotices,
            fromCache: true,
            error: error.message,
            pagination: {
              hasNext: false,
              hasPrevious: false,
              currentPage: 1,
              totalPages: 1,
              totalCount: cachedNotices.length,
              nextPageUrl: null
            }
          };
        }
      }
      
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };
  
  // Fetch details of a specific notice
  const fetchNoticeDetails = async (noticeId) => {
    try {
      if (!authState.isOffline) {
        const response = await axios.get(`${API_NOTICES}/${noticeId}/`);
        
        // Format the notice data for consistency
        const notice = response.data;
        const createdDate = new Date(notice.created_at);
        const formattedDate = createdDate.toISOString().split('T')[0]; // YYYY-MM-DD
        
        const enhancedNotice = {
          ...notice,
          date: formattedDate,
          important: notice.is_important,
          type: notice.notice_type || 'general',
          // Map backend fields to frontend fields used in UI
          createdBy: notice.created_by_name || 'Admin', 
          target: notice.target_description || 'All Tenants'
        };
        
        return {
          success: true,
          data: enhancedNotice
        };
      } else {
        // Try to find the notice in the cached notices
        const cachedNotices = await getCachedData(LOCAL_STORAGE_KEYS.NOTICES);
        if (cachedNotices) {
          const notice = cachedNotices.find(n => n.id.toString() === noticeId.toString());
          if (notice) {
            return {
              success: true,
              data: notice,
              fromCache: true
            };
          }
        }
        
        return {
          success: false,
          error: 'Unable to fetch notice details - device is offline'
        };
      }
    } catch (error) {
      console.error('Error fetching notice details:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };
    // Create a new notice
  const createNotice = async (noticeData) => {
    try {
      if (!authState.isOffline) {        // Prepare the data for the backend - match Django model fields exactly
        const formattedData = {
          title: noticeData.title,
          content: noticeData.content,
          notice_type: noticeData.type || 'general',
          is_important: noticeData.important || false,
          property: noticeData.property_id,
          start_date: noticeData.start_date || new Date().toISOString().split('T')[0],
          end_date: noticeData.end_date || null,
          is_archived: false,
          send_sms: noticeData.send_sms || false  // Include SMS flag
        };

        const response = await axios.post(`${API_NOTICES}/`, formattedData);
        
        // Update the cached notices
        if (authState.offlineEnabled) {
          const cachedNotices = await getCachedData(LOCAL_STORAGE_KEYS.NOTICES);
          if (cachedNotices) {
            // Format the new notice to match the UI expectations
            const newNotice = {
              ...response.data,
              date: response.data.created_at ? new Date(response.data.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
              important: response.data.is_important,
              type: response.data.notice_type || 'general'
            };
            
            await cacheDataForOffline(LOCAL_STORAGE_KEYS.NOTICES, [newNotice, ...cachedNotices]);
          }
        }
        
        return {
          success: true,
          data: response.data
        };
      } else {
        return {
          success: false,
          error: 'Cannot create notice while offline'
        };      }    } catch (error) {
      console.error('Error creating notice:', error);
      
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };
  
  // Update an existing notice
  const updateNotice = async (noticeId, noticeData) => {
    try {      if (!authState.isOffline) {
        // Prepare the data for the backend
        const formattedData = {
          title: noticeData.title,
          content: noticeData.content,
          notice_type: noticeData.type || 'general',
          is_important: noticeData.important || false,
          // Only include property if provided
          ...(noticeData.property_id && { property: noticeData.property_id }),
          // Only include dates if provided
          ...(noticeData.start_date && { start_date: noticeData.start_date }),
          ...(noticeData.end_date && { end_date: noticeData.end_date }),
          ...(noticeData.hasOwnProperty('is_archived') && { is_archived: noticeData.is_archived }),
          // Include SMS flag
          ...(noticeData.hasOwnProperty('send_sms') && { send_sms: noticeData.send_sms })
        };
        
        const response = await axios.patch(`${API_NOTICES}/${noticeId}/`, formattedData);
        
        // Update the cached notices
        if (authState.offlineEnabled) {
          const cachedNotices = await getCachedData(LOCAL_STORAGE_KEYS.NOTICES);
          if (cachedNotices) {
            const updatedNotices = cachedNotices.map(notice => {
              if (notice.id.toString() === noticeId.toString()) {
                // Format the updated notice to match the UI expectations
                return {
                  ...notice,
                  ...response.data,
                  date: response.data.created_at ? new Date(response.data.created_at).toISOString().split('T')[0] : notice.date,
                  important: response.data.is_important,
                  type: response.data.notice_type || 'general'
                };
              }
              return notice;
            });
            
            await cacheDataForOffline(LOCAL_STORAGE_KEYS.NOTICES, updatedNotices);
          }
        }
        
        return {
          success: true,
          data: response.data
        };
      } else {
        return {
          success: false,
          error: 'Cannot update notice while offline'
        };
      }
    } catch (error) {
      console.error('Error updating notice:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };
  
  // Delete a notice
  const deleteNotice = async (noticeId) => {
    try {
      if (!authState.isOffline) {
        await axios.delete(`${API_NOTICES}/${noticeId}/`);
        
        // Update the cached notices
        if (authState.offlineEnabled) {
          const cachedNotices = await getCachedData(LOCAL_STORAGE_KEYS.NOTICES);
          if (cachedNotices) {
            const updatedNotices = cachedNotices.filter(
              notice => notice.id.toString() !== noticeId.toString()
            );
            
            await cacheDataForOffline(LOCAL_STORAGE_KEYS.NOTICES, updatedNotices);
          }
        }
        
        return {
          success: true
        };
      } else {
        return {
          success: false,
          error: 'Cannot delete notice while offline'
        };
      }
    } catch (error) {
      console.error('Error deleting notice:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };
  
  // Token refresh function
  const refreshToken = async () => {
    try {
      // Get the refresh token from secure storage
      const currentRefreshToken = await SecureStore.getItemAsync('refreshToken');
      
      if (!currentRefreshToken) {
        return { success: false, error: { detail: 'No refresh token found' } };
      }
      
      // Call the refresh token endpoint
      const response = await axios.post(`${API_URL}/auth/token/refresh/`, {
        refresh: currentRefreshToken
      });
      
      // Extract new tokens
      const newToken = response.data?.access;
      const newRefreshToken = response.data?.refresh; // Some implementations return a new refresh token
      
      if (!newToken) {
        return { success: false, error: { detail: 'Failed to refresh token' } };
      }
      
      // Store the new tokens
      await SecureStore.setItemAsync('token', newToken);
      if (newRefreshToken) {
        await SecureStore.setItemAsync('refreshToken', newRefreshToken);
      }
      
      // Update auth header for future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      return { success: true, data: { token: newToken } };
    } catch (error) {
      console.error('Token refresh error:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data || { detail: 'Failed to refresh token' }
      };
    }
  };
  
  // Function to decode a JWT token and check if it's expired
  const isTokenExpired = (token) => {
    if (!token) return true;
    
    try {
      // JWT token has three parts: header.payload.signature
      const base64Url = token.split('.')[1];
      
      // Replace non-url compatible chars with standard base64 chars
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      
      // Decode the base64 string
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      
      const { exp } = JSON.parse(jsonPayload);
        // Check if token is expired
      // exp is in seconds, Date.now() is in milliseconds
      return exp * 1000 < Date.now();
    } catch (err) {
      console.error('Error decoding token:', err);
      return true; // Consider expired if there's an error
    }
  };
  
  // Function to check token expiration and refresh if needed
  const checkAndRefreshToken = async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      
      // If token exists and is expired
      if (token && isTokenExpired(token)) {
        console.log('Token expired, attempting to refresh...');
        const result = await refreshToken();
        return result.success;
      }
      
      // Token exists and is still valid
      return !!token;
    } catch (err) {
      console.error('Error checking token expiration:', err);
      return false;
    }
  };
  
  // Fetch organization subscription data
  const fetchSubscription = async (organizationId, forceRefresh = false) => {
    console.log('💥 Fetching subscription for organization:', organizationId);
    console.log('💥 Are we offline:', authState.isOffline);
    
    try {
      setAuthState(prev => ({ ...prev, subscriptionLoading: true }));

      if ((authState.isOffline || !forceRefresh) && authState.offlineEnabled) {
        const cacheKey = `subscription_data_${organizationId}`;
        const cachedData = await getCachedData(cacheKey);

        if (cachedData) {
          console.log('💥 Using cached subscription data');
          setAuthState(prev => ({ 
            ...prev, 
            subscription: cachedData, 
            subscriptionLoading: false,
            subscriptionError: null
          }));

          return {
            success: true,
            data: cachedData,
            fromCache: true
          };
        }
      }

      if (!authState.isOffline) {
        try {
          console.log(`💥 Making API call to ${API_ORGANIZATIONS}/subscriptions/?organization=${organizationId}`);
          const response = await axios.get(`${API_ORGANIZATIONS}/subscriptions/?organization=${organizationId}`);
          console.log('💥 API response structure:', JSON.stringify(Object.keys(response.data)));
          console.log('💥 API response data type:', typeof response.data);
          
          let subscription = null;
          
          // Try multiple ways to extract the subscription data
          if (response.data.results && response.data.results.length > 0) {
            console.log('💥 Found subscription in results array');
            subscription = response.data.results[0];
          } else if (response.data && typeof response.data === 'object' && response.data.id) {
            console.log('💥 Found subscription as direct object');
            subscription = response.data;
          } else if (Array.isArray(response.data) && response.data.length > 0) {
            console.log('💥 Found subscription in direct array');
            subscription = response.data[0];
          } else {
            // Try other fallback approaches
            console.log('💥 No direct subscription found, trying additional endpoints');
            
            try {
              // Try direct endpoint with organization ID
              const directResponse = await axios.get(`${API_ORGANIZATIONS}/subscriptions/${organizationId}/`);
              if (directResponse.data && directResponse.data.id) {
                console.log('💥 Found subscription via direct ID endpoint');
                subscription = directResponse.data;
              }
            } catch (directError) {
              console.log('💥 Direct subscription endpoint failed:', directError.message);
              // Continue to next approach
            }
          }

          if (subscription) {
            console.log('💥 Subscription found, validating...');
            
            if (!isValidSubscription(subscription)) {
              console.warn('Invalid subscription data:', subscription);
              throw new Error('Invalid subscription data received');
            }

            if (authState.offlineEnabled) {
              const cacheKey = `subscription_data_${organizationId}`;
              await cacheDataForOffline(cacheKey, subscription);
              console.log('💥 Subscription cached for offline use');
            }

            setAuthState(prev => ({ 
              ...prev, 
              subscription: subscription, 
              subscriptionLoading: false,
              subscriptionError: null
            }));

            return {
              success: true,
              data: subscription
            };
          } else {
            console.log('💥 No subscription found for this organization');
            setAuthState(prev => ({ 
              ...prev, 
              subscription: null, 
              subscriptionLoading: false,
              subscriptionError: 'No subscription found'
            }));

            return {
              success: false,
              error: { message: 'No subscription found for this organization' }
            };
          }
        } catch (error) {
          console.error('Error fetching subscription from API:', error);
          setAuthState(prev => ({ 
            ...prev, 
            subscriptionLoading: false,
            subscriptionError: error.message,
          }));

          return {
            success: false,
            error: error.response?.data || { message: error.message }
          };
        }
      } else {
        return {
          success: false,
          error: { message: 'No internet connection and no cached subscription data available' },
          isOffline: true
        };
      }
    } catch (error) {
      console.error('Unexpected error in fetchSubscription:', error);
      setAuthState(prev => ({ 
        ...prev, 
        subscriptionLoading: false,
        subscriptionError: error.message,
      }));

      return {
        success: false,
        error: { message: error.message }
      };
    }
  };
  
  // Helper function to validate subscription data
  const isValidSubscription = (sub) => {
    console.log('💥 Validating subscription:', sub);
    
    if (!sub || typeof sub !== 'object') {
      console.log('💥 Validation failed: subscription is null or not an object');
      return false;
    }
    
    // Check for minimum required fields
    if (!sub.id || !sub.status) {
      console.log('💥 Validation failed: missing required fields - id or status');
      console.log('💥 ID:', sub.id);
      console.log('💥 Status:', sub.status);
      return false;
    }
    
    // Must have some kind of plan data - either plan_details object or a valid plan ID
    const planDetails = sub.plan_details;
    const planId = sub.plan;
    
    // If plan_details is available, validate it
    if (planDetails && typeof planDetails === 'object') {
      if (!planDetails.name) {
        console.log('💥 Validation failed: plan_details is missing name');
        return false;
      }
      // Plan details looks good
      console.log('💥 Subscription is valid (using plan_details)');
      return true;
    }
    
    // If no plan_details but we have a plan ID, that's also valid
    if (planId) {
      console.log('💥 Subscription is valid (using plan ID)');
      return true;
    }
    
    // Neither plan details nor plan ID is available
    console.log('💥 Validation failed: neither plan_details object nor plan ID is available');
    return false;
  };
  
  // Fetch subscription plans
  const fetchSubscriptionPlans = async () => {
    try {
      if (authState.isOffline) {
        // Try to get cached data if offline
        const cachedPlans = await getCachedData('subscription_plans');
        if (cachedPlans) {
          return {
            success: true,
            data: cachedPlans,
            fromCache: true
          };
        } else {
          return {
            success: false,
            error: { message: 'No cached subscription plans available while offline' },
            isOffline: true
          };
        }
      }

      // If online, fetch from API
      const response = await axios.get(`${API_ORGANIZATIONS}/plans/`);
      const plansData = response.data.results || response.data || [];
      
      // Cache for offline use
      if (authState.offlineEnabled) {
        await cacheDataForOffline('subscription_plans', plansData);
      }
      
      return {
        success: true,
        data: plansData,
        fromCache: false
      };
    } catch (error) {
      console.error('Error fetching subscription plans:', error);
      
      // Try to get cached data as fallback
      if (authState.offlineEnabled) {
        const cachedPlans = await getCachedData('subscription_plans');
        if (cachedPlans) {
          return {
            success: true,
            data: cachedPlans,
            fromCache: true,
            error: error.message
          };
        }
      }
      
      return {
        success: false,
        error: error.response?.data || { message: error.message }
      };
    }
  };
  
  // Fetch subscription payment history
  const fetchSubscriptionPayments = async (organizationId) => {
    try {
      if (authState.isOffline) {
        // Try to get cached data if offline
        const cacheKey = `subscription_payments_${organizationId}`;
        const cachedPayments = await getCachedData(cacheKey);
        if (cachedPayments) {
          return {
            success: true,
            data: cachedPayments,
            fromCache: true
          };
        } else {
          return {
            success: false,
            error: { message: 'No cached payment history available while offline' },
            isOffline: true
          };
        }
      }

      // If online, fetch from API
      const response = await axios.get(`${API_ORGANIZATIONS}/subscription-payments/?organization=${organizationId}`);
      const paymentsData = response.data.results || response.data || [];
      
      // Cache for offline use
      if (authState.offlineEnabled) {
        const cacheKey = `subscription_payments_${organizationId}`;
        await cacheDataForOffline(cacheKey, paymentsData);
      }
      
      return {
        success: true,
        data: paymentsData,
        fromCache: false
      };
    } catch (error) {
      console.error('Error fetching subscription payment history:', error);
      
      // Try to get cached data as fallback
      if (authState.offlineEnabled) {
        const cacheKey = `subscription_payments_${organizationId}`;
        const cachedPayments = await getCachedData(cacheKey);
        if (cachedPayments) {
          return {
            success: true,
            data: cachedPayments,
            fromCache: true,
            error: error.message
          };
        }
      }
      
      return {
        success: false,
        error: error.response?.data || { message: error.message }
      };
    }
  };
  
  // Update subscription plan
  const updateSubscriptionPlan = async (subscriptionId, planId) => {
    try {
      if (authState.isOffline) {
        return {
          success: false,
          error: { message: 'Cannot update subscription plan while offline' },
          isOffline: true
        };
      }

      // Make API call to update subscription
      const response = await axios.patch(`${API_ORGANIZATIONS}/subscriptions/${subscriptionId}/`, {
        plan: planId
      });
      
      // Get the updated subscription data
      const updatedSubscription = response.data;
      
      // Update cached data
      if (authState.offlineEnabled && updatedSubscription.organization) {
        const orgId = typeof updatedSubscription.organization === 'object' ? 
          updatedSubscription.organization.id : updatedSubscription.organization;
          
        if (orgId) {
          const cacheKey = `subscription_data_${orgId}`;
          await cacheDataForOffline(cacheKey, updatedSubscription);
          
          // Update state if this is the current organization's subscription
          if (authState.currentOrganization && 
              authState.currentOrganization.id === orgId) {
            setAuthState(prev => ({ 
              ...prev, 
              subscription: updatedSubscription 
            }));
          }
        }
      }
      
      return {
        success: true,
        data: updatedSubscription
      };
    } catch (error) {
      console.error('Error updating subscription plan:', error);
      return {
        success: false,
        error: error.response?.data || { message: error.message }
      };
    }
  };
  
  // Create a new subscription
  const createSubscription = async (organizationId, planId) => {
    try {
      if (authState.isOffline) {
        return {
          success: false,
          error: { message: 'Cannot create subscription while offline' },
          isOffline: true
        };
      }

      // Make API call to create subscription
      const response = await axios.post(`${API_ORGANIZATIONS}/subscriptions/`, {
        organization: organizationId,
        plan: planId
      });
      
      // Get the new subscription data
      const newSubscription = response.data;
      
      // Cache the new subscription
      if (authState.offlineEnabled) {
        const cacheKey = `subscription_data_${organizationId}`;
        await cacheDataForOffline(cacheKey, newSubscription);
        
        // Update state if this is the current organization's subscription
        if (authState.currentOrganization && 
            authState.currentOrganization.id === organizationId) {
          setAuthState(prev => ({ 
            ...prev, 
            subscription: newSubscription 
          }));
        }
      }
      
      return {
        success: true,
        data: newSubscription
      };
    } catch (error) {
      console.error('Error creating subscription:', error);
      return {
        success: false,
        error: error.response?.data || { message: error.message }
      };
    }
  };
  
  // Cancel a subscription
  const cancelSubscription = async (subscriptionId) => {
    try {
      if (authState.isOffline) {
        return {
          success: false,
          error: { message: 'Cannot cancel subscription while offline' },
          isOffline: true
        };
      }

      // Make API call to cancel subscription
      const response = await axios.post(`${API_ORGANIZATIONS}/subscriptions/${subscriptionId}/cancel/`);
      
      // Get the updated subscription data
      const updatedSubscription = response.data;
      
      // Update cached data
      if (authState.offlineEnabled && updatedSubscription.organization) {
        const orgId = typeof updatedSubscription.organization === 'object' ? 
          updatedSubscription.organization.id : updatedSubscription.organization;
          
        if (orgId) {
          const cacheKey = `subscription_data_${orgId}`;
          await cacheDataForOffline(cacheKey, updatedSubscription);
          
          // Update state if this is the current organization's subscription
          if (authState.currentOrganization && 
              authState.currentOrganization.id === orgId) {
            setAuthState(prev => ({ 
              ...prev, 
              subscription: updatedSubscription 
            }));
          }
        }
      }
      
      return {
        success: true,
        data: updatedSubscription
      };
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      return {
        success: false,
        error: error.response?.data || { message: error.message }
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
      refreshToken,
      checkAndRefreshToken,      setOfflineEnabled,
      setCurrentOrganization,
      fetchMyOrganization,
      fetchProperties,
      fetchPropertyDetails,
      fetchRoles,
      fetchMemberships,
      createOrUpdateRole,      deleteRole,
      assignRole,
      hasPermission,
      // New organization functions
      createOrganization,
      updateOrganization,
      deleteOrganization,
      inviteToOrganization,
      fetchOrganizationDetails,
      // Subscription functions
      fetchSubscription,
      fetchSubscriptionPlans,
      fetchSubscriptionPayments,
      createSubscription,
      updateSubscriptionPlan,
      cancelSubscription,
      isValidSubscription,
      // Other existing functions
      fetchUnitDetails,
      fetchUnitTenants,
      fetchUnitLease,
      fetchUnitPayments,      
      fetchUnitTickets,
      fetchAllTickets,
      fetchAllPayments,
      createTenant,
      createUnit,
      createProperty,
      updateProperty,
      // Notice functions
      fetchAllNotices,
      fetchNoticeDetails,
      createNotice,
      updateNotice,
      deleteNotice,      
      fetchAllTenants,
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