// Modified allocateTenantToUnit function with improved debugging

// Find this function in tenantModule.js and modify it to:
// 1. Add better console logs to identify when PATCH vs POST is being used
// 2. Ensure the is_occupied flag is properly updated in the unit cache

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
    };
    
    // Add detailed logging
    console.log(`Tenant allocation: Using ${isReallocation ? 'PATCH' : 'POST'} for tenant ${tenantId} to unit ${unitId}`);
    console.log('Payload:', JSON.stringify(payload));
    
    // Use POST for new allocations and PATCH for reallocations
    const method = isReallocation ? 'patch' : 'post';
    const response = await axios[method](`${API_PROPERTIES}/units/${unitId}/allocate_tenant/`, payload);
    
    console.log(`${method.toUpperCase()} response:`, response.status);
    
    // Update tenant cache if offline is enabled
    if (authState.offlineEnabled) {
      // Update tenant in specific cache with unit info
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
        console.log(`Updated tenant cache for tenant ${tenantId}`);
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
        console.log(`Updated unit cache for unit ${unitId}, set is_occupied=${!isReallocation}`);
      }
      
      // Also update unit in available units cache
      const availableUnitsCache = await getCachedData(`available_units_${propertyId}`);
      if (availableUnitsCache) {
        const updatedAvailableUnits = availableUnitsCache.map(u => 
          u.id === unitId ? { ...u, is_occupied: !isReallocation } : u
        );
        await cacheDataForOffline(`available_units_${propertyId}`, updatedAvailableUnits);
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
