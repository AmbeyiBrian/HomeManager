// Test script to validate API endpoint configuration
const fs = require('fs');

console.log('=== API Endpoint Configuration Test ===\n');

// Read the config file content
const configPath = './config/apiConfig.js';
const configContent = fs.readFileSync(configPath, 'utf8');

console.log('Reading API configuration...');

// Extract key values using regex
const apiPropertiesMatch = configContent.match(/API_PROPERTIES\s*=\s*`([^`]+)`/);
const apiUrlMatch = configContent.match(/API_URL\s*=\s*`([^`]+)`/);
const baseUrlMatch = configContent.match(/API_BASE_URL\s*=\s*([^;]+);/);

if (apiPropertiesMatch) {
    console.log('✅ Found API_PROPERTIES configuration');
    console.log('API_PROPERTIES pattern:', apiPropertiesMatch[1]);
} else {
    console.log('❌ Could not find API_PROPERTIES configuration');
}

// Check for the corrected configuration
const hasCorrectProperties = configContent.includes('API_PROPERTIES = `${API_URL}/properties`');
const hasIncorrectProperties = configContent.includes('API_PROPERTIES = `${API_URL}/properties/properties`');

if (hasCorrectProperties && !hasIncorrectProperties) {
    console.log('✅ API_PROPERTIES configuration is correct (no duplicate "properties")');
} else if (hasIncorrectProperties) {
    console.log('❌ API_PROPERTIES still has duplicate "properties" in path');
} else {
    console.log('⚠️  Could not determine API_PROPERTIES configuration');
}

// Read the useApi hook file
const useApiPath = './hooks/useApi.js';
const useApiContent = fs.readFileSync(useApiPath, 'utf8');

console.log('\nChecking useApi hook...');

// Check for rent_stats vs rent-stats
const hasCorrectRentStats = useApiContent.includes('/rent_stats/');
const hasIncorrectRentStats = useApiContent.includes('/rent-stats/');

if (hasCorrectRentStats && !hasIncorrectRentStats) {
    console.log('✅ Rent stats endpoint uses correct format (rent_stats)');
} else if (hasIncorrectRentStats) {
    console.log('❌ Rent stats endpoint still uses incorrect format (rent-stats)');
} else {
    console.log('⚠️  Could not find rent stats endpoint configuration');
}

console.log('\n=== Expected URL Patterns ===');
console.log('Properties List: http://192.169.0.105:8000/api/properties/');
console.log('Property Detail: http://192.169.0.105:8000/api/properties/{id}/');
console.log('Property Units: http://192.169.0.105:8000/api/properties/units/?property={id}');
console.log('Rent Stats: http://192.169.0.105:8000/api/properties/{id}/rent_stats/');

console.log('\n=== Test Complete ===');
