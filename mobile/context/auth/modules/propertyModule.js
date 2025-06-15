import axios from 'axios';
import { API_BASE_URL, API_PROPERTIES } from '../../../config/apiConfig';
import { LOCAL_STORAGE_KEYS } from '../constants';

export default function propertyModule(authState, setAuthState, { cacheDataForOffline, getCachedData, queueOfflineAction }) {
  // Fetch all properties with offline support
  const fetchProperties = async (forceRefresh = false) => {
    try {
      setAuthState(prev => ({ ...prev, propertiesLoading: true }));
      
      // If we're offline or we have cached data and aren't forcing refresh
      if ((authState.isOffline || !forceRefresh) && authState.offlineEnabled) {
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
        const response = await axios.get(`${API_PROPERTIES}/properties`);
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
        error: 'No cached data available while offline'
      };
    } catch (error) {
      console.error('Error fetching properties:', error);
      
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
  
  // Get detailed information for a specific property
  const fetchPropertyDetails = async (propertyId, forceRefresh = false) => {
    try {
      setAuthState(prev => ({ ...prev, propertyDetailsLoading: true }));
      
      // If we're offline or we have cached data and aren't forcing refresh
      if ((authState.isOffline || !forceRefresh) && authState.offlineEnabled) {
        const cachedData = await getCachedData(`property_detail_${propertyId}`);
        
        if (cachedData) {
          setAuthState(prev => ({ 
            ...prev, 
            currentPropertyUnits: cachedData.units || [], 
            currentPropertyStats: cachedData.stats || {
              totalUnits: 0,
              occupiedUnits: 0,
              vacantUnits: 0,
              rentCollected: 0,
              pendingRent: 0,
              openTickets: 0,
            },
            propertyDetailsLoading: false,
            propertyDetailsError: null,
            propertyDetailsFromCache: true
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
        // Get property details with units included
        const response = await axios.get(`${API_PROPERTIES}/properties/${propertyId}/`);
        const propertyData = response.data;
        
        // Extract units and format stats
        const units = propertyData.units || [];
        
        // Calculate basic stats from propertyData
        const stats = {
          // Use property serializer fields if available, otherwise calculate from units
          totalUnits: propertyData.unit_count || units.length,
          occupiedUnits: propertyData.occupied_units || units.filter(unit => unit.is_occupied).length,
          vacantUnits: propertyData.unit_count ? (propertyData.unit_count - propertyData.occupied_units) : units.filter(unit => !unit.is_occupied).length,
          rentCollected: 0,
          pendingRent: 0,
          openTickets: 0,
        };
        
        // Fetch additional rent statistics
        try {
          const rentStatsResponse = await axios.get(`${API_PROPERTIES}/properties/${propertyId}/rent_stats/`);
          const rentStats = rentStatsResponse.data;
          
          stats.rentCollected = rentStats.collected || 0;
          stats.pendingRent = rentStats.pending || 0;
        } catch (rentStatsError) {
          console.warn('Could not fetch rent stats:', rentStatsError);
          // Keep default values
        }
        
        // Fetch open tickets count
        try {
          const ticketsResponse = await axios.get(`${API_PROPERTIES}/maintenance/tickets/?property=${propertyId}&status=new&status=assigned&status=in_progress&status=on_hold`);
          stats.openTickets = ticketsResponse.data.count || ticketsResponse.data.length || 0;
        } catch (ticketError) {
          console.warn('Could not fetch tickets count:', ticketError);
          // Keep default value of 0
        }
        
        // Cache the complete property details for offline use
        if (authState.offlineEnabled) {
          await cacheDataForOffline(`property_detail_${propertyId}`, {
            units,
            stats
          });
        }
        
        // Update state
        setAuthState(prev => ({ 
          ...prev, 
          currentPropertyUnits: units,
          currentPropertyStats: stats,
          propertyDetailsLoading: false,
          propertyDetailsError: null,
          propertyDetailsFromCache: false
        }));
        
        return {
          success: true,
          data: {
            units,
            stats
          },
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
        error: 'No cached data available while offline'
      };
    } catch (error) {
      console.error('Error fetching property details:', error);
      
      // Try to get cached data as fallback
      const cachedData = await getCachedData(`property_detail_${propertyId}`);
      
      if (cachedData) {
        setAuthState(prev => ({ 
          ...prev, 
          currentPropertyUnits: cachedData.units || [], 
          currentPropertyStats: cachedData.stats || {
            totalUnits: 0,
            occupiedUnits: 0,
            vacantUnits: 0,
            rentCollected: 0,
            pendingRent: 0,
            openTickets: 0,
          },
          propertyDetailsLoading: false,
          propertyDetailsError: error.message,
          propertyDetailsFromCache: true
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
    // Create a new property
  const createProperty = async (propertyData) => {
    try {
      if (authState.isOffline) {
        return await queueOfflineAction('createProperty', { propertyData });
      }
      
      let config = {};
      
      // Set proper headers when sending FormData
      if (propertyData instanceof FormData) {
        config = {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Accept': 'application/json',
          }
        };
        console.log('Using multipart/form-data headers for FormData');
      }
      
      const response = await axios.post(API_PROPERTIES + '/properties/', propertyData, config);
      
      // Refresh the properties list
      await fetchProperties(true);
      
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
  };
    // Update an existing property
  const updateProperty = async (propertyId, propertyData) => {
    try {
      if (authState.isOffline) {
        return await queueOfflineAction('updateProperty', { propertyId, propertyData });
      }
      
      let config = {};
      
      // Set proper headers when sending FormData
      if (propertyData instanceof FormData) {
        config = {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Accept': 'application/json',
          }
        };
        console.log('Using multipart/form-data headers for FormData');
      }
      
      const response = await axios.patch(`${API_PROPERTIES}/properties/${propertyId}/`, propertyData, config);
      
      // Refresh the properties list
      await fetchProperties(true);
      
      // If property details are already loaded, refresh them too
      if (authState.currentPropertyUnits.length > 0) {
        await fetchPropertyDetails(propertyId, true);
      }
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error updating property:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };
  // Create a new unit in a property
  const createUnit = async (propertyId, unitData) => {
    try {
      if (authState.isOffline) {
        return await queueOfflineAction('createUnit', { propertyId, unitData });
      }
      
      // Add property_id if it wasn't included
      const fullUnitData = {
        ...unitData,
        property: propertyId,
      };
      
      // Set up config with proper headers
      let config = {};
      
      // Set proper headers when sending FormData
      if (fullUnitData instanceof FormData) {
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
      
      const response = await axios.post(`${API_PROPERTIES}/units/`, fullUnitData, config);
      
      // Refresh property details to include the new unit
      if (authState.currentPropertyUnits.length > 0) {
        await fetchPropertyDetails(propertyId, true);
      }
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error creating unit:', error);
      
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
  };
    // Fetch property by ID with offline support
  const fetchPropertyById = async (propertyId, forceRefresh = false) => {
    try {
      // If we're offline or we have cached data and aren't forcing refresh
      if ((authState.isOffline || !forceRefresh) && authState.offlineEnabled) {
        // Try to get from property-specific cache first
        const cachedProperty = await getCachedData(`property_${propertyId}`);
        
        if (cachedProperty) {
          return {
            success: true,
            data: cachedProperty,
            fromCache: true
          };
        }
        
        // If no specific property cache, try to find in all properties cache
        const allCachedProperties = await getCachedData(LOCAL_STORAGE_KEYS.PROPERTIES);
        if (allCachedProperties) {
          const property = allCachedProperties.find(p => p.id === propertyId || p._id === propertyId);
          if (property) {
            return {
              success: true,
              data: property,
              fromCache: true
            };
          }
        }
      }
      
      // If we're online, make the API call
      if (!authState.isOffline) {
        const response = await axios.get(`${API_PROPERTIES}/properties/${propertyId}/`);
        const data = response.data;
        
        // Cache the data for offline use
        if (authState.offlineEnabled) {
          await cacheDataForOffline(`property_${propertyId}`, data);
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
        error: 'No cached data available for this property while offline'
      };
    } catch (error) {
      console.error(`Error fetching property with ID ${propertyId}:`, error);
      
      // Try to get cached data as fallback
      const cachedProperty = await getCachedData(`property_${propertyId}`);
      if (cachedProperty) {
        return {
          success: true,
          data: cachedProperty,
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
  
  // Fetch unit by ID with offline support
  const fetchUnitById = async (unitId, forceRefresh = false) => {
    try {
      // If we're offline or we have cached data and aren't forcing refresh
      if ((authState.isOffline || !forceRefresh) && authState.offlineEnabled) {
        // Try to get from unit-specific cache first
        const cachedUnit = await getCachedData(`unit_${unitId}`);
        
        if (cachedUnit) {
          return {
            success: true,
            data: cachedUnit,
            fromCache: true
          };
        }
      }
      
      // If we're online, make the API call
      if (!authState.isOffline) {
        const response = await axios.get(`${API_PROPERTIES}/units/${unitId}/`);
        const data = response.data;
        
        // Cache the data for offline use
        if (authState.offlineEnabled) {
          await cacheDataForOffline(`unit_${unitId}`, data);
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
        error: 'No cached data available for this unit while offline'
      };
    } catch (error) {
      console.error(`Error fetching unit with ID ${unitId}:`, error);
      
      // Try to get cached data as fallback
      const cachedUnit = await getCachedData(`unit_${unitId}`);
      if (cachedUnit) {
        return {
          success: true,
          data: cachedUnit,
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

  // Fetch all units for a specific property
  const fetchPropertyUnits = async (propertyId, forceRefresh = false) => {
    try {
      // If we're offline or we have cached data and aren't forcing refresh
      if ((authState.isOffline || !forceRefresh) && authState.offlineEnabled) {
        const cachedData = await getCachedData(`cached_units_${propertyId}`);
        
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
        const response = await axios.get(`${API_PROPERTIES}/properties/${propertyId}/units/`);
        const data = response.data.results || response.data || [];
        
        // Cache the data for offline use
        if (authState.offlineEnabled) {
          await cacheDataForOffline(`cached_units_${propertyId}`, data);
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
      console.error(`Error fetching units for property ${propertyId}:`, error);
      
      // Try to get cached data as fallback
      const cachedData = await getCachedData(`cached_units_${propertyId}`);
      
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

  return {
    fetchProperties,
    fetchPropertyDetails,
    clearPropertyDetails,
    createProperty,
    updateProperty,
    createUnit,
    fetchPropertyById,
    fetchUnitById,
    fetchPropertyUnits,  // Add the new method to the returned object
  };
}
