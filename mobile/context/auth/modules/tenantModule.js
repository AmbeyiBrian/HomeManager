import axios from 'axios';
import { API_TENANTS, API_BASE_URL, API_PROPERTIES } from '../../../config/apiConfig';
import { LOCAL_STORAGE_KEYS } from '../constants';

export default function tenantModule(authState, setAuthState, { cacheDataForOffline, getCachedData, queueOfflineAction }) {
  // Fetch all tenants with offline support
  const fetchAllTenants = async (forceRefresh = false) => {
    try {
      // If we're offline or we have cached data and aren't forcing refresh
      if ((authState.isOffline || !forceRefresh) && authState.offlineEnabled) {
        const cachedData = await getCachedData(LOCAL_STORAGE_KEYS.TENANTS);
        
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
        const response = await axios.get(`${API_TENANTS}/tenants/`);
        const data = response.data.results || response.data || [];
        
        // Cache the data for offline use
        if (authState.offlineEnabled) {
          await cacheDataForOffline(LOCAL_STORAGE_KEYS.TENANTS, data);
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
      console.error('Error fetching tenants:', error);
      
      // Try to get cached data as fallback
      const cachedData = await getCachedData(LOCAL_STORAGE_KEYS.TENANTS);
      
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
    // Fetch tenant by ID
  const fetchTenantById = async (tenantId, forceRefresh = false) => {
    try {
      // If we're offline or we have cached data and aren't forcing refresh
      if ((authState.isOffline || !forceRefresh) && authState.offlineEnabled) {
        // Try to get from tenant-specific cache first
        const cachedTenant = await getCachedData(`tenant_${tenantId}`);
        
        if (cachedTenant) {
          return {
            success: true,
            data: cachedTenant,
            fromCache: true
          };
        }
        
        // If no specific tenant cache, try to find in all tenants cache
        const allCachedTenants = await getCachedData(LOCAL_STORAGE_KEYS.TENANTS);
        if (allCachedTenants) {
          const tenant = allCachedTenants.find(t => t.id === tenantId || t._id === tenantId);
          if (tenant) {
            return {
              success: true,
              data: tenant,
              fromCache: true
            };
          }
        }
      }
      
      // If we're online, make the API call
      if (!authState.isOffline) {
        const response = await axios.get(`${API_TENANTS}/tenants/${tenantId}/`);
        const data = response.data;
        
        // Cache the data for offline use
        if (authState.offlineEnabled) {
          await cacheDataForOffline(`tenant_${tenantId}`, data);
          
          // Also update this tenant in the all-tenants cache if it exists
          const allCachedTenants = await getCachedData(LOCAL_STORAGE_KEYS.TENANTS);
          if (allCachedTenants) {
            const updatedTenants = allCachedTenants.map(t => 
              (t.id === tenantId || t._id === tenantId) ? data : t
            );
            await cacheDataForOffline(LOCAL_STORAGE_KEYS.TENANTS, updatedTenants);
          }
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
        error: 'No cached data available for this tenant while offline'
      };
    } catch (error) {
      console.error(`Error fetching tenant with ID ${tenantId}:`, error);
      
      // Try to get cached data as fallback
      const cachedTenant = await getCachedData(`tenant_${tenantId}`);
      if (cachedTenant) {
        return {
          success: true,
          data: cachedTenant,
          fromCache: true,
          error: error.message
        };
      }
      
      // Try to find tenant in all tenants cache
      const allCachedTenants = await getCachedData(LOCAL_STORAGE_KEYS.TENANTS);
      if (allCachedTenants) {
        const tenant = allCachedTenants.find(t => t.id === tenantId || t._id === tenantId);
        if (tenant) {
          return {
            success: true,
            data: tenant,
            fromCache: true,
            error: error.message
          };
        }
      }
      
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };
  
  // Fetch tenants for a specific unit
  const fetchUnitTenants = async (unitId, forceRefresh = false) => {
    try {
      // If we're offline or we have cached data and aren't forcing refresh
      if ((authState.isOffline || !forceRefresh) && authState.offlineEnabled) {
        const cachedData = await getCachedData(`cached_unit_tenants_${unitId}`);
        
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
        const response = await axios.get(`${API_BASE_URL}/units/${unitId}/tenants/`);
        const data = response.data.results || response.data || [];
        
        // Cache the data for offline use
        if (authState.offlineEnabled) {
          await cacheDataForOffline(`cached_unit_tenants_${unitId}`, data);
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
      console.error(`Error fetching tenants for unit ${unitId}:`, error);
      
      // Try to get cached data as fallback
      const cachedData = await getCachedData(`cached_unit_tenants_${unitId}`);
      
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
  
  // Fetch unit lease details
  const fetchUnitLease = async (unitId, forceRefresh = false) => {
    try {
      // If we're offline or we have cached data and aren't forcing refresh
      if ((authState.isOffline || !forceRefresh) && authState.offlineEnabled) {
        const cachedData = await getCachedData(`unit_lease_${unitId}`);
        
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
        const response = await axios.get(`${API_BASE_URL}/units/${unitId}/lease/`);
        const data = response.data;
        
        // Cache the data for offline use
        if (authState.offlineEnabled) {
          await cacheDataForOffline(`unit_lease_${unitId}`, data);
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
      console.error('Error fetching unit lease:', error);
      
      // Try to get cached data as fallback
      const cachedData = await getCachedData(`unit_lease_${unitId}`);
      
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
  
  // Fetch unit details
  const fetchUnitDetails = async (unitId, forceRefresh = false) => {
    try {
      // If we're offline or we have cached data and aren't forcing refresh
      if ((authState.isOffline || !forceRefresh) && authState.offlineEnabled) {
        const cachedData = await getCachedData(`unit_detail_${unitId}`);
        
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
        const response = await axios.get(`${API_BASE_URL}/units/${unitId}/`);
        const data = response.data;
        
        // Cache the data for offline use
        if (authState.offlineEnabled) {
          await cacheDataForOffline(`unit_detail_${unitId}`, data);
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
      console.error('Error fetching unit details:', error);
      
      // Try to get cached data as fallback
      const cachedData = await getCachedData(`unit_detail_${unitId}`);
      
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
    // Create a new tenant
  const createTenant = async (tenantData) => {
    try {
      if (authState.isOffline) {
        return await queueOfflineAction('createTenant', { tenantData });
      }
      
      // Set up config with proper headers
      let config = {};
      
      // Set proper headers when sending FormData
      if (tenantData instanceof FormData) {
        config = {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Accept': 'application/json',
          }
        };
        console.log('Using multipart/form-data headers for FormData');
      } else {
        // For regular JSON data
        config = {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          }
        };
        console.log('Using application/json headers');
      }
      
      const response = await axios.post(`${API_TENANTS}/tenants/`, tenantData, config);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error creating tenant:', error);
      
      // Enhanced error handling
      let errorMessage = '';
      if (error.response?.data) {
        if (typeof error.response.data === 'object') {
          errorMessage = JSON.stringify(error.response.data);
        } else {
          errorMessage = error.response.data;
        }
      } else {
        errorMessage = error.message || 'Unknown error occurred';
      }
      
      return {
        success: false,
        error: error.response?.data || error.message,
        errorDetails: errorMessage
      };
    }
  };  // Update tenant information
  const updateTenant = async (tenant) => {
    try {
      // If we're offline, queue the action
      if (authState.isOffline) {
        await queueOfflineAction('updateTenant', tenant);
        
        // Update in local cache if it exists
        const cachedTenants = await getCachedData(LOCAL_STORAGE_KEYS.TENANTS);
        if (cachedTenants) {
          const updatedTenants = cachedTenants.map(t => 
            (t.id === tenant.id || t._id === tenant.id) ? tenant : t
          );
          await cacheDataForOffline(LOCAL_STORAGE_KEYS.TENANTS, updatedTenants);
        }
        
        // Update tenant-specific cache
        await cacheDataForOffline(`tenant_${tenant.id}`, tenant);
        
        return {
          success: true,
          data: tenant,
          fromCache: true,
          offlineQueued: true
        };
      }
      
      // If online, make API call - use PATCH instead of PUT for partial updates
      const response = await axios.patch(`${API_TENANTS}/tenants/${tenant.id}/`, tenant);
      
      // Update in cache if offline is enabled
      if (authState.offlineEnabled) {
        // Update tenant in tenants list cache if it exists
        const cachedTenants = await getCachedData(LOCAL_STORAGE_KEYS.TENANTS);
        if (cachedTenants) {
          const updatedTenants = cachedTenants.map(t => 
            (t.id === tenant.id || t._id === tenant.id) ? response.data : t
          );
          await cacheDataForOffline(LOCAL_STORAGE_KEYS.TENANTS, updatedTenants);
        }
        
        // Update tenant-specific cache
        await cacheDataForOffline(`tenant_${tenant.id}`, response.data);
      }
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error updating tenant:', error);
      
      let errorMessage;
      if (error.response?.data) {
        if (typeof error.response.data === 'object') {
          errorMessage = JSON.stringify(error.response.data);
        } else {
          errorMessage = error.response.data;
        }
      } else {
        errorMessage = error.message || 'Unknown error occurred';
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  };  // Allocate tenant to a unit
  const allocateTenantToUnit = async (tenantId, unitId, propertyId, leaseDetails = {}, isReallocation = false) => {
    try {
      // If we're offline, queue the action
      if (authState.isOffline) {
        await queueOfflineAction('allocateTenantToUnit', { tenantId, unitId, propertyId, leaseDetails, isReallocation });
        
        return {
          success: false,
          error: 'Cannot allocate tenant to unit while offline',
          offlineQueued: true
        };
      }
        // If online, make API call
      const payload = {
        tenant_id: tenantId,
        unit_id: unitId,
        property_id: propertyId,
        ...leaseDetails
      };      // For EditTenantScreen.js, always use PATCH for tenant allocation
      // Using properties API since that's where units are managed
      // Force PATCH method for all operations from EditTenantScreen
      const method = 'patch';
      console.log(`Using ${method.toUpperCase()} method for tenant allocation. isReallocation=${isReallocation}`);
      console.log(`Tenant ID: ${tenantId}, Unit ID: ${unitId}, Property ID: ${propertyId}`);
      console.log(`Lease Details:`, JSON.stringify(leaseDetails, null, 2));
      
      const endpoint = `${API_PROPERTIES}/units/${unitId}/allocate_tenant/`;
      console.log(`API endpoint: ${endpoint}`);
      
      const response = await axios[method](endpoint, payload);
      
      // Update tenant cache if offline is enabled
      if (authState.offlineEnabled) {
        // Update tenant in specific cache
        const cachedTenant = await getCachedData(`tenant_${tenantId}`);
        if (cachedTenant) {
          const updatedTenant = {
            ...cachedTenant,
            unit_id: unitId,
            property_id: propertyId,
            // Add other fields returned from the response if available
            ...response.data
          };
          await cacheDataForOffline(`tenant_${tenantId}`, updatedTenant);
        }
        
        // Update unit cache with correct occupation status
        // For new allocations (POST): is_occupied = true
        // For reallocations (PATCH): is_occupied = false
        const cachedUnit = await getCachedData(`unit_detail_${unitId}`);
        if (cachedUnit) {
          const updatedUnit = {
            ...cachedUnit,
            is_occupied: !isReallocation // true for POST, false for PATCH
          };
          await cacheDataForOffline(`unit_detail_${unitId}`, updatedUnit);
        }
        
        // Update tenant in all tenants cache
        const cachedTenants = await getCachedData(LOCAL_STORAGE_KEYS.TENANTS);
        if (cachedTenants) {
          const updatedTenants = cachedTenants.map(t => 
            (t.id === tenantId) ? { 
              ...t, 
              unit_id: unitId,
              property_id: propertyId,
              // Add other fields returned from the response if available
              ...response.data
            } : t
          );
          await cacheDataForOffline(LOCAL_STORAGE_KEYS.TENANTS, updatedTenants);
        }
      }
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error allocating tenant to unit:', error);
      
      let errorMessage;
      if (error.response?.data) {
        if (typeof error.response.data === 'object') {
          errorMessage = JSON.stringify(error.response.data);
        } else {
          errorMessage = error.response.data;
        }
      } else {
        errorMessage = error.message || 'Unknown error occurred';
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  };
  
  // Deallocate tenant from a unit
  const deallocateTenantFromUnit = async (tenantId, unitId) => {
    try {
      // If we're offline, queue the action
      if (authState.isOffline) {
        await queueOfflineAction('deallocateTenantFromUnit', { tenantId, unitId });
        
        return {
          success: false,
          error: 'Cannot deallocate tenant from unit while offline',
          offlineQueued: true
        };
      }      // If online, make API call
      // Fix: Use the correct API endpoint for deallocation - using standard REST conventions
      const response = await axios.post(`${API_PROPERTIES}/units/${unitId}/deallocate_tenant/`, { tenant_id: tenantId });
      
      // Update tenant cache if offline is enabled
      if (authState.offlineEnabled) {
        // Update tenant in specific cache
        const cachedTenant = await getCachedData(`tenant_${tenantId}`);
        if (cachedTenant) {
          const updatedTenant = {
            ...cachedTenant,
            unit_id: null,
            property_id: null,
            // Reset unit and property info
            unit_number: null,
            property_name: null
          };
          await cacheDataForOffline(`tenant_${tenantId}`, updatedTenant);
        }
        
        // Update tenant in all tenants cache
        const cachedTenants = await getCachedData(LOCAL_STORAGE_KEYS.TENANTS);
        if (cachedTenants) {
          const updatedTenants = cachedTenants.map(t => 
            (t.id === tenantId) ? { 
              ...t, 
              unit_id: null,
              property_id: null,
              unit_number: null,
              property_name: null
            } : t
          );
          await cacheDataForOffline(LOCAL_STORAGE_KEYS.TENANTS, updatedTenants);
        }
      }
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error deallocating tenant from unit:', error);
      
      let errorMessage;
      if (error.response?.data) {
        if (typeof error.response.data === 'object') {
          errorMessage = JSON.stringify(error.response.data);
        } else {
          errorMessage = error.response.data;
        }
      } else {
        errorMessage = error.message || 'Unknown error occurred';
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  };
  
  // Transfer tenant to a different unit
  const transferTenant = async (tenantId, fromUnitId, toUnitId, transferDetails = {}) => {
    try {
      // If we're offline, queue the action
      if (authState.isOffline) {
        await queueOfflineAction('transferTenant', { tenantId, fromUnitId, toUnitId, transferDetails });
        
        return {
          success: false,
          error: 'Cannot transfer tenant while offline',
          offlineQueued: true
        };
      }
        // If online, make API call
      const payload = {
        tenant_id: tenantId,
        from_unit_id: fromUnitId,
        to_unit_id: toUnitId,
        ...transferDetails
      };
        // Make sure we're using the configured API endpoint - fixing duplicate 'tenants'
      const response = await axios.post(`${API_TENANTS}/${tenantId}/transfer/`, payload);
      
      // Update tenant cache if offline is enabled
      if (authState.offlineEnabled) {
        // Update tenant in specific cache
        const cachedTenant = await getCachedData(`tenant_${tenantId}`);
        if (cachedTenant) {
          const updatedTenant = {
            ...cachedTenant,
            unit_id: toUnitId,
            // Add other fields returned from the response if available
            ...response.data
          };
          await cacheDataForOffline(`tenant_${tenantId}`, updatedTenant);
        }
        
        // Update tenant in all tenants cache
        const cachedTenants = await getCachedData(LOCAL_STORAGE_KEYS.TENANTS);
        if (cachedTenants) {
          const updatedTenants = cachedTenants.map(t => 
            (t.id === tenantId) ? { 
              ...t, 
              unit_id: toUnitId,
              // Add other fields returned from the response if available
              ...response.data
            } : t
          );
          await cacheDataForOffline(LOCAL_STORAGE_KEYS.TENANTS, updatedTenants);
        }
      }
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error transferring tenant:', error);
      
      let errorMessage;
      if (error.response?.data) {
        if (typeof error.response.data === 'object') {
          errorMessage = JSON.stringify(error.response.data);
        } else {
          errorMessage = error.response.data;
        }
      } else {
        errorMessage = error.message || 'Unknown error occurred';
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  };
  // Get list of available units for tenant allocation
  const fetchAvailableUnits = async (propertyId = null, filters = {}) => {
    try {
      // If we're offline, return cached data if available
      if (authState.isOffline && authState.offlineEnabled) {
        const cacheKey = propertyId ? `available_units_${propertyId}` : 'available_units';
        const cachedUnits = await getCachedData(cacheKey);
        
        if (cachedUnits) {
          return {
            success: true,
            data: cachedUnits,
            fromCache: true
          };
        }
        
        return {
          success: false,
          error: 'Cannot fetch available units while offline',
        };
      }
      
      // If online, make API call
      // Build URL with query parameters for all filters
      let url = `${API_PROPERTIES}/units/available/`;
      
      // Start building query parameters
      const queryParams = [];
      
      if (propertyId) {
        queryParams.push(`property_id=${propertyId}`);
      }
        // Add additional filters if provided
      if (filters.bedrooms) {
        queryParams.push(`bedrooms=${filters.bedrooms}`);
      }
      
      if (filters.bathrooms) {
        queryParams.push(`bathrooms=${filters.bathrooms}`);
      }
      
      if (filters.maxRent) {
        queryParams.push(`max_rent=${filters.maxRent}`);
      }
      
      if (filters.maxSecurityDeposit) {
        queryParams.push(`max_security_deposit=${filters.maxSecurityDeposit}`);
      }
      
      // Append query parameters to URL if we have any
      if (queryParams.length > 0) {
        url += `?${queryParams.join('&')}`;
      }
      
      console.log('Fetching available units from:', url);
      
      const response = await axios.get(url);
      const units = response.data.results || response.data || [];
      
      // Cache the data for offline use
      if (authState.offlineEnabled) {
        const cacheKey = propertyId ? `available_units_${propertyId}` : 'available_units';
        await cacheDataForOffline(cacheKey, units);
      }
      
      return {
        success: true,
        data: units
      };
    } catch (error) {
      console.error('Error fetching available units:', error);
      
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };

  return {
    fetchAllTenants,
    fetchTenantById,
    fetchUnitTenants,
    fetchUnitLease,
    fetchUnitDetails,
    createTenant,
    updateTenant,
    allocateTenantToUnit,
    deallocateTenantFromUnit,
    transferTenant,
    fetchAvailableUnits
  };
}
