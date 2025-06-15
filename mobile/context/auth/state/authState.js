import { useState } from 'react';

export const useAuthState = () => {
  const [authState, setAuthState] = useState({
    token: null,
    authenticated: false,
    user: null,
    loading: true,
    isOffline: false,
    currentOrganization: null,
    offlineEnabled: true,
    // Role management states
    roles: [],
    rolesLoading: false,
    rolesError: null,
    memberships: [],
    membershipsLoading: false,
    membershipsError: null,
    // Property states
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

  // Extract commonly used states for easier access in the provider
  const extractCommonStates = () => ({
    user: authState.user,
    isOffline: authState.isOffline,
    authenticated: authState.authenticated,
    // Properties related state
    properties: authState.properties,
    propertiesLoading: authState.propertiesLoading,
    propertiesError: authState.propertiesError,
    propertiesFromCache: authState.propertiesFromCache,
    // Property details state
    currentPropertyUnits: authState.currentPropertyUnits,
    currentPropertyStats: authState.currentPropertyStats,
    propertyDetailsLoading: authState.propertyDetailsLoading,
    propertyDetailsError: authState.propertyDetailsError,
    propertyDetailsFromCache: authState.propertyDetailsFromCache,
    // Roles and memberships state
    roles: authState.roles,
    rolesLoading: authState.rolesLoading,
    rolesError: authState.rolesError,
    memberships: authState.memberships,
    membershipsLoading: authState.membershipsLoading,
    membershipsError: authState.membershipsError,
  });

  return {
    authState,
    setAuthState,
    extractCommonStates,
  };
};
