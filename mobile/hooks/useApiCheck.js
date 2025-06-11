import axios from 'axios';
import { useApi } from './useApi';

/**
 * Custom hook to verify API endpoints connectivity
 * This is useful for debugging API URL structure issues
 */
export const useApiCheck = () => {
  const { endpoints, API_URL } = useApi();
  
  /**
   * Test an API endpoint and return the status
   * @param {string} url - The endpoint URL to test
   * @param {string} method - HTTP method (get, post, etc.)
   * @returns {Promise<Object>} - Result of the test
   */
  const testEndpoint = async (url, method = 'get') => {
    try {
      const response = await axios({
        method,
        url,
        timeout: 5000, // Set a timeout of 5 seconds
      });
      
      return {
        success: true,
        status: response.status,
        message: 'Endpoint is accessible',
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        status: error.response?.status || 0,
        message: error.message,
        error: error.response?.data || {},
        url // Include the URL that failed
      };
    }
  };
  
  /**
   * Test all critical API endpoints
   * @returns {Promise<Object>} - Results of all tests
   */  const checkAllEndpoints = async () => {
    const results = {
      properties: await testEndpoint(endpoints.properties),
      users: await testEndpoint(endpoints.users),
      tenants: await testEndpoint(endpoints.tenants),
      tickets: await testEndpoint(endpoints.tickets),
      auth: await testEndpoint(endpoints.auth.token, 'post'),
      analytics: await testEndpoint(endpoints.dashboardSummary)
    };
    
    // Calculate overall status
    const hasFailures = Object.values(results).some(result => !result.success);
    
    return {
      success: !hasFailures,
      results,
      timestamp: new Date().toISOString()
    };
  };
  
  /**
   * Check a specific tenant portal code
   * @param {string} code - QR code to test
   * @returns {Promise<Object>} - Results of tenant portal tests
   */
  const checkTenantPortalEndpoints = async (code) => {
    if (!code) {
      return {
        success: false,
        message: 'No QR code provided'
      };
    }
    
    const results = {
      access: await testEndpoint(endpoints.tenantPortal(code)),
      createTicket: await testEndpoint(endpoints.createTicket(code), 'post')
    };
    
    const hasFailures = Object.values(results).some(result => !result.success);
    
    return {
      success: !hasFailures,
      results,
      timestamp: new Date().toISOString()
    };
  };
  
  return {
    testEndpoint,
    checkAllEndpoints,
    checkTenantPortalEndpoints
  };
};
