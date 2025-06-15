# Authentication Context Refactoring

This directory contains the completed refactored version of the original `AuthContext.js` file, which has been split into smaller, more maintainable modules.

## Background

The original `AuthContext.js` was a monolithic file exceeding 3000 lines of code that handled authentication, state management, network operations, data caching, and various API calls. This has been refactored into a modular structure for better maintainability.

## Directory Structure

- **AuthContext.js**: Main context provider that combines all modules
- **constants.js**: Shared constants used across modules
- **state/**: 
  - **authState.js**: Central state management
- **helpers/**: 
  - **storageHelpers.js**: Functions for caching and retrieving data
  - **networkHelpers.js**: Functions for handling online/offline operations
  - **tokenHelpers.js**: Functions for JWT token management
  - **index.js**: Helper barrel file for easier imports
- **modules/**: Feature-specific modules
    - **authModule.js**: Core authentication features (login, register, logout)
  - **organizationModule.js**: Organization management features
  - **roleModule.js**: Role and permission management
  - **propertyModule.js**: Property management features
  - **tenantModule.js**: Tenant management features
  - **maintenanceModule.js**: Maintenance ticket features
  - **paymentModule.js**: Payment and billing operations
  - **noticeModule.js**: Notice and communication features
  - **subscriptionModule.js**: Subscription management
  - **index.js**: Module barrel file for easier imports
- **index.js**: Main barrel file for the auth directory

## Usage

### Import the Auth Context

```javascript
import { useAuth } from '../context/AuthContext';
```

This import still works as before, thanks to a compatibility file that redirects to the new modular structure.

For new components, you can also import specific utilities if needed:

```javascript
import { LOCAL_STORAGE_KEYS } from '../context/auth/constants';
import { useAuthState } from '../context/auth/state/authState';
```

## Benefits of Refactoring

1. **Improved Maintainability**: Smaller files are easier to understand, modify, and test
2. **Better Organization**: Code is now organized by feature/domain
3. **Reduced Coupling**: Each module handles its own concerns
4. **Easier Testing**: Modules can be tested in isolation
5. **Better Performance**: Smaller chunks of code may lead to better performance
6. **Easier Collaboration**: Multiple developers can work on different modules simultaneously

## Module Structure

Each feature module is organized as a function that takes the auth state, setter, and required dependencies (like storage helpers), and returns an object with feature-specific functions.

Example:

```javascript
export default function authModule(authState, setAuthState, { cacheDataForOffline, getCachedData, clearCachedData }) {
  // Feature-specific functions here
  const login = async () => { /* ... */ };
  const register = async () => { /* ... */ };
  
  // Return public API
  return {
    login,
    register,
    // ...other functions
  };
}
```

This structure allows for better code isolation while maintaining shared state across the auth context.

## Adding New Features

1. If the feature fits in an existing module, add it there
2. For completely new feature areas, create a new module in the `modules/` directory
3. Add the module to the imports and initialization in `AuthContext.js`
4. Add your module's exports to the `contextValue` object in `AuthContext.js`

## Module Details

### Subscription Module (June 2025)

The subscription module is a key component of the modular Auth Context architecture, handling all subscription-related operations. It integrates with the organization structure to provide organization-specific subscription management. See [SUBSCRIPTION_MODULE.md](/docs/mobile/SUBSCRIPTION_MODULE.md) for details.

Key features:
- Organization-based subscription filtering
- Comprehensive subscription management (create, read, update, cancel)
- Organization-specific caching for offline support
- Robust error handling and validation
- Integration with other Auth Context modules

## Future Improvements

1. Convert to TypeScript for better type safety
2. Add unit tests for individual modules
3. Add more comprehensive documentation
4. Consider further splitting large modules if needed
5. Add error tracking and monitoring
