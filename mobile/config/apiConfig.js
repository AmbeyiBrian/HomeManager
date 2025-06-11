/**
 * API Configuration for different environments
 * 
 * This file contains API URL configurations for different environments.
 * - For Android emulator: 10.0.2.2 is the special IP to reach host machine
 * - For iOS simulator: localhost or 127.0.0.1
 * - For physical devices: Use your computer's actual IP on your network
 */

// Development configurations
const DEV_CONFIG = {
  // Android Emulator
  ANDROID_EMULATOR: 'http://10.0.2.2:8000',
  // iOS Simulator
  IOS_SIMULATOR: 'http://localhost:8000',
  // Local network (for physical devices)
  // Replace with your actual local IP address
  // LOCAL_NETWORK: 'http://10.5.4.88:8000',
  LOCAL_NETWORK: 'http://192.169.0.101:8000',
  // Additional network options for testing
  ALTERNATIVE_NETWORK: 'http://10.5.4.88:8000',
  // LOCALHOST: 'http://127.0.0.1:8000',
};

// Production configuration
const PROD_CONFIG = {
  API_URL: 'https://api.homemanager.co.ke'
};

// Function to detect best API URL based on platform and network
import { Platform, NativeModules } from 'react-native';

// Detect best API URL based on platform, with fallback options
function getBestApiUrl() {
  // For Android emulator
  if (Platform.OS === 'android' && Platform.constants?.Manufacturer?.includes('Genymotion') ||
      Platform.OS === 'android' && !__DEV__) {
    return DEV_CONFIG.ANDROID_EMULATOR;
  }
  
  // For iOS simulator
  if (Platform.OS === 'ios' && __DEV__) {
    return DEV_CONFIG.IOS_SIMULATOR;
  }
  
  // For Expo Go on physical devices, we need to be more flexible
  // as the device might have different network connectivity
  if (__DEV__) {
    // All possible local network options for development
    const possibleUrls = [
      DEV_CONFIG.LOCAL_NETWORK,        // Primary choice
      DEV_CONFIG.ALTERNATIVE_NETWORK,   // Alternative IP
      'http://localhost:8000',         // For tunneling scenarios
      'http://127.0.0.1:8000',         // Direct loopback
      'http://10.0.2.2:8000'           // Android Emulator -> Host
    ];
    
    // Return the configured main URL, but code using this should
    // be prepared to try alternatives from the list if needed
    return DEV_CONFIG.LOCAL_NETWORK;
  }
  
  // Default for production or unknown scenarios
  return DEV_CONFIG.LOCAL_NETWORK;
}

// Network fallback options to try if primary connection fails
export const NETWORK_FALLBACK_URLS = [
  'http://10.5.4.88:8000',      // Fixed IP that's known to work
  'http://localhost:8000',      // Local testing
  'http://127.0.0.1:8000'       // Direct loopback
];

// Select the appropriate base URL
// You can change this based on your current development environment
export const API_BASE_URL = getBestApiUrl();

// Derived API paths
export const API_URL = `${API_BASE_URL}/api`;
export const API_USERS = `${API_URL}/users`;
export const API_PROPERTIES = `${API_URL}/properties`;
export const API_UNITS = `${API_URL}/properties/units`;
export const API_TENANTS = `${API_URL}/tenants`;
export const API_MAINTENANCE = `${API_URL}/maintenance`;
export const API_PAYMENTS = `${API_URL}/payments`;
export const API_NOTICES = `${API_URL}/notices/notices`;
export const API_ORGANIZATIONS = `${API_URL}/organizations`;
export const API_ANALYTICS = `${API_URL}/analytics`;

export default {
  API_BASE_URL,
  API_URL,
  API_USERS,
  API_PROPERTIES,
  API_UNITS,
  API_TENANTS,
  API_MAINTENANCE,
  API_PAYMENTS,
  API_NOTICES,
  API_ORGANIZATIONS,
  API_ANALYTICS,
};
