import axios from 'axios';
import { API_PAYMENTS, API_BASE_URL } from '../../../config/apiConfig';
import { LOCAL_STORAGE_KEYS } from '../constants';

export default function paymentModule(authState, setAuthState, { cacheDataForOffline, getCachedData, queueOfflineAction }) {
  // Fetch all payments with offline support
  const fetchAllPayments = async (forceRefresh = false, page = 1, pageSize = 20, status = null, propertyId = null, tenantId = null, nextPageUrl = null) => {
    try {
      // If we're offline or we have cached data and aren't forcing refresh (only first page with no filters)
      if (page === 1 && !status && !propertyId && !tenantId && !nextPageUrl && (authState.isOffline || !forceRefresh) && authState.offlineEnabled) {
        const cachedData = await getCachedData(LOCAL_STORAGE_KEYS.PAYMENTS);
        
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
          url = `${API_PAYMENTS}/rent/?page=${page}&page_size=${pageSize}`;
          
          if (status) {
            url += `&status=${status}`;
          }
          
          if (propertyId) {
            url += `&property=${propertyId}`;
          }
          
          if (tenantId) {
            url += `&tenant=${tenantId}`;
          }        }
        
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
        if (page === 1 && !status && !propertyId && !tenantId && authState.offlineEnabled) {
          await cacheDataForOffline(LOCAL_STORAGE_KEYS.PAYMENTS, data);
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
      console.error('Error fetching payments:', error);
      
      // Try to get cached data as fallback
      const cachedData = await getCachedData(LOCAL_STORAGE_KEYS.PAYMENTS);
      
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
  
  // Fetch payments for a specific unit
  const fetchUnitPayments = async (unitId, forceRefresh = false) => {
    try {
      // If we're offline or we have cached data and aren't forcing refresh
      if ((authState.isOffline || !forceRefresh) && authState.offlineEnabled) {
        const cachedData = await getCachedData(`unit_payments_${unitId}`);
        
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
        const response = await axios.get(`${API_BASE_URL}/units/${unitId}/payments/`);
        const data = response.data.results || response.data || [];
        
        // Cache the data for offline use
        if (authState.offlineEnabled) {
          await cacheDataForOffline(`unit_payments_${unitId}`, data);
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
      console.error('Error fetching unit payments:', error);
      
      // Try to get cached data as fallback
      const cachedData = await getCachedData(`unit_payments_${unitId}`);
      
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
  
  // Record a new payment
  const recordPayment = async (paymentData) => {
    try {
      if (authState.isOffline) {
        return await queueOfflineAction('recordPayment', { paymentData });
      }
      
      const response = await axios.post(`${API_PAYMENTS}/rent/`, paymentData);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error recording payment:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };
  
  // Update payment status
  const updatePaymentStatus = async (paymentId, status, notes = null) => {
    try {
      if (authState.isOffline) {
        return await queueOfflineAction('updatePaymentStatus', { paymentId, status, notes });
      }
      
      const updateData = {
        status,
        ...(notes && { notes })
      };
      
      const response = await axios.patch(`${API_PAYMENTS}/rent/${paymentId}/`, updateData);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error updating payment status:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };
  
  // Generate an invoice
  const generateInvoice = async (unitId, invoiceData) => {
    try {
      if (authState.isOffline) {
        return await queueOfflineAction('generateInvoice', { unitId, invoiceData });
      }
      
      const response = await axios.post(`${API_PAYMENTS}/invoices/`, {
        unit: unitId,
        ...invoiceData
      });
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error generating invoice:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };
  
  // Get payment statistics
  const getPaymentStatistics = async (forceRefresh = false) => {
    try {
      // If we're offline or we have cached data and aren't forcing refresh
      if ((authState.isOffline || !forceRefresh) && authState.offlineEnabled) {
        const cachedData = await getCachedData('payment_statistics');
        
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
        const response = await axios.get(`${API_PAYMENTS}/statistics/`);
        const data = response.data;
        
        // Cache the data for offline use
        if (authState.offlineEnabled) {
          await cacheDataForOffline('payment_statistics', data);
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
      console.error('Error fetching payment statistics:', error);
      
      // Try to get cached data as fallback
      const cachedData = await getCachedData('payment_statistics');
      
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
    // Create a new payment
  const createPayment = async (paymentData) => {
    try {
      if (authState.isOffline) {
        return await queueOfflineAction('createPayment', { paymentData });
      }
      
      const response = await axios.post(`${API_PAYMENTS}/rent/`, paymentData, {
        headers: { 'Authorization': `Token ${authState.token}` }
      });
      
      // If successful, update the cached payments list if it exists
      try {
        const cachedPayments = await getCachedData(LOCAL_STORAGE_KEYS.PAYMENTS);
        
        if (cachedPayments && Array.isArray(cachedPayments)) {
          // Find the unit and tenant information
          const unitResponse = await axios.get(`${API_BASE_URL}/units/${paymentData.unit}/`);
          const tenantResponse = await axios.get(`${API_BASE_URL}/tenants/${paymentData.tenant}/`);
          
          const unit = unitResponse.data;
          const tenant = tenantResponse.data;
          
          // Create a UI-ready payment object
          const newPayment = {
            id: response.data.id.toString(),
            tenant_name: tenant ? `${tenant.first_name} ${tenant.last_name}`.trim() : 'Unknown Tenant',
            tenant_id: paymentData.tenant,
            property_name: unit?.property_name || 'Unknown Property',
            property_id: unit?.property,
            unit_number: unit?.unit_number || 'Unknown Unit',
            unit_id: paymentData.unit,
            amount: parseFloat(paymentData.amount),
            due_date: paymentData.due_date,
            status: 'pending',
            payment_method: null,
            payment_date: null,
            description: paymentData.description || '',
            period_start: paymentData.period_start,
            period_end: paymentData.period_end,
          };
          
          // Add to cache
          await cacheDataForOffline(LOCAL_STORAGE_KEYS.PAYMENTS, [...cachedPayments, newPayment]);
        }
      } catch (cacheError) {
        console.error('Error updating cached payments:', cacheError);
        // Continue without failing as this is just cache management
      }
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error creating payment:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };
  
  return {
    fetchAllPayments,
    fetchUnitPayments,
    recordPayment,
    updatePaymentStatus,
    generateInvoice,
    getPaymentStatistics,
    createPayment
  };
}
