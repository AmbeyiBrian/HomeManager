# Subscription Module Architecture

## Overview (June 2025)

As part of the Auth Context refactoring, subscription functionality has been segmented into its own dedicated module. This module handles all subscription-related operations including fetching, creating, updating, and canceling subscriptions. The module integrates with the organization structure of the application to provide organization-specific subscription management.

### Key Features

1. Organization-based subscription filtering
2. Comprehensive subscription management
3. Offline capability with organization-specific caching
4. Robust error handling and data validation

### Module Design

1. **fetchSubscription Function**:
   - Fetches subscription data for a specific organization
   - Uses organization ID filtering via the `/subscriptions/?organization=${orgId}` endpoint
   - Implements organization-specific caching with keys like `subscription_data_${orgId}`
   - Provides fallback mechanisms for handling different API response formats
   - Supports offline access through cached data

2. **updateSubscriptionPlan Function**:
   - Updates an organization's subscription to a different plan
   - Targets specific subscriptions using their unique ID via `/subscriptions/${subscriptionId}/`
   - Extracts organization ID from response data for proper state updates
   - Includes comprehensive validation and error handling

3. **createSubscription Function**:
   - Creates new subscriptions for organizations
   - Determines organization context from multiple possible sources
   - Implements proper validation before making API calls
   - Updates local cache with new subscription data

4. **cancelSubscription Function**:
   - Handles subscription cancellation with proper ID-based routing
   - Provides reason tracking for subscription cancellations
   - Updates organization-specific cache after cancellation
   - Includes robust error handling

5. **isValidSubscription Function**:
   - Validates subscription objects for required properties
   - Checks subscription status for activity
   - Ensures plan information is available
   - Provides consistent validation across the module

### API Endpoints Used

| Function | Endpoint | Purpose |
|----------|----------|---------|
| fetchSubscription | `/subscriptions/?organization=${orgId}` | Get organization-specific subscriptions |
| updateSubscriptionPlan | `/subscriptions/${subscriptionId}/` | Update an existing subscription |
| createSubscription | `/subscriptions/` | Create a new subscription |
| cancelSubscription | `/subscriptions/${subscriptionId}/cancel/` | Cancel a specific subscription |
| fetchSubscriptionPlans | `/subscriptions/plans/` | Get available subscription plans |
| fetchSubscriptionPayments | `/subscriptions/payments/` | Get subscription payment history |

### Best Practices Implemented

1. **Organization-Specific Caching**: All subscription data is cached with organization-specific keys
2. **Fallback Mechanisms**: Multiple extraction methods ensure compatibility with different API response formats
3. **Proper Error Handling**: Comprehensive error handling with fallbacks to cached data when appropriate
4. **Validation**: Input validation before making API calls prevents unnecessary network requests
5. **Offline Support**: Full support for offline operation using cached subscription data

### Integration with Auth Context

The subscription module is fully integrated into the modular Auth Context architecture:

```javascript
// In AuthContext.js
import subscriptionModule from './modules/subscriptionModule';

// Module initialization
const subscription = subscriptionModule(authState, setAuthState, {
  cacheDataForOffline,
  getCachedData,
  queueOfflineAction
});

// Adding to context value
const contextValue = {
  ...authState,
  ...auth,
  ...organization,
  ...subscription,  // All subscription functions available in context
  ...roles,
  ...properties
};
```

### Usage Example

```javascript
// In a component
import { useAuth } from '../context/auth';

const SubscriptionScreen = () => {
  const { 
    fetchSubscription, 
    updateSubscriptionPlan,
    organization 
  } = useAuth();
  
  useEffect(() => {
    // Get subscription for current organization
    fetchSubscription(organization.id);
  }, [organization]);
};
```

## Related Components

The subscription module is part of the larger Auth Context architecture which includes:

- **authModule**: Core authentication (login, logout)
- **organizationModule**: Organization management
- **roleModule**: Permission and role management
- **subscriptionModule**: Subscription handling
- **propertyModule**: Property management
- **+ other domain-specific modules**

This segmented approach allows each module to focus on its specific domain while sharing the central auth state.
