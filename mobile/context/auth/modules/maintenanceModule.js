import axios from 'axios';
import { API_MAINTENANCE, API_BASE_URL } from '../../../config/apiConfig';
import { LOCAL_STORAGE_KEYS } from '../constants';

export default function maintenanceModule(authState, setAuthState, { cacheDataForOffline, getCachedData, queueOfflineAction }) {
  // Fetch all maintenance tickets with offline support
  const fetchAllTickets = async (forceRefresh = false, page = 1, pageSize = 20, status = null, propertyId = null, nextPageUrl = null) => {
    try {
      // If we're offline or we have cached data and aren't forcing refresh (only for first page)
      if (page === 1 && !status && !propertyId && !nextPageUrl && (authState.isOffline || !forceRefresh) && authState.offlineEnabled) {
        const cachedData = await getCachedData(LOCAL_STORAGE_KEYS.TICKETS);
        
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
          url = `${API_MAINTENANCE}/tickets/?page=${page}&page_size=${pageSize}`;
          
          if (status) {
            url += `&status=${status}`;
          }
          
          if (propertyId) {
            url += `&property=${propertyId}`;
          }
        }
        
        const response = await axios.get(url);
        const data = response.data.results || [];
        
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
          await cacheDataForOffline(LOCAL_STORAGE_KEYS.TICKETS, data);
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
      console.error('Error fetching maintenance tickets:', error);
      
      // Try to get cached data as fallback
      const cachedData = await getCachedData(LOCAL_STORAGE_KEYS.TICKETS);
      
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
  
  // Fetch tickets for a specific unit
  const fetchUnitTickets = async (unitId, forceRefresh = false) => {
    try {
      // If we're offline or we have cached data and aren't forcing refresh
      if ((authState.isOffline || !forceRefresh) && authState.offlineEnabled) {
        const cachedData = await getCachedData(`unit_tickets_${unitId}`);
        
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
        const response = await axios.get(`${API_BASE_URL}/units/${unitId}/tickets/`);
        const data = response.data.results || response.data || [];
        
        // Cache the data for offline use
        if (authState.offlineEnabled) {
          await cacheDataForOffline(`unit_tickets_${unitId}`, data);
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
      console.error('Error fetching unit tickets:', error);
      
      // Try to get cached data as fallback
      const cachedData = await getCachedData(`unit_tickets_${unitId}`);
      
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
  
  // Create a new maintenance ticket
  const createTicket = async (ticketData) => {
    try {
      if (authState.isOffline) {
        return await queueOfflineAction('createTicket', { ticketData });
      }
      
      const response = await axios.post(`${API_MAINTENANCE}/tickets/`, ticketData);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error creating maintenance ticket:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };
  
  // Update ticket status
  const updateTicketStatus = async (ticketId, status, comments = null) => {
    try {
      if (authState.isOffline) {
        return await queueOfflineAction('updateTicketStatus', { ticketId, status, comments });
      }
      
      const updateData = {
        status,
        ...(comments && { comments })
      };
      
      const response = await axios.patch(`${API_MAINTENANCE}/tickets/${ticketId}/`, updateData);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error updating ticket status:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };
  
  // Add a comment to a ticket
  const addTicketComment = async (ticketId, comment) => {
    try {
      if (authState.isOffline) {
        return await queueOfflineAction('addTicketComment', { ticketId, comment });
      }
      
      const response = await axios.post(`${API_MAINTENANCE}/tickets/${ticketId}/comments/`, {
        comment_text: comment
      });
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error adding ticket comment:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };
  
  return {
    fetchAllTickets,
    fetchUnitTickets,
    createTicket,
    updateTicketStatus,
    addTicketComment
  };
}
