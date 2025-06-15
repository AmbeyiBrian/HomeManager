import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { API_ORGANIZATIONS } from '../../../config/apiConfig';

export default function organizationModule(authState, setAuthState, { cacheDataForOffline, getCachedData, queueOfflineAction }) {
  // Set current organization
  const setCurrentOrganization = async (organization) => {
    try {
      if (organization) {
        await SecureStore.setItemAsync('current_org_id', organization.id.toString());
        axios.defaults.headers.common['X-Organization-ID'] = organization.id.toString();
      } else {
        await SecureStore.deleteItemAsync('current_org_id');
        delete axios.defaults.headers.common['X-Organization-ID'];
      }
      
      setAuthState(prevState => ({
        ...prevState,
        currentOrganization: organization
      }));
      
      return { success: true };
    } catch (error) {
      console.error('Error setting current organization:', error);
      return { success: false, error: error.message };
    }
  };

  // Fetch my organization (singular - users have only one organization)
  const fetchMyOrganization = async (forceRefresh = false) => {
    try {
      // If we're offline, try to get cached data
      if (authState.isOffline && !forceRefresh) {
        const cachedOrg = await getCachedData('user_organization');
        if (cachedOrg) {
          return {
            success: true,
            data: cachedOrg,
            fromCache: true
          };
        }
        return {
          success: false,
          error: 'No cached organization data available while offline',
          fromCache: false
        };
      }
      
      // If we're online, make the API call to the correct endpoint
      const response = await axios.get(`${API_USERS}/my_organization/`);
      
      // Extract the organization from the response
      let organizationData = null;
      
      // Handle both single object and results array structure
      if (response.data && typeof response.data === 'object' && response.data.id) {
        organizationData = response.data;
      } else if (response.data.results && response.data.results.length > 0) {
        organizationData = response.data.results[0];
      }
      
      // Cache the data for offline use
      if (authState.offlineEnabled && organizationData) {
        await cacheDataForOffline('user_organization', organizationData);
      }
      
      return {
        success: true,
        data: organizationData,
        fromCache: false
      };
    } catch (error) {
      console.error('Error fetching my organization:', error);
      
      // Try to get cached data as fallback
      const cachedOrg = await getCachedData('user_organization');
      if (cachedOrg) {
        return {
          success: true,
          data: cachedOrg,
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

  // Create a new organization
  const createOrganization = async (organizationData) => {
    try {
      if (authState.isOffline) {
        return await queueOfflineAction('createOrganization', { organizationData });
      }

      const response = await axios.post(`${API_ORGANIZATIONS}/organizations/`, organizationData);
      
      // Cache the new organization
      if (authState.offlineEnabled) {
        const orgs = await getCachedData('user_organizations') || [];
        orgs.push(response.data);
        await cacheDataForOffline('user_organizations', orgs);
      }
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error creating organization:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };
  
  // Update an existing organization
  const updateOrganization = async (organizationId, organizationData) => {
    try {
      if (authState.isOffline) {
        return await queueOfflineAction('updateOrganization', { organizationId, organizationData });
      }

      const response = await axios.put(`${API_ORGANIZATIONS}/organizations/${organizationId}/`, organizationData);
      
      // Update cached organization data
      if (authState.offlineEnabled) {
        const orgs = await getCachedData('user_organizations') || [];
        const updatedOrgs = orgs.map(org => 
          org.id === organizationId ? { ...org, ...response.data } : org
        );
        await cacheDataForOffline('user_organizations', updatedOrgs);
        
        // If this is the current organization, update its cache too
        const currentOrgId = await getCachedData('current_org_id');
        if (currentOrgId && currentOrgId === organizationId.toString()) {
          await cacheDataForOffline('current_organization', response.data);
          
          // Update auth state
          setAuthState(prevState => ({
            ...prevState,
            currentOrganization: response.data
          }));
        }
      }
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error updating organization:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };
  
  // Delete an organization
  const deleteOrganization = async (organizationId) => {
    try {
      if (authState.isOffline) {
        return await queueOfflineAction('deleteOrganization', { organizationId });
      }

      await axios.delete(`${API_ORGANIZATIONS}/organizations/${organizationId}/`);
      
      // Remove from cached organizations
      if (authState.offlineEnabled) {
        const orgs = await getCachedData('user_organizations') || [];
        const updatedOrgs = orgs.filter(org => org.id !== organizationId);
        await cacheDataForOffline('user_organizations', updatedOrgs);
        
        // If this is the current organization, clear it
        const currentOrgId = await getCachedData('current_org_id');
        if (currentOrgId && currentOrgId === organizationId.toString()) {
          await SecureStore.deleteItemAsync('current_org_id');
          await clearCachedData('current_organization');
          
          // Update auth state
          setAuthState(prevState => ({
            ...prevState,
            currentOrganization: null
          }));
        }
      }
      
      return {
        success: true
      };
    } catch (error) {
      console.error('Error deleting organization:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };
  
  // Invite a user to an organization
  const inviteToOrganization = async (organizationId, email, roleId) => {
    try {
      if (authState.isOffline) {
        return await queueOfflineAction('inviteToOrganization', { organizationId, email, roleId });
      }

      // First create a membership for the user
      const response = await axios.post(`${API_ORGANIZATIONS}/memberships/`, {
        organization: organizationId,
        email: email,
        role: roleId
      });
      
      // Then send the invitation email
      if (response.data && response.data.id) {
        try {
          await axios.post(`${API_ORGANIZATIONS}/memberships/${response.data.id}/send_invitation/`);
        } catch (emailError) {
          console.warn('Failed to send invitation email:', emailError);
          // We continue even if the email fails because the membership was created
        }
      }
      
      // Refresh memberships list
      await fetchMemberships(true);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error inviting user to organization:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };
  
  // Get the organization details with related data
  const fetchOrganizationDetails = async (organizationId, forceRefresh = false) => {
    try {
      // Try to get cached data first if we're offline or not forcing refresh
      if ((authState.isOffline || !forceRefresh) && authState.offlineEnabled) {
        const cachedOrgDetails = await getCachedData(`organization_details_${organizationId}`);
        if (cachedOrgDetails) {
          return {
            success: true,
            data: cachedOrgDetails,
            fromCache: true
          };
        }
        
        if (authState.isOffline) {
          return {
            success: false,
            error: 'No cached organization details available while offline',
            fromCache: false
          };
        }
      }
      
      if (!authState.isOffline) {
        const response = await axios.get(`${API_ORGANIZATIONS}/organizations/${organizationId}/`);
        
        // Cache for offline use
        if (authState.offlineEnabled) {
          await cacheDataForOffline(`organization_details_${organizationId}`, response.data);
        }
        
        return {
          success: true,
          data: response.data,
          fromCache: false
        };
      }
      
      return {
        success: false,
        error: 'Unable to fetch organization details'
      };
    } catch (error) {
      console.error('Error fetching organization details:', error);
      
      // Try to get cached data as fallback
      const cachedOrgDetails = await getCachedData(`organization_details_${organizationId}`);
      if (cachedOrgDetails) {
        return {
          success: true,
          data: cachedOrgDetails,
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
    setCurrentOrganization,
    fetchMyOrganization,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    inviteToOrganization,
    fetchOrganizationDetails,
  };
}
