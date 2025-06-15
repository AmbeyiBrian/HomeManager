import axios from 'axios';
import { API_NOTICES } from '../../../config/apiConfig';
import { LOCAL_STORAGE_KEYS } from '../constants';

export default function noticeModule(authState, setAuthState, { cacheDataForOffline, getCachedData, queueOfflineAction }) {
  // Fetch all notices with offline support
  const fetchAllNotices = async (forceRefresh = false, page = 1, pageSize = 20, status = null, propertyId = null, nextPageUrl = null) => {
    try {
      // If we're offline or we have cached data and aren't forcing refresh (only for first page with no filters)
      if (page === 1 && !status && !propertyId && !nextPageUrl && (authState.isOffline || !forceRefresh) && authState.offlineEnabled) {
        const cachedData = await getCachedData(LOCAL_STORAGE_KEYS.NOTICES);
        
        if (cachedData) {
          return {
            success: true,
            data: cachedData,
            fromCache: true,
            pagination: {
              hasNext: false,
              hasPrevious: false,
              currentPage: 1,
              totalPages: 1,
              totalCount: cachedData.length
            }
          };
        }
      }
      
      // If we're online, make the API call
      if (!authState.isOffline) {
        let url;
        
        // Use next page URL if provided, otherwise construct the URL with filters
        if (nextPageUrl) {
          url = nextPageUrl;
        } else {
          url = `${API_NOTICES}/?page=${page}&page_size=${pageSize}`;
          
          if (status) {
            url += `&status=${status}`;
          }
          
          if (propertyId) {
            url += `&property=${propertyId}`;
          }
        }
        
        const response = await axios.get(url);
        const data = response.data.results || response.data || [];
        
        // Build pagination information
        const pagination = {
          hasNext: !!response.data.next,
          hasPrevious: !!response.data.previous,
          currentPage: page,
          totalCount: response.data.count || data.length,
          totalPages: Math.ceil((response.data.count || data.length) / pageSize),
          nextPageUrl: response.data.next
        };
        
        // Cache only the first page with no filters
        if (page === 1 && !status && !propertyId && authState.offlineEnabled) {
          await cacheDataForOffline(LOCAL_STORAGE_KEYS.NOTICES, data);
        }
        
        return {
          success: true,
          data,
          fromCache: false,
          pagination
        };
      }
      
      // If we're offline and have no cached data
      return {
        success: false,
        error: 'No cached data available while offline'
      };
    } catch (error) {
      console.error('Error fetching notices:', error);
      
      // Try to get cached data as fallback
      const cachedData = await getCachedData(LOCAL_STORAGE_KEYS.NOTICES);
      
      if (cachedData) {
        return {
          success: true,
          data: cachedData,
          fromCache: true,
          pagination: {
            hasNext: false,
            hasPrevious: false,
            currentPage: 1,
            totalPages: 1,
            totalCount: cachedData.length
          },
          error: error.message
        };
      }
      
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };
  
  // Get notice details
  const fetchNoticeDetails = async (noticeId, forceRefresh = false) => {
    try {
      // If we're offline or we have cached data and aren't forcing refresh
      if ((authState.isOffline || !forceRefresh) && authState.offlineEnabled) {
        const cachedData = await getCachedData(`notice_detail_${noticeId}`);
        
        if (cachedData) {
          return {
            success: true,
            data: cachedData,
            fromCache: true
          };
        }
      }
      
      // If we're online, make the API call
      if (!authState.isOffline) {
        const response = await axios.get(`${API_NOTICES}/${noticeId}/`);
        const data = response.data;
        
        // Cache the data for offline use
        if (authState.offlineEnabled) {
          await cacheDataForOffline(`notice_detail_${noticeId}`, data);
        }
        
        return {
          success: true,
          data,
          fromCache: false
        };
      }
      
      // If we're offline and have no cached data
      return {
        success: false,
        error: 'No cached data available while offline'
      };
    } catch (error) {
      console.error('Error fetching notice details:', error);
      
      // Try to get cached data as fallback
      const cachedData = await getCachedData(`notice_detail_${noticeId}`);
      
      if (cachedData) {
        return {
          success: true,
          data: cachedData,
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
    // Create a new notice
  const createNotice = async (noticeData) => {
    try {
      if (authState.isOffline) {
        return await queueOfflineAction('createNotice', { noticeData });
      }
      
      // Log data being sent to the API for debugging
      console.log('Creating notice with data:', JSON.stringify(noticeData));
      
      const response = await axios.post(`${API_NOTICES}/`, noticeData);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error creating notice:', error);
      console.error('Error details:', error.response?.data);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };
  
  // Update an existing notice
  const updateNotice = async (noticeId, noticeData) => {
    try {
      if (authState.isOffline) {
        return await queueOfflineAction('updateNotice', { noticeId, noticeData });
      }
      
      const response = await axios.patch(`${API_NOTICES}/${noticeId}/`, noticeData);
      
      return {
        success: true,
        data: response.data
      };
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
      if (authState.isOffline) {
        return await queueOfflineAction('deleteNotice', { noticeId });
      }
      
      await axios.delete(`${API_NOTICES}/${noticeId}/`);
      
      return {
        success: true
      };
    } catch (error) {
      console.error('Error deleting notice:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };
  
  // Send notice to specific recipients
  const sendNotice = async (noticeId, recipientIds) => {
    try {
      if (authState.isOffline) {
        return await queueOfflineAction('sendNotice', { noticeId, recipientIds });
      }
      
      const response = await axios.post(`${API_NOTICES}/${noticeId}/send/`, {
        recipients: recipientIds
      });
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error sending notice:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };
  
  return {
    fetchAllNotices,
    fetchNoticeDetails,
    createNotice,
    updateNotice,
    deleteNotice,
    sendNotice
  };
}
