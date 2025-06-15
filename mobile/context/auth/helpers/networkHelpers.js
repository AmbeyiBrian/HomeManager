import * as SecureStore from 'expo-secure-store';
import { LOCAL_STORAGE_KEYS } from '../constants';

export const useNetworkHelpers = (authState, cacheDataForOffline, getCachedData) => {
  // Sync offline actions when coming back online
  const syncOfflineActions = async () => {
    try {
      const offlineQueue = await SecureStore.getItemAsync(LOCAL_STORAGE_KEYS.OFFLINE_QUEUE);
      
      if (!offlineQueue) return;
      
      const actions = JSON.parse(offlineQueue);
      
      if (actions.length === 0) return;
      
      // Process each action
      for (const action of actions) {
        // Implementation would depend on the specific actions you need to handle
        // This is a placeholder for offline sync logic
        console.log(`Processing offline action: ${action.type}`);
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
      
      await SecureStore.setItemAsync(LOCAL_STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(actions));
      return { success: true, offlineQueued: true };
    } catch (error) {
      console.error('Error queuing offline action:', error);
      return { success: false, error };
    }
  };

  return {
    syncOfflineActions,
    queueOfflineAction,
  };
};
