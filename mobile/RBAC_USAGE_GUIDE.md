# Role-Based Access Control (RBAC) Usage Guide for Mobile App

This guide explains how to properly implement and use the RBAC system in the HomeManager mobile app to control user access to features based on their assigned roles and permissions.

## Table of Contents

1. [Overview](#overview)
2. [Permission Keys](#permission-keys)
3. [Checking Permissions](#checking-permissions)
4. [Implementation Examples](#implementation-examples)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)

## Overview

The HomeManager mobile app uses a role-based access control system that works with the backend RBAC implementation. This system ensures that users can only access features and perform actions that their assigned role permits.

## Permission Keys

The mobile app uses the following permission keys to check user access:

| Permission Key | Description |
|---------------|------------|
| `can_manage_users` | Create, update, and delete users; manage role assignments |
| `can_manage_billing` | Manage billing settings, payment methods, and subscription details |
| `can_manage_properties` | Create, update, and delete property listings and details |
| `can_manage_tenants` | Manage tenant information, leases, and relationships |
| `can_view_reports` | Access analytics, financial reports, and performance metrics |
| `can_manage_roles` | Create, update, and delete roles (automatically granted to owner/admin) |
| `can_manage_system_settings` | Manage system-wide settings (automatically granted to owner/admin) |
| `can_view_dashboard` | Access the main dashboard (granted to all roles except guests) |
| `can_manage_tickets` | Manage maintenance and support tickets |

## Checking Permissions

The `hasPermission()` function from the AuthContext should be used to check if a user has a specific permission:

```javascript
import { useAuth } from '../context/AuthContext';

const MyComponent = () => {
  const { hasPermission } = useAuth();
  
  // Check if the user can manage users
  if (hasPermission('can_manage_users')) {
    // Show user management UI
  } else {
    // Hide the UI or show access denied
  }
};
```

## Implementation Examples

### 1. Conditional Rendering

```javascript
const MyScreen = () => {
  const { hasPermission } = useAuth();
  
  return (
    <View>
      {/* Always visible content */}
      <Text>Welcome to HomeManager</Text>
      
      {/* Conditionally visible content */}
      {hasPermission('can_manage_users') && (
        <Button title="Manage Users" onPress={() => navigation.navigate('UserManagement')} />
      )}
    </View>
  );
};
```

### 2. Permission Check in useEffect

```javascript
useEffect(() => {
  if (!hasPermission('can_manage_billing')) {
    Alert.alert(
      'Access Denied',
      'You do not have permission to access billing settings.',
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  }
}, [hasPermission, navigation]);
```

### 3. Dynamic Navigation

```javascript
const getScreenOptions = () => {
  const { hasPermission } = useAuth();
  
  const screens = [
    { name: 'Dashboard', component: DashboardScreen },
  ];
  
  // Add screens based on permissions
  if (hasPermission('can_manage_properties')) {
    screens.push({ name: 'Properties', component: PropertiesScreen });
  }
  
  if (hasPermission('can_manage_users')) {
    screens.push({ name: 'Users', component: UserManagementScreen });
  }
  
  return screens;
};
```

## Best Practices

1. **Always check permissions**: Never assume a user has access to a feature based on other factors.

2. **Check at multiple levels**:
   - Screen access
   - Feature visibility 
   - Action enablement (e.g., buttons, forms)
   
3. **Provide feedback**: When a user doesn't have permission, show helpful messages explaining why.

4. **Cache permission checks**: For performance, avoid calling `hasPermission()` repeatedly in render functions.

5. **Default to denying access**: If there's any uncertainty about permissions, default to denying access.

## Troubleshooting

### Common Issues:

1. **Permission not working**: Ensure you're using the correct permission key (e.g., `can_manage_users` not `manage_users`).

2. **Offline mode limitations**: Permission checks may use cached data in offline mode. Always sync roles and memberships when coming back online.

3. **Missing permission keys**: If you need a permission not in the standard set, consider if it can be derived from existing permissions instead of creating new ones.

4. **Role changes not reflected**: When roles change, memberships need to be refreshed using `fetchMemberships(true)`.

If you encounter persistent issues with the RBAC system, check the following:

1. User membership status (is it active?)
2. Role assignment (is the correct role assigned?)
3. Role permissions (does the role have the required permissions?)
4. Backend synchronization (is the frontend data in sync with the backend?)
