import axios from 'axios';
import { API_BASE_URL } from './api';

// Create an axios instance with default configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Roles and Permissions API endpoints
export const rolesAPI = {
  // Permissions
  getAllPermissions: () => apiClient.get('/users/rbac/permissions/'),
  getContentTypes: () => apiClient.get('/users/rbac/content-types/'),
  
  // Roles
  getAllRoles: (organizationId = null) => {
    const params = {};
    if (organizationId) params.organization = organizationId;
    return apiClient.get('/users/rbac/roles/', { params });
  },
  getRoleById: (id) => apiClient.get(`/users/rbac/roles/${id}/`),
  createRole: (data) => apiClient.post('/users/rbac/roles/', data),
  updateRole: (id, data) => apiClient.put(`/users/rbac/roles/${id}/`, data),
  deleteRole: (id) => apiClient.delete(`/users/rbac/roles/${id}/`),
  getRolePermissions: (roleId) => apiClient.get(`/users/rbac/roles/${roleId}/permissions/`),
  assignPermissionsToRole: (roleId, permissionIds) => 
    apiClient.post(`/users/rbac/roles/${roleId}/assign_permissions/`, { permissions: permissionIds }),
    // User Roles
  getUserRoles: (params = {}) => apiClient.get('/users/rbac/user-roles/', { params }),  assignRoleToUser: (userId, roleId) => 
    apiClient.post('/users/rbac/user-roles/', { user: userId, role: roleId }),
  removeRoleFromUser: (userId, roleId) => 
    apiClient.delete(`/users/rbac/user-roles/${roleId}/`),
  bulkAssignRole: (userIds, roleId) => 
    apiClient.post('/users/rbac/user-roles/bulk_assign/', { users: userIds, role: roleId }),
};

// Organization Users API
export const organizationUsersAPI = {
  getAllUsers: (organizationId) => {
    const params = { organization: organizationId };
    return apiClient.get('/users/rbac/user-roles/', { params });
  },  getUserById: (id) => apiClient.get(`/users/rbac/user-roles/${id}/`),  inviteUser: (email, roleId) => 
    apiClient.post('/users/rbac/invite-user/', { email, role: roleId }),
  assignRoleToUser: (userId, roleId) => 
    apiClient.post(`/users/rbac/user-roles/`, { user: userId, role: roleId }),
  removeRoleFromUser: (userId, roleId) => 
    apiClient.delete(`/users/rbac/user-roles/${roleId}/`),
};
