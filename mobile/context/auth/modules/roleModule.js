import axios from 'axios';
import { API_ORGANIZATIONS } from '../../../config/apiConfig';

export default function roleModule(authState, setAuthState, { cacheDataForOffline, getCachedData, queueOfflineAction }) {
  // Fetch roles with offline support
  const fetchRoles = async (forceRefresh = false) => {
    try {
      // Set loading state
      setAuthState(prev => ({ ...prev, rolesLoading: true }));
      
      // If we're offline or we have cached data and aren't forcing refresh
      if ((authState.isOffline || !forceRefresh) && authState.offlineEnabled) {
        const cachedData = await getCachedData('roles_data');
        
        if (cachedData) {
          setAuthState(prev => ({ 
            ...prev, 
            roles: cachedData, 
            rolesLoading: false,
            rolesError: null
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
        const response = await axios.get(`${API_ORGANIZATIONS}/roles/`);
        const data = response.data.results || response.data || [];

        console.log('Fetched roles:', response);
        
        // Cache the data for offline use
        if (authState.offlineEnabled) {
          await cacheDataForOffline('roles_data', data);
        }
        
        // Update state
        setAuthState(prev => ({ 
          ...prev, 
          roles: data, 
          rolesLoading: false,
          rolesError: null
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
        rolesLoading: false,
        rolesError: 'No cached data available while offline',
      }));
      
      return {
        success: false,
        error: 'No cached data available while offline'
      };
    } catch (error) {
      console.error('Error fetching roles:', error);
      
      // Try to get cached data as fallback
      const cachedData = await getCachedData('roles_data');
      
      if (cachedData) {
        setAuthState(prev => ({ 
          ...prev, 
          roles: cachedData, 
          rolesLoading: false,
          rolesError: error.message
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
        rolesLoading: false,
        rolesError: error.message,
      }));
      
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };

  // Fetch organization memberships with role details
  const fetchMemberships = async (forceRefresh = false) => {
    try {
      setAuthState(prev => ({ ...prev, membershipsLoading: true }));
      
      // If we're offline or we have cached data and aren't forcing refresh
      if ((authState.isOffline || !forceRefresh) && authState.offlineEnabled) {
        const cachedData = await getCachedData('memberships_data');
        
        if (cachedData) {
          setAuthState(prev => ({ 
            ...prev, 
            memberships: cachedData, 
            membershipsLoading: false,
            membershipsError: null
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
        const response = await axios.get(`${API_ORGANIZATIONS}/memberships/`);
        const data = response.data.results || response.data || [];
        
        // Cache the data for offline use
        if (authState.offlineEnabled) {
          await cacheDataForOffline('memberships_data', data);
        }
        
        // Update state
        setAuthState(prev => ({ 
          ...prev, 
          memberships: data, 
          membershipsLoading: false,
          membershipsError: null
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
        membershipsLoading: false,
        membershipsError: 'No cached data available while offline',
      }));
      
      return {
        success: false,
        error: 'No cached data available while offline'
      };
    } catch (error) {
      console.error('Error fetching memberships:', error);
      
      // Try to get cached data as fallback
      const cachedData = await getCachedData('memberships_data');
      
      if (cachedData) {
        setAuthState(prev => ({ 
          ...prev, 
          memberships: cachedData, 
          membershipsLoading: false,
          membershipsError: error.message
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
        membershipsLoading: false,
        membershipsError: error.message,
      }));
      
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };
  
  // Create or update a role
  const createOrUpdateRole = async (roleData, roleId = null) => {
    try {
      if (authState.isOffline) {
        return await queueOfflineAction('createOrUpdateRole', { roleData, roleId });
      }

      let response;
      // Convert permissions array to role details format expected by the backend      
      const apiRoleData = {
        name: roleData.name,
        description: roleData.description || '',
        ...(roleId === null || roleData.nameChanged ? {
          slug: roleData.name?.toLowerCase().replace(/\s+/g, '-')
        } : {}),
        ...(roleData.permissions ? 
          {
            can_manage_users: roleData.permissions.includes('can_manage_users'),
            can_manage_billing: roleData.permissions.includes('can_manage_billing'),
            can_manage_properties: roleData.permissions.includes('can_manage_properties'),
            can_manage_tenants: roleData.permissions.includes('can_manage_tenants'),
            can_view_reports: roleData.permissions.includes('can_view_reports'),
            can_manage_tickets: roleData.permissions.includes('can_manage_tickets'),
            manage_notices: roleData.permissions.includes('manage_notices')
        } : {})
      };
      
      if (roleId) {
        response = await axios.put(`${API_ORGANIZATIONS}/roles/${roleId}/`, apiRoleData);
      } else {
        response = await axios.post(`${API_ORGANIZATIONS}/roles/`, apiRoleData);
      }
      
      // Refresh roles list
      await fetchRoles(true);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error creating/updating role:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };
  
  // Delete a role
  const deleteRole = async (roleId) => {
    try {
      if (authState.isOffline) {
        return await queueOfflineAction('deleteRole', { roleId });
      }

      await axios.delete(`${API_ORGANIZATIONS}/roles/${roleId}/`);
      
      // Refresh roles list
      await fetchRoles(true);
      
      return {
        success: true
      };
    } catch (error) {
      console.error('Error deleting role:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };
  
  // Assign a role to a user
  const assignRole = async (userId, roleId) => {
    try {
      if (authState.isOffline) {
        return await queueOfflineAction('assignRole', { userId, roleId });
      }

      // First, check if the user already has a membership in the current organization
      const existingMembership = authState.memberships.find(membership => 
        (membership.user === userId || 
         (membership.user_details && membership.user_details.id === userId) ||
         (typeof membership.user === 'object' && membership.user.id === userId))
      );

      let response;
      
      if (existingMembership) {
        // User already has a membership, update their role using PATCH
        console.log('🔄 Updating existing membership:', existingMembership.id, 'with new role:', roleId);
        response = await axios.patch(`${API_ORGANIZATIONS}/memberships/${existingMembership.id}/`, {
          role: roleId
        });
      } else {
        // User doesn't have a membership, create a new one with POST
        // Include organization field - use current organization from auth state
        const organizationId = authState.currentOrganization?.id || authState.user?.organization?.id;
        
        if (!organizationId) {
          throw new Error('No organization found. Cannot assign role.');
        }
        
        console.log('🆕 Creating new membership for user:', userId, 'in organization:', organizationId, 'with role:', roleId);
        response = await axios.post(`${API_ORGANIZATIONS}/memberships/`, {
          user: userId,
          role: roleId,
          organization: organizationId
        });
      }
      
      // Refresh memberships list to reflect the changes
      await fetchMemberships(true);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error assigning role:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };

  // Helper function to convert role details to permissions array
  const getRolePermissions = (roleDetails) => {
    if (!roleDetails) {
      return []; 
    }
    
    const permissions = [];
    
    // Map backend permission booleans to permission strings
    if (roleDetails.can_manage_users) permissions.push('can_manage_users');
    if (roleDetails.can_manage_billing) permissions.push('can_manage_billing');
    if (roleDetails.can_manage_properties) permissions.push('can_manage_properties');
    if (roleDetails.can_manage_tenants) permissions.push('can_manage_tenants');
    if (roleDetails.can_view_reports) permissions.push('can_view_reports');
    if (roleDetails.can_manage_tickets) permissions.push('can_manage_tickets');
    if (roleDetails.manage_notices) permissions.push('manage_notices');
    
    // Add additional permissions based on role type
    if (roleDetails.role_type === 'owner' || roleDetails.role_type === 'admin') {
      permissions.push('can_manage_roles');
      permissions.push('can_manage_system_settings');
    }
    
    if (roleDetails.role_type !== 'guest') {
      permissions.push('can_view_dashboard');
    }
    
    return permissions;
  };
  
  // Function to check if user has a specific permission
  const hasPermission = (permissionName) => {
    // If no roles are loaded yet, return false
    if (!authState.roles || authState.roles.length === 0) {
      return false;
    }
    
    // System admin has all permissions
    if (authState.user && authState.user.is_staff) {
      return true;
    }
    
    // Check if user has any role with this permission
    for (const role of authState.roles) {
      const permissions = getRolePermissions(role);
      if (permissions.includes(permissionName)) {
        return true;
      }
    }
    
    return false;
  };

  return {
    fetchRoles,
    fetchMemberships,
    createOrUpdateRole,
    deleteRole,
    assignRole,
    hasPermission,
    getRolePermissions
  };
}
