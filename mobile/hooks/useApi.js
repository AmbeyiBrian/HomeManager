import { useContext } from 'react';
import axios from 'axios';

// Import API configuration from central config file
import { 
  API_BASE_URL, 
  API_URL, 
  API_USERS, 
  API_PROPERTIES,
  API_TENANTS,
  API_MAINTENANCE,
  API_PAYMENTS,
  API_NOTICES,
  API_ORGANIZATIONS,
  API_ANALYTICS
} from '../config/apiConfig';
import { AuthContext } from '../context/AuthContext';

/**
 * Hook to provide consistent API URLs across the application
 * @returns {Object} Object containing all API URLs
 */
export const useApi = () => {
  const { authState } = useContext(AuthContext);

  return {
    API_BASE_URL,
    API_URL,
    API_USERS,
    API_PROPERTIES,
    API_TENANTS,
    API_MAINTENANCE,
    API_PAYMENTS,
    API_NOTICES,
    API_ANALYTICS,
    endpoints: {
      // Properties endpoints
      properties: `${API_PROPERTIES}/properties/`,
      propertyDetail: (id) => `${API_PROPERTIES}/properties/${id}/`,
      propertyUnits: (id) => `${API_URL}/properties/units/?property=${id}`,      
      propertyRentStats: (id) => `${API_PROPERTIES}/${id}/rent_stats/`,
      propertyMpesaConfig: (id) => `${API_URL}/properties/property-mpesa-configs/by_property/?property_id=${id}`,
      
      // QR code endpoints
      bulkQRCodes: (ids) => `${API_PROPERTIES}/qr-codes/bulk/?units=${ids.join(',')}`,
      propertyQRCodes: (propertyId) => `${API_PROPERTIES}/${propertyId}/qr-codes/`,
      
      // Units endpoints
      units: `${API_PROPERTIES}/units/`,
      unitDetail: (id) => `${API_PROPERTIES}/units/${id}/`,
      
      // Tenants endpoints
      tenants: `${API_TENANTS}/tenants/`,
      tenantDetail: (id) => `${API_TENANTS}/tenants/${id}/`,
      unitTenants: (id) => `${API_TENANTS}/tenants/?unit=${id}`,
      unitLeases: (id) => `${API_TENANTS}/leases/?unit=${id}`,
      
      // Maintenance endpoints
      tickets: `${API_MAINTENANCE}/tickets/`,
      ticketDetail: (id) => `${API_MAINTENANCE}/tickets/${id}/`,
      ticketsForProperty: (id) => `${API_MAINTENANCE}/tickets/?property=${id}&status=new&status=assigned&status=in_progress&status=on_hold`,
      unitTickets: (id) => `${API_MAINTENANCE}/tickets/?unit=${id}`,
      
      // Payments endpoints
      payments: `${API_PAYMENTS}/rent/`,
      paymentDetail: (id) => `${API_PAYMENTS}/rent/${id}/`,
      unitPayments: (id) => `${API_PAYMENTS}/rent/?unit=${id}`,
      initiateMpesa: `${API_PAYMENTS}/mpesa-initiate/`,
      mpesaStatus: (checkoutRequestId) => `${API_PAYMENTS}/mpesa-status/${checkoutRequestId}/`,
      
      // Organization endpoints
      organizations: `${API_ORGANIZATIONS}/organizations/`,
      organizationDetail: (id) => `${API_ORGANIZATIONS}/organizations/${id}/`,
      myOrganizations: `${API_ORGANIZATIONS}/organizations/my-organizations/`,
      
      // User endpoints
      users: `${API_USERS}/`,
      currentUser: `${API_USERS}/me/`,
        // Organization roles endpoints
      roles: `${API_ORGANIZATIONS}/roles/`,
      roleDetail: (id) => `${API_ORGANIZATIONS}/roles/${id}/`,
      memberships: `${API_ORGANIZATIONS}/memberships/`,
      membershipDetail: (id) => `${API_ORGANIZATIONS}/memberships/${id}/`,
      
      // Auth endpoints
      auth: {
        token: `${API_URL}/auth/token/`,
        refresh: `${API_URL}/auth/token/refresh/`,
        verify: `${API_URL}/auth/token/verify/`,
      },
      
      // Tenant portal endpoints
      tenantPortal: (code) => `${API_PROPERTIES}/tenant-portal/${code}/access/`,
      createTicket: (code) => `${API_PROPERTIES}/tenant-portal/${code}/create_ticket/`,
      
      // Analytics endpoints
      dashboardSummary: `${API_ANALYTICS}/dashboards/summary_data/`,
      reports: `${API_ANALYTICS}/reports/`,
      generateReport: (id) => `${API_ANALYTICS}/reports/${id}/generate/`,
      propertyMetrics: `${API_ANALYTICS}/property-metrics/summary_data/`,
      paymentAnalytics: `${API_ANALYTICS}/payment-analytics/summary_data/`
    },
    fetchProperties: async () => {
      const response = await axios.get(`${API_BASE_URL}/${API_PROPERTIES}/properties/`, {
        headers: { 'Authorization': `Bearer ${authState.token}` }
      });
      return response.data;
    }
  };
};
