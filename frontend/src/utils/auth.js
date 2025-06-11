import { jwtDecode } from 'jwt-decode';

/**
 * Utility functions for JWT token handling and organization context
 */

// Get organization information from JWT token
export const getOrganizationFromToken = () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
      const decoded = jwtDecode(token);
    return {
      id: decoded.organization_id,
      name: decoded.organization_name,
      slug: decoded.organization_slug
    };
  } catch (error) {
    console.error("Error decoding token for organization info:", error);
    return null;
  }
};

// Get user information from JWT token
export const getUserFromToken = () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    
    const decoded = jwtDecode(token);
    return {
      id: decoded.user_id,
      username: decoded.username,
      email: decoded.email,
      firstName: decoded.first_name,
      lastName: decoded.last_name,
      isStaff: decoded.is_staff,
      isSuperuser: decoded.is_superuser
    };
  } catch (error) {
    console.error("Error decoding token for user info:", error);
    return null;
  }
};

// Check if current user is admin/staff
export const isCurrentUserAdmin = () => {
  const token = localStorage.getItem('token');
  if (!token) return false;
  
  try {
    const decoded = jwtDecode(token);
    return decoded.is_staff === true || decoded.is_superuser === true;
  } catch (error) {
    console.error("Error parsing user token:", error);
    return false;
  }
};

// Check if user has access to a specific organization
export const checkOrganizationAccess = (organizationId) => {
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

// Check if token is expired
export const isTokenExpired = (token = null) => {
  try {
    const tokenToCheck = token || localStorage.getItem('token');
    if (!tokenToCheck) return true;
    
    const decoded = jwtDecode(tokenToCheck);
    const currentTime = Date.now() / 1000;
    return decoded.exp < currentTime;
  } catch (error) {
    console.error("Error checking token expiration:", error);
    return true;
  }
};

// Get token expiration time
export const getTokenExpiration = (token = null) => {
  try {
    const tokenToCheck = token || localStorage.getItem('token');
    if (!tokenToCheck) return null;
    
    const decoded = jwtDecode(tokenToCheck);
    return new Date(decoded.exp * 1000);
  } catch (error) {
    console.error("Error getting token expiration:", error);
    return null;
  }
};

// Clear authentication data
export const clearAuthData = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('currentOrganization');
};

// Get full user context (user + organization)
export const getUserContext = () => {
  return {
    user: getUserFromToken(),
    organization: getOrganizationFromToken(),
    isAdmin: isCurrentUserAdmin()
  };
};
