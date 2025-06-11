import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

// Base API URL configuration
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Create an axios instance with default configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send cookies with requests
  xsrfCookieName: 'csrftoken', // Name of the cookie Django sets for CSRF
  xsrfHeaderName: 'X-CSRFToken', // Name of the header to send the token
});

// Request interceptor for adding auth token and organization context
apiClient.interceptors.request.use(
  (config) => {
    // List of endpoints that should NOT include authentication tokens
    const publicEndpoints = [
      '/api/auth/token/',
      '/api/auth/token/refresh/',
      '/api/users/register/',
      '/api/auth/password/reset/',
      '/api/auth/password/reset/confirm/'
    ];
    
    // Check if this request is to a public endpoint
    const isPublicEndpoint = publicEndpoints.some(endpoint => 
      config.url.includes(endpoint)
    );
      // Only add auth token for non-public endpoints
    if (!isPublicEndpoint) {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        
        // Add organization context from stored data instead of JWT decoding
        const currentOrganization = localStorage.getItem('currentOrganization');
        if (currentOrganization) {
          try {
            const orgData = JSON.parse(currentOrganization);
            if (orgData.slug) {
              config.headers['X-Organization'] = orgData.slug;
            }
          } catch (error) {
            console.warn('Error parsing stored organization data:', error);
          }
        }
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling common errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Unauthorized - token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      // Optional: redirect to login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Helper function to check if the current user is an admin/staff
const isCurrentUserAdmin = () => {
  const token = localStorage.getItem('token');
  if (!token) return false;
  
  try {
    const decoded = jwtDecode(token);
    // Check if the decoded token has is_staff or is_superuser claim
    return decoded.is_staff === true || decoded.is_superuser === true;
  } catch (error) {
    console.error("Error parsing user token:", error);
    return false;
  }
};

// Helper function to check if the user has permission to access a specific organization resource
const hasOrganizationAccess = (organizationId) => {
  const token = localStorage.getItem('token');
  if (!token) return false;
  
  try {
    const decoded = jwtDecode(token);
    // Allow if the user is admin/staff or if they belong to the organization
    return (decoded.is_staff === true || 
            decoded.is_superuser === true || 
            (decoded.organization_id && decoded.organization_id.toString() === organizationId.toString()));
  } catch (error) {
    console.error("Error checking organization access:", error);
    return false;
  }
};

// Auth API endpoints
export const authAPI = {
  login: (credentials) => apiClient.post('/api/auth/token/', credentials),
  refreshToken: (refresh) => apiClient.post('/api/auth/token/refresh/', { refresh }),
  verifyToken: (token) => apiClient.post('/api/auth/token/verify/', { token }),
  getUserProfile: () => apiClient.get('/api/users/me/'),
  register: (userData) => apiClient.post('/api/users/register/', userData),
  changePassword: (data) => apiClient.post('/api/users/change-password/', data),
};

// Dashboard API endpoints
export const dashboardAPI = {
  getKPIs: () => apiClient.get('/api/analytics/dashboards/summary_data/'),
  getProperties: () => apiClient.get('/api/properties/properties/'),
  getUnits: () => apiClient.get('/api/properties/units/'),
  getTenants: () => apiClient.get('/api/tenants/tenants/'),
  getOpenTickets: () => apiClient.get('/api/maintenance/tickets/', { params: { status: ['new', 'assigned', 'in_progress'] } }),
  getPendingPayments: () => apiClient.get('/api/payments/rent/', { params: { status: 'pending' } }),
  getPaidPayments: () => apiClient.get('/api/payments/rent/', { params: { status: 'paid', timeframe: 'current_month' } }),
};

// Properties API endpoints
export const propertiesAPI = {
  getAll: () => apiClient.get('/api/properties/properties/'),
  getById: (id) => apiClient.get(`/api/properties/properties/${id}/`),
  create: (data) => apiClient.post('/api/properties/properties/', data),
  update: (id, data) => apiClient.put(`/api/properties/properties/${id}/`, data),
  delete: (id) => apiClient.delete(`/api/properties/properties/${id}/`),
  getPropertyImages: (propertyId) => apiClient.get(`/api/properties/property-images/`, { params: { property: propertyId } }),
  uploadPropertyImage: (data) => apiClient.post('/api/properties/property-images/', data),
};

// Units API endpoints
export const unitsAPI = {
  getAll: () => apiClient.get('/api/properties/units/'),
  getById: (id) => apiClient.get(`/api/properties/units/${id}/`),
  create: (data) => apiClient.post('/api/properties/units/', data),
  update: (id, data) => apiClient.put(`/api/properties/units/${id}/`, data),
  delete: (id) => apiClient.delete(`/api/properties/units/${id}/`),
  getByProperty: (propertyId) => apiClient.get('/api/properties/units/', { params: { property: propertyId } }),
};

// Tenants API endpoints
export const tenantsAPI = {
  getAll: () => apiClient.get('/api/tenants/tenants/'),
  getById: (id) => apiClient.get(`/api/tenants/tenants/${id}/`),
  create: (data) => apiClient.post('/api/tenants/tenants/', data),
  update: (id, data) => apiClient.patch(`/api/tenants/tenants/${id}/`, data), // Changed from PUT to PATCH
  fullUpdate: (id, data) => apiClient.put(`/api/tenants/tenants/${id}/`, data), // Keep PUT for full updates if needed
  delete: (id) => apiClient.delete(`/api/tenants/tenants/${id}/`),  getLeases: (tenantId) => apiClient.get('/api/tenants/leases/', { params: { tenant: tenantId } }),
};

// Leases API endpoints
export const leasesAPI = {
  getAll: () => apiClient.get('/api/tenants/leases/'),
  getById: (id) => apiClient.get(`/api/tenants/leases/${id}/`),
  create: (data) => apiClient.post('/api/tenants/leases/', data),
  update: (id, data) => apiClient.put(`/api/tenants/leases/${id}/`, data),
  delete: (id) => apiClient.delete(`/api/tenants/leases/${id}/`),
  getByTenant: (tenantId) => apiClient.get('/api/tenants/leases/', { params: { tenant: tenantId } }),
  getByUnit: (unitId) => apiClient.get('/api/tenants/leases/', { params: { unit: unitId } }),
};

// Maintenance API endpoints
export const maintenanceAPI = {
  getAllTickets: () => apiClient.get('/api/maintenance/tickets/'),
  getTicketById: (id) => apiClient.get(`/api/maintenance/tickets/${id}/`),
  createTicket: (data) => apiClient.post('/api/maintenance/tickets/', data),
  updateTicket: (id, data) => apiClient.put(`/api/maintenance/tickets/${id}/`, data),
  deleteTicket: (id) => apiClient.delete(`/api/maintenance/tickets/${id}/`),
  getTicketsByStatus: (status) => apiClient.get('/api/maintenance/tickets/', { params: { status } }),
  addTicketComment: (data) => apiClient.post('/api/maintenance/comments/', data),
  getTicketComments: (ticketId) => apiClient.get('/api/maintenance/comments/', { params: { ticket: ticketId } }),
  getServiceProviders: () => apiClient.get('/api/maintenance/service-providers/'),
};

// Payments API endpoints
export const paymentsAPI = {
  getAllPayments: () => apiClient.get('/api/payments/rent/'),
  getPaymentById: (id) => apiClient.get(`/api/payments/rent/${id}/`),
  createPayment: (data) => apiClient.post('/api/payments/rent/', data),
  updatePayment: (id, data) => apiClient.put(`/api/payments/rent/${id}/`, data),
  deletePayment: (id) => apiClient.delete(`/api/payments/rent/${id}/`),
  getPaymentsByStatus: (status) => apiClient.get('/api/payments/rent/', { params: { status } }),
  initiateMpesaPayment: (data) => apiClient.post('/api/payments/mpesa/initiate/', data),
  checkPaymentStatus: (paymentId) => apiClient.get(`/api/payments/mpesa/status/${paymentId}/`),
  getAllMpesaPayments: () => apiClient.get('/api/payments/mpesa/'),
};

// Organizations API endpoints
export const organizationsAPI = {
  getAll: () => apiClient.get('/api/organizations/organizations/'),
  getById: (id) => apiClient.get(`/api/organizations/organizations/${id}/`),
  create: (data) => apiClient.post('/api/organizations/organizations/', data),
  update: (id, data) => apiClient.patch(`/api/organizations/organizations/${id}/`, data),
  delete: (id) => apiClient.delete(`/api/organizations/organizations/${id}/`),
  
  // Get the current user's organization
  getMyOrganization: async () => {
    try {
      // Use the getAll endpoint which returns the organizations for the logged-in user
      // Since a user can only belong to one organization, this will return at most one organization
      const response = await apiClient.get('/api/organizations/organizations/');
      
      // Handle paginated response format
      const organizations = response.data.results || response.data;
      
      // Check if the user has an organization
      if (Array.isArray(organizations) && organizations.length > 0) {
        const organization = organizations[0]; // Get the first (and should be only) organization
        console.log('Found organization:', organization);
        return { data: organization };
      } else {
        console.warn('No organizations found for this user');
        throw new Error('No organization found for this user');
      }
    } catch (error) {
      console.error('Error getting user organization:', error);
      throw error;
    }  },  getMpesaConfig: async () => {
    try {
      // First get the user's organization
      const myOrgResponse = await organizationsAPI.getMyOrganization();
      if (!myOrgResponse.data?.id) {
        throw new Error('No organization found for this user');
      }
      // Then get its M-PESA config from the properties app
      return apiClient.get(`/properties/organizations/${myOrgResponse.data.id}/mpesa-config/`);
    } catch (error) {
      console.error('Error getting M-PESA configuration:', error);
      throw error;
    }
  },  createMpesaConfig: async (data) => {
    try {
        // Get organization first
      const myOrgResponse = await organizationsAPI.getMyOrganization();
      if (!myOrgResponse.data?.id) {
        throw new Error('No organization found for this user');
      }
      
      // Then check if user is admin or has organization access
      if (!isCurrentUserAdmin()) {
        throw new Error('Permission denied: Only admin users can create M-PESA configuration. Please contact an administrator.');
      }
      
      try {
        const response = await apiClient.post(`/properties/organizations/${myOrgResponse.data.id}/mpesa-config/`, data);
        return response;
      } catch (error) {
        if (error.response && error.response.status === 403) {
          console.error('Permission denied: Only admin users can create M-PESA configuration');
          throw new Error('Permission denied: Only admin users can create M-PESA configuration. Please contact an administrator.');
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Error creating M-PESA configuration:', error);
      throw error;
    }
  },updateMpesaConfig: async (data) => {
    try {      // Get organization first
      const myOrgResponse = await organizationsAPI.getMyOrganization();
      if (!myOrgResponse.data?.id) {
        throw new Error('No organization found for this user');
      }
      
      // Then check if user is admin
      if (!isCurrentUserAdmin()) {
        throw new Error('Permission denied: Only admin users can update M-PESA configuration. Please contact an administrator.');
      }
      
      try {
        // Add Authorization header with Bearer token
        const token = localStorage.getItem('token');
        const response = await apiClient.patch(`/properties/organizations/${myOrgResponse.data.id}/mpesa-config/`, data, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        return response;
      } catch (error) {
        if (error.response && error.response.status === 403) {
          console.error('Permission denied: Only admin users can update M-PESA configuration');
          throw new Error('Permission denied: Only admin users can update M-PESA configuration. Please contact an administrator.');
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Error updating M-PESA configuration:', error);
      throw error;
    }
  },  testMpesaConnection: async () => {
    try {      // Get organization first
      const myOrgResponse = await organizationsAPI.getMyOrganization();
      if (!myOrgResponse.data?.id) {
        throw new Error('No organization found for this user');
      }
      
      // Then check if user is admin
      if (!isCurrentUserAdmin()) {
        throw new Error('Permission denied: Only admin users can test M-PESA connection. Please contact an administrator.');
      }
      
      try {
        // Add Authorization header with Bearer token
        const token = localStorage.getItem('token');
        const response = await apiClient.post(`/properties/organizations/${myOrgResponse.data.id}/test-mpesa/`, {}, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        return response;
      } catch (error) {
        if (error.response && error.response.status === 403) {
          console.error('Permission denied: Only admin users can test M-PESA connection');
          throw new Error('Permission denied: Only admin users can test M-PESA connection. Please contact an administrator.');
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Error testing M-PESA connection:', error);
      throw error;
    }  },
  
  // User management
  searchUsers: (query) => apiClient.get('/api/users/search/', { params: { query } }),
  addUserToOrganization: (userId) => apiClient.post(`/api/organizations/organizations/add-user/`, { user_id: userId }),
  removeUserFromOrganization: (userId) => apiClient.post(`/api/organizations/organizations/remove-user/`, { user_id: userId }),
  getOrganizationUsers: () => apiClient.get(`/api/organizations/organizations/users/`),
};

// Notices API endpoints
export const noticesAPI = {
  getAll: (page = 1, pageSize = 10, status = null, search = null) => {
    const params = { page, page_size: pageSize };
    if (status) params.status = status;
    if (search) params.search = search;
    return apiClient.get('/api/notices/notices/', { params });
  },
  getById: (id) => apiClient.get(`/api/notices/notices/${id}/`),
  create: (data) => apiClient.post('/api/notices/notices/', data),
  update: (id, data) => apiClient.put(`/api/notices/notices/${id}/`, data),
  delete: (id) => apiClient.delete(`/api/notices/notices/${id}/`),
  resendSms: (id) => apiClient.post(`/api/notices/notices/${id}/resend_sms/`),
};

// QR Code API endpoints
export const qrCodeAPI = {
  getAll: () => apiClient.get('/api/properties/qr-codes/'),
  getById: (id) => apiClient.get(`/api/properties/qr-codes/${id}/`),
  create: (data) => apiClient.post('/api/properties/qr-codes/', data),
  update: (id, data) => apiClient.put(`/api/properties/qr-codes/${id}/`, data),
  delete: (id) => apiClient.delete(`/api/properties/qr-codes/${id}/`),
  getPaymentQR: (unitId) => apiClient.get(`/api/properties/payment-qr/${unitId}/image/`),
  getPaymentQRPage: (unitId) => apiClient.get(`/api/properties/payment-qr/${unitId}/`),
  toggleQRPayment: (qrCodeId) => apiClient.post(`/api/properties/qr-codes/${qrCodeId}/toggle-payment/`),
};

// Users API endpoints
export const usersAPI = {
  getProfile: () => apiClient.get('/api/users/me/'),
  updateProfile: (data) => apiClient.patch('/api/users/me/', data),
  uploadAvatar: (data) => apiClient.post('/api/users/upload-avatar/', data),
  searchUsers: (query) => apiClient.get('/api/users/search/', { params: { query } }),
  changePassword: (data) => apiClient.post('/api/users/change-password/', data),
  getAll: () => apiClient.get('/api/users/'),
  getById: (id) => apiClient.get(`/api/users/${id}/`),
  update: (id, data) => apiClient.patch(`/api/users/${id}/`, data),
  delete: (id) => apiClient.delete(`/api/users/${id}/`),
};

// Team members API endpoints
export const teamAPI = {
  getOrganizationMembers: async () => {
    console.log('Fetching organization members');
    try {
      const response = await apiClient.get('/api/organizations/memberships/');
      console.log('Organization members endpoint success');
      return response;
    } catch (err) {
      console.warn('Organization members endpoint failed:', err.message);
      throw err;
    }
  },
  addMember: (data) => {
    console.log('Inviting team member:', data);
    return apiClient.post('/api/users/invite-team-member/', data);
  },
  updateMember: (membershipId, data) => 
    apiClient.put(`/api/organizations/memberships/${membershipId}/`, data),  deleteMember: (membershipId) => 
    apiClient.delete(`/api/organizations/memberships/${membershipId}/`),
};

// SMS API endpoints
export const smsAPI = {
  getTemplates: () => apiClient.get('/api/sms/templates/'),
  getTemplateById: (id) => apiClient.get(`/api/sms/templates/${id}/`),
  createTemplate: (data) => apiClient.post('/api/sms/templates/', data),
  updateTemplate: (id, data) => apiClient.put(`/api/sms/templates/${id}/`, data),
  deleteTemplate: (id) => apiClient.delete(`/api/sms/templates/${id}/`),
  
  getMessages: () => apiClient.get('/api/sms/messages/'),
  getMessageById: (id) => apiClient.get(`/api/sms/messages/${id}/`),
  sendMessage: (data) => apiClient.post('/api/sms/messages/', data),
  
  getProviders: () => apiClient.get('/api/sms/providers/'),
  createProvider: (data) => apiClient.post('/api/sms/providers/', data),
  updateProvider: (id, data) => apiClient.put(`/api/sms/providers/${id}/`, data),
};

// Analytics API endpoints
export const analyticsAPI = {
  getDashboards: () => apiClient.get('/api/analytics/dashboards/'),
  getReports: () => apiClient.get('/api/analytics/reports/'),
  getPropertyMetrics: () => apiClient.get('/api/analytics/property-metrics/'),
  getPaymentAnalytics: () => apiClient.get('/api/analytics/payment-analytics/'),
  getSMSAnalytics: () => apiClient.get('/api/analytics/sms-analytics/'),
};

// Role management API endpoints
export const roleAPI = {
  getRoles: () => apiClient.get('/api/organizations/roles/'),
  getRoleById: (id) => apiClient.get(`/api/organizations/roles/${id}/`),
  createRole: (data) => apiClient.post('/api/organizations/roles/', data),
  updateRole: (id, data) => apiClient.patch(`/api/organizations/roles/${id}/`, data),
  deleteRole: (id) => apiClient.delete(`/api/organizations/roles/${id}/`),
  // Get organization memberships to manage user-role associations
  getMemberships: () => apiClient.get('/api/organizations/memberships/'),
  // Create or update a membership to assign a role to a user
  assignRole: (userId, roleId) => apiClient.post('/api/organizations/memberships/', { 
    user: userId, 
    role: roleId,
    organization: localStorage.getItem('currentOrganization') ? 
      JSON.parse(localStorage.getItem('currentOrganization')).id : null 
  }),
  // Update an existing membership
  updateMembership: (membershipId, data) => apiClient.patch(`/api/organizations/memberships/${membershipId}/`, data),
  // Delete a membership to remove a user from a role
  removeMembership: (membershipId) => apiClient.delete(`/api/organizations/memberships/${membershipId}/`),
};

export default {
  apiClient,
  authAPI,
  dashboardAPI,
  propertiesAPI,
  unitsAPI,
  tenantsAPI,
  leasesAPI,
  maintenanceAPI,
  paymentsAPI,
  organizationsAPI,
  noticesAPI,
  qrCodeAPI,
  usersAPI,
  smsAPI,
  analyticsAPI,
  roleAPI,
  teamAPI,
  isCurrentUserAdmin,
  hasOrganizationAccess,
};
