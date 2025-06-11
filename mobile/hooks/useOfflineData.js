import { useAuth } from '../context/AuthContext';

export const LOCAL_STORAGE_KEYS = {
  USER_DATA: 'user_data',
  PROPERTIES: 'properties_data',
  UNITS: 'units_data',
  TENANTS: 'tenants_data',
  TICKETS: 'tickets_data',
  PAYMENTS: 'payments_data',
  OFFLINE_QUEUE: 'offline_action_queue',
  CURRENT_PROPERTY: 'current_property',
};

// Function to get data with offline support
// Helper for the fetchWithOfflineSupport function
export const createOfflineSupportFetcher = (authFunctions) => async ({
  onlinePromise, // Function that returns a promise with online data
  cacheKey, // Key to store data in secure storage
  transformResponse = (r) => r, // Optional function to transform the response
  offlineEnabled = true, // Whether offline support is enabled
}) => {
  // Extract the methods from the passed authFunctions
  const { getCachedData, cacheDataForOffline } = authFunctions;
  
  try {
    // Try to get online data
    const onlineResponse = await onlinePromise();
    const transformedData = transformResponse(onlineResponse.data);
    // Cache data for offline use with hybrid storage solution
    if (offlineEnabled) {
      // Use the cacheDataForOffline from AuthContext instead of direct SecureStore usage
      await cacheDataForOffline(cacheKey, transformedData);
    }
    
    return {
      data: transformedData,
      isOffline: false,
      error: null,
    };
  } catch (error) {
    // If it's a network error and offline is enabled, try to get cached data
    if ((error.message === 'Network Error' || !navigator.onLine) && offlineEnabled) {
      try {
        // Use getCachedData from AuthContext which handles hybrid storage
        const cachedData = await getCachedData(cacheKey);
        if (cachedData) {
          return {
            data: cachedData,
            isOffline: true,
            error: null,
          };
        }
      } catch (cacheError) {
        console.error('Error getting cached data:', cacheError);
      }
    }
      // Return error if unable to get data
    return {
      data: null,
      isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
      error: error.response?.data || { message: error.message },
    };
  }
};

// Hook for offline data management
export const useOfflineData = () => {
  const { isOffline, offlineEnabled, queueOfflineAction, getCachedData, cacheDataForOffline } = useAuth();
  
  // Function to handle offline-capable API calls
  const fetchData = async (apiCall, cacheKey, defaultValue = []) => {
    if (isOffline) {
      const cachedData = await getCachedData(cacheKey);
      return { data: cachedData || defaultValue, fromCache: true };
    } 
    
    try {
      // Online - Make the API call
      const response = await apiCall();
      
      // Cache the response for offline use
      if (offlineEnabled) {
        cacheDataForOffline(cacheKey, response.data);
      }
      
      return { data: response.data, fromCache: false };
    } catch (error) {
      // Fall back to cached data on error
      if (offlineEnabled) {
        const cachedData = await getCachedData(cacheKey);
        if (cachedData) {
          return { data: cachedData, fromCache: true, error };
        }
      }
      
      console.error('API Error:', error);
      return { data: defaultValue, error, fromCache: false };
    }
  };
  
  // Function to handle offline-capable API mutations
  const mutateData = async (apiCall, actionType, actionData, successCallback, errorCallback) => {
    if (isOffline) {
      // Queue the action for later
      await queueOfflineAction(actionType, actionData);
      
      // Optimistically update cache if needed
      if (successCallback) {
        successCallback();
      }
      
      return { success: true, offlineQueued: true };
    } 
    
    try {
      // Online - Make the API call
      const response = await apiCall();
      
      if (successCallback) {
        successCallback(response);
      }
      
      return { success: true, data: response.data };
    } catch (error) {
      console.error('API Mutation Error:', error);
      
      if (errorCallback) {
        errorCallback(error);
      }
      
      return { success: false, error };
    }
  };
    // Create an instance of fetchWithOfflineSupport with auth context
  const fetchWithOfflineSupport = createOfflineSupportFetcher({
    getCachedData,
    cacheDataForOffline
  });
  
  return {
    isOffline,
    offlineEnabled,
    fetchData,
    mutateData,
    fetchWithOfflineSupport
  };
};
