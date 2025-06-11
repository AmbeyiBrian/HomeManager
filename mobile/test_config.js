const config = require('./config/apiConfig.js');

console.log('API_BASE_URL:', config.API_BASE_URL);
console.log('API_URL:', config.API_URL);
console.log('API_PROPERTIES:', config.API_PROPERTIES);
console.log('API_TENANTS:', config.API_TENANTS);
console.log('API_PAYMENTS:', config.API_PAYMENTS);

// Also test the useApi hook structure
const { useApi } = require('./hooks/useApi.js');

// Mock React context for testing
const React = { useContext: () => {} };
global.React = React;

try {
  const apiHook = useApi();
  console.log('\nEndpoints from useApi:');
  console.log('properties:', apiHook.endpoints.properties);
  console.log('tenants:', apiHook.endpoints.tenants);
  console.log('payments:', apiHook.endpoints.payments);
} catch (error) {
  console.log('Error testing useApi hook:', error.message);
}
