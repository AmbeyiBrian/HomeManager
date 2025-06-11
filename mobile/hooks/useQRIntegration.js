import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../context/AuthContext';
import { Alert } from 'react-native';

const API_URL = 'http://10.0.2.2:8000/api';

export const useQRIntegration = () => {
  const { token, isOffline, queueOfflineAction } = useAuth();
  
  // Get tenant data from QR code
  const getTenantFromQR = async (qrData) => {
    try {
      // QR codes should have a format like tenant-portal-{uuid}
      const response = await axios.get(`${API_URL}/tenant-portal/${qrData}/access/`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Error fetching tenant from QR:', error);
      return {
        success: false,
        error: error.response?.data || { message: 'Failed to fetch tenant data' },
      };
    }
  };
    // Link a tenant to a unit using QR code
  const linkTenantToUnit = async (qrData, unitId, tenantData = {}) => {
    if (isOffline) {
      Alert.alert(
        'Offline Mode',
        'Cannot link tenant while offline. Please try again when connected to the internet.',
        [{ text: 'OK' }]
      );
      return { success: false, error: { message: 'Cannot perform this action while offline' } };
    }
    
    try {
      // First, verify the QR code and get tenant information
      const qrVerification = await verifyQRCode(qrData);
      if (!qrVerification.success) {
        return qrVerification;
      }
      
      // Get authentication token
      const token = await SecureStore.getItemAsync('token');
      if (!token) {
        return { success: false, error: { message: 'Authentication required' } };
      }

      const headers = { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Check if tenant already exists for this unit
      const existingTenantsResponse = await axios.get(
        `${API_URL}/tenants/tenants/?unit=${unitId}`, 
        { headers }
      );
      
      if (existingTenantsResponse.data && existingTenantsResponse.data.length > 0) {
        // Update existing tenant record if needed
        const existingTenant = existingTenantsResponse.data[0];
        if (tenantData && Object.keys(tenantData).length > 0) {
          const updateResponse = await axios.patch(
            `${API_URL}/tenants/tenants/${existingTenant.id}/`,
            { ...tenantData, unit: unitId },
            { headers }
          );
          return {
            success: true,
            data: updateResponse.data,
            message: 'Tenant updated and linked to unit'
          };
        } else {
          return {
            success: true,
            data: existingTenant,
            message: 'Tenant already linked to unit'
          };
        }
      } else {
        // Create new tenant record if tenant data is provided
        if (tenantData && Object.keys(tenantData).length > 0) {
          const createResponse = await axios.post(
            `${API_URL}/tenants/tenants/`,
            { ...tenantData, unit: unitId },
            { headers }
          );
          
          // Update unit's occupied status
          try {
            await axios.patch(
              `${API_URL}/properties/units/${unitId}/`,
              { is_occupied: true },
              { headers }
            );
          } catch (unitUpdateError) {
            console.warn('Failed to update unit occupied status:', unitUpdateError);
          }
          
          return {
            success: true,
            data: createResponse.data,
            message: 'New tenant created and linked to unit'
          };
        } else {
          return {
            success: false,
            error: { message: 'No tenant data provided for linking' }
          };
        }
      }
    } catch (error) {
      console.error('Error linking tenant:', error);
      return {
        success: false,
        error: error.response?.data || { message: 'Failed to link tenant' },
      };
    }
  };
    // Generate a new QR code for a unit
  const generateUnitQR = async (unitId) => {
    if (isOffline) {
      Alert.alert(
        'Offline Mode',
        'Cannot generate QR code while offline. Please try again when connected to the internet.',
        [{ text: 'OK' }]
      );
      return { success: false, error: { message: 'Cannot perform this action while offline' } };
    }
    
    try {
      const response = await axios.post(`${API_URL}/properties/units/${unitId}/generate_qr_code/`);
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Error generating QR:', error);
      return {
        success: false,
        error: error.response?.data || { message: 'Failed to generate QR code' },
      };
    }
  };
  
  // Verify tenant QR code
  const verifyQRCode = async (qrData) => {
    try {
      const response = await axios.post(`${API_URL}/properties/verify-qr/`, {
        qr_code: qrData,
      });
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Error verifying QR:', error);
      return {
        success: false,
        error: error.response?.data || { message: 'Invalid QR code' },
      };
    }
  };
  
  return {
    getTenantFromQR,
    linkTenantToUnit,
    generateUnitQR,
    verifyQRCode,
  };
};
