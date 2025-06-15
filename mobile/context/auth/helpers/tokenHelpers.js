import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { API_URL } from '../../../config/apiConfig';

export const useTokenHelpers = (authState, setAuthState) => {
  // Token refresh function
  const refreshToken = async () => {
    try {
      const currentRefreshToken = await SecureStore.getItemAsync('refreshToken');
      
      if (!currentRefreshToken) {
        return { success: false, error: { detail: 'No refresh token found' } };
      }
      
      // Call the refresh token endpoint
      const response = await axios.post(`${API_URL}/auth/token/refresh/`, {
        refresh: currentRefreshToken
      });
      
      // Extract new tokens
      const newToken = response.data?.access;
      const newRefreshToken = response.data?.refresh; // Some implementations return a new refresh token
      
      if (!newToken) {
        return { success: false, error: { detail: 'Failed to refresh token' } };
      }
      
      // Store the new tokens
      await SecureStore.setItemAsync('token', newToken);
      if (newRefreshToken) {
        await SecureStore.setItemAsync('refreshToken', newRefreshToken);
      }
      
      // Update auth header for future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      return { success: true, data: { token: newToken } };
    } catch (error) {
      console.error('Error refreshing token:', error);
      return { success: false, error: error.response?.data || { detail: 'Token refresh failed' } };
    }
  };
  
  // Function to decode a JWT token and check if it's expired
  const isTokenExpired = (token) => {
    if (!token) return true;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      
      return payload.exp < currentTime;
    } catch (err) {
      console.error('Error decoding token:', err);
      return true;
    }
  };
  
  // Function to check token expiration and refresh if needed
  const checkAndRefreshToken = async () => {
    try {
      const token = authState.token || await SecureStore.getItemAsync('token');
      
      if (!token || isTokenExpired(token)) {
        return await refreshToken();
      }
      
      return { success: true, data: { token } };
    } catch (err) {
      console.error('Error checking and refreshing token:', err);
      return { success: false, error: err };
    }
  };

  return {
    refreshToken,
    isTokenExpired,
    checkAndRefreshToken,
  };
};
