import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { rolesAPI } from '../services/roleApi';

// Create the context
const RoleContext = createContext();

// Provider component
export const RoleProvider = ({ children }) => {  const { currentUser } = useAuth();
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [contentTypes, setContentTypes] = useState([]);
  const [userRoles, setUserRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Get organization directly from user object
  const organizationId = currentUser?.organization?.id;
  
  // Load roles for the current organization
  const loadRoles = useCallback(async () => {
    if (!organizationId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await rolesAPI.getAllRoles(organizationId);
      setRoles(response.data);
    } catch (err) {
      setError('Failed to load roles');
      console.error('Error loading roles:', err);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);
  
  // Load permissions
  const loadPermissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await rolesAPI.getAllPermissions();
      setPermissions(response.data);
    } catch (err) {
      setError('Failed to load permissions');
      console.error('Error loading permissions:', err);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Load content types
  const loadContentTypes = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await rolesAPI.getContentTypes();
      setContentTypes(response.data);
    } catch (err) {
      setError('Failed to load content types');
      console.error('Error loading content types:', err);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Load user roles for the current organization
  const loadUserRoles = useCallback(async () => {
    if (!organizationId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await rolesAPI.getUserRoles({ organization: organizationId });
      setUserRoles(response.data);
    } catch (err) {
      setError('Failed to load user roles');
      console.error('Error loading user roles:', err);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);
  
  // Create a new role
  const createRole = async (roleData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await rolesAPI.createRole({
        ...roleData,
        organization: organizationId
      });
      
      // Refresh roles
      await loadRoles();
      return response.data;
    } catch (err) {
      setError('Failed to create role');
      console.error('Error creating role:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Update an existing role
  const updateRole = async (roleId, roleData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await rolesAPI.updateRole(roleId, roleData);
      
      // Refresh roles
      await loadRoles();
      return response.data;
    } catch (err) {
      setError('Failed to update role');
      console.error('Error updating role:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Assign permissions to a role
  const assignPermissionsToRole = async (roleId, permissionIds) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await rolesAPI.assignPermissionsToRole(roleId, permissionIds);
      
      // Refresh roles
      await loadRoles();
      return response.data;
    } catch (err) {
      setError('Failed to assign permissions');
      console.error('Error assigning permissions:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Assign a role to a user
  const assignRoleToUser = async (userId, roleId) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await rolesAPI.assignRoleToUser(userId, roleId);
      
      // Refresh user roles
      await loadUserRoles();
      return response.data;
    } catch (err) {
      setError('Failed to assign role to user');
      console.error('Error assigning role to user:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };
    // Remove a role from a user
  const removeRoleFromUser = async (userId, roleId) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await rolesAPI.removeRoleFromUser(userId, roleId);
      
      // Refresh user roles
      await loadUserRoles();
      return response.data;
    } catch (err) {
      setError('Failed to remove role from user');
      console.error('Error removing role from user:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Check if the current user has a specific permission
  const hasPermission = useCallback((permissionCodename) => {
    if (!currentUser || !userRoles || !roles || !permissions) {
      return false;
    }

    const permissionObj = permissions.find(p => p.codename === permissionCodename);
    if (!permissionObj) {
      return false;
    }
    const targetPermissionId = permissionObj.id;

    const currentUserActualId = currentUser.id;
    const rolesForCurrentUser = userRoles
      .filter(ur => (ur.user === currentUserActualId) || (ur.user && ur.user.id === currentUserActualId))
      .map(ur => ur.role.id || ur.role);

    if (rolesForCurrentUser.length === 0) {
      return false;
    }

    for (const roleId of rolesForCurrentUser) {
      const role = roles.find(r => r.id === roleId);
      if (role && role.permissions && role.permissions.includes(targetPermissionId)) {
        return true;
      }
    }

    return false;
  }, [currentUser, userRoles, roles, permissions]);
  
  // Load initial data
  useEffect(() => {
    if (organizationId) {
      loadRoles();
      loadUserRoles();
    }
    loadContentTypes();
    loadPermissions();
  }, [organizationId, loadRoles, loadUserRoles, loadContentTypes, loadPermissions]);
  
  // Context value
  const value = {
    roles,
    permissions,
    contentTypes,
    userRoles,
    loading,
    error,
    loadRoles,
    loadPermissions,
    loadContentTypes,
    loadUserRoles,
    createRole,
    updateRole,
    assignPermissionsToRole,
    assignRoleToUser,
    removeRoleFromUser,
    hasPermission, // Add hasPermission to the context value
  };
  
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
};

// Custom hook for using the role context
export const useRoles = () => {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRoles must be used within a RoleProvider');
  }
  return context;
};
