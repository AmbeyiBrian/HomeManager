// Test script to debug PropertyDetailScreen issues
// This script will help identify common problems and test the functionality

const fs = require('fs');
const path = require('path');

// Read the PropertyDetailScreen file
const propertyDetailScreenPath = path.join(__dirname, '..', 'screens', 'PropertyDetailScreen.js');
const content = fs.readFileSync(propertyDetailScreenPath, 'utf8');

console.log('=== PropertyDetailScreen Debug Analysis ===\n');

// Check 1: Verify imports
console.log('1. Checking imports...');
const importLines = content.split('\n').filter(line => line.trim().startsWith('import'));
const hasAuthContext = importLines.some(line => line.includes('useAuth'));
const hasApiHook = importLines.some(line => line.includes('useApi'));
console.log('✓ Has useAuth import:', hasAuthContext);
console.log('✓ Has useApi import:', hasApiHook);

// Check 2: Verify route params usage
console.log('\n2. Checking route params usage...');
const hasRouteParams = content.includes('route.params');
const hasPropertyFromParams = content.includes('route.params.property') || content.includes('{ property } = route.params');
console.log('✓ Uses route.params:', hasRouteParams);
console.log('✓ Extracts property from params:', hasPropertyFromParams);

// Check 3: Check for proper property validation
console.log('\n3. Checking property validation...');
const hasPropertyValidation = content.includes('property && property.id');
const hasPropertyIdCheck = content.includes('property.id');
console.log('✓ Has property validation:', hasPropertyValidation);
console.log('✓ Checks property.id:', hasPropertyIdCheck);

// Check 4: Check useEffect dependencies
console.log('\n4. Checking useEffect dependencies...');
const useEffectMatches = content.match(/useEffect\(\(\) => \{[\s\S]*?\}, \[(.*?)\]/g);
if (useEffectMatches) {
    useEffectMatches.forEach((match, index) => {
        const deps = match.match(/\[(.*?)\]/)[1];
        console.log(`✓ useEffect ${index + 1} dependencies: [${deps}]`);
    });
} else {
    console.log('⚠ No useEffect found with dependencies');
}

// Check 5: Check for error handling
console.log('\n5. Checking error handling...');
const hasTryCatch = content.includes('try {') && content.includes('catch');
const hasErrorState = content.includes('propertyDetailsError');
const hasErrorDisplay = content.includes('errorBanner') || content.includes('Error:');
console.log('✓ Has try-catch blocks:', hasTryCatch);
console.log('✓ Uses error state:', hasErrorState);
console.log('✓ Displays errors:', hasErrorDisplay);

// Check 6: Check loading states
console.log('\n6. Checking loading states...');
const hasLoadingState = content.includes('propertyDetailsLoading');
const hasLoadingComponent = content.includes('ActivityIndicator');
const hasRefreshControl = content.includes('RefreshControl');
console.log('✓ Uses loading state:', hasLoadingState);
console.log('✓ Shows loading indicator:', hasLoadingComponent);
console.log('✓ Has pull-to-refresh:', hasRefreshControl);

// Check 7: Check data display
console.log('\n7. Checking data display...');
const hasStatsDisplay = content.includes('stats') && content.includes('totalUnits');
const hasUnitsDisplay = content.includes('units') && content.includes('FlatList');
const hasEmptyState = content.includes('emptyUnits') || content.includes('No units');
console.log('✓ Displays stats:', hasStatsDisplay);
console.log('✓ Displays units list:', hasUnitsDisplay);
console.log('✓ Has empty state:', hasEmptyState);

// Check 8: Check navigation actions
console.log('\n8. Checking navigation actions...');
const hasEditNavigation = content.includes('EditProperty');
const hasAddUnitNavigation = content.includes('AddUnit');
const hasUnitDetailNavigation = content.includes('UnitDetail');
const hasQRNavigation = content.includes('PropertyQR');
console.log('✓ Edit property navigation:', hasEditNavigation);
console.log('✓ Add unit navigation:', hasAddUnitNavigation);
console.log('✓ Unit detail navigation:', hasUnitDetailNavigation);
console.log('✓ QR code navigation:', hasQRNavigation);

// Check 9: Common issues patterns
console.log('\n9. Checking for common issues...');
const possibleIssues = [];

// Check for missing null checks
if (!content.includes('property?.') && content.includes('property.')) {
    possibleIssues.push('Missing optional chaining for property object');
}

// Check for hardcoded values
if (content.includes('localhost') || content.includes('127.0.0.1')) {
    possibleIssues.push('Contains hardcoded localhost URLs');
}

// Check for async/await usage in useEffect
if (content.includes('useEffect(async')) {
    possibleIssues.push('Using async function directly in useEffect (should use inner function)');
}

// Check for missing cleanup
if (!content.includes('clearPropertyDetails')) {
    possibleIssues.push('Missing property details cleanup in useEffect return');
}

if (possibleIssues.length > 0) {
    console.log('⚠ Potential issues found:');
    possibleIssues.forEach(issue => console.log(`  - ${issue}`));
} else {
    console.log('✓ No obvious issues detected');
}

// Check 10: Test property object structure expectations
console.log('\n10. Expected property object structure:');
console.log('The PropertyDetailScreen expects a property object with:');
console.log('- property.id (required for API calls)');
console.log('- property.name (for display)');
console.log('- property.address (for display)');
console.log('- property.image (optional, for header image)');

console.log('\n=== Analysis Complete ===');
console.log('\nTo debug further:');
console.log('1. Check navigation call in PropertiesScreen');
console.log('2. Verify AuthContext fetchPropertyDetails function');
console.log('3. Check API endpoints and responses');
console.log('4. Test with console.log statements in PropertyDetailScreen');
console.log('5. Verify property object structure in PropertiesScreen');
