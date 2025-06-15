import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SECURE_STORE_MAX_SIZE, SENSITIVE_KEYS } from '../constants';

export const useStorageHelpers = (authState) => {
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

  return {
    cacheDataForOffline,
    getCachedData,
    clearCachedData,
  };
};
