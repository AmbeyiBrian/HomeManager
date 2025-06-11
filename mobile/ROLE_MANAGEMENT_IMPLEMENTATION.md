# Mobile App Role Management Implementation

## Overview

This document outlines the implementation of role management in the HomeManager mobile app, integrating with the backend API endpoints for role management.

## Changes Made

### 1. Added New Screens

- **RoleManagementScreen**: UI for creating, editing, and deleting organization roles with permissions
- **UserRoleAssignmentScreen**: UI for assigning roles to users within an organization

### 2. Navigation Integration

- Imported new screens in App.js 
- Added screens to MainStackNavigator
- Added navigation links in two places:
  - **OrganizationsScreen**: Dedicated "Administration" section for admin/owner users
  - **ProfileScreen**: Added role management options in the Account section for admin/owner users

### 3. AuthContext Enhancement

- Added hasPermission helper function for checking user permissions consistently
- Exported getRolePermissions function to convert backend role format to permissions array
- Made sure all role management functions are properly exported from AuthContext

## User Flow

1. **Admin/Owner Users**:
   - Can access role management from either:
     - Profile screen > Account section > "Manage Roles" or "Assign User Roles"
     - Organizations screen > Administration section

2. **Regular Users**:
   - Cannot see role management options

## Permission Structure

The permission system is role-based:
- Owner/Admin users automatically have all permissions, including role management
- Custom roles can be created with specific permissions
- The hasPermission() function in AuthContext provides a standardized way to check permissions

## API Endpoints Used

The implementation uses the following endpoints:
- GET/POST/PATCH/DELETE `/api/organizations/roles/`
- GET/POST/PATCH/DELETE `/api/organizations/memberships/`

## Testing

When testing the implementation, verify that:
1. Only admin/owner users can see role management options
2. Roles can be created, edited, and deleted
3. Permissions can be added/removed from roles
4. Users can be assigned different roles
5. Permission changes are reflected in the app's functionality
