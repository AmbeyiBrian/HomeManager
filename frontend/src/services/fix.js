// Team members API endpoints
export const teamAPI = {
  // Use user-roles endpoint to manage team members
  getOrganizationMembers: async () => {
    try {
      console.log('Fetching organization members for the current user\'s organization');
      // No need to pass organization ID - the backend will filter by the user's organization
      const response = await apiClient.get(`/users/rbac/user-roles/`);
      
      // Add debugging info
      console.log('API Response from getOrganizationMembers:', {
        status: response.status,
        dataType: typeof response.data,
        dataIsArray: Array.isArray(response.data),
        hasPagination: response.data && typeof response.data === 'object' && 'results' in response.data,
        itemCount: Array.isArray(response.data) ? response.data.length : 
                  (response.data && response.data.results ? response.data.results.length : 'N/A')
      });
      
      // Log the actual data
      console.log('Raw API response data:', JSON.stringify(response.data, null, 2));
      
      // Check if we have received an empty array or empty paginated results
      if ((Array.isArray(response.data) && response.data.length === 0) || 
          (response.data && response.data.results && response.data.results.length === 0)) {
        console.warn('API returned empty results. No team members found for this organization.');
      }
      
      return response;
    } catch (error) {
      console.error('Error in getOrganizationMembers:', error);
      // Provide more helpful error message
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      throw error;
    }
  },
  
  // Create a new user and assign them to the organization
  addMember: async (data) => {
    try {
      // Debug: Log the data being sent to the endpoint
      console.log('Sending data to invite-team-member endpoint:', {
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        phone_number: data.phone_number,
        role: data.role
      });
      
      // Use the new dedicated endpoint for adding team members
      const response = await apiClient.post('/users/invite-team-member/', {
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        phone_number: data.phone_number,
        role: data.role
      });
      
      console.log('Team member invitation response:', response.data);
      return response;
    } catch (error) {
      console.error("Error inviting team member:", error);
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      throw error;
    }
  },
  
  updateMember: (roleId, data) => apiClient.put(`/users/rbac/user-roles/${roleId}/`, { 
    role: data.role,
    is_active: data.is_active
  }),
    
  // Deactivate user instead of deleting
  deleteMember: async (roleId, userId) => {
    // First remove the role assignment
    await apiClient.delete(`/users/rbac/user-roles/${roleId}/`);
    
    // Then deactivate the user
    if (userId) {
      return apiClient.patch(`/users/${userId}/`, { is_active: false });
    }
    return Promise.resolve();
  },
};
