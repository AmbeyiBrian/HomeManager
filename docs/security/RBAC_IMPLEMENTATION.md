# Role-Based Access Control (RBAC) Implementation

This document explains how Role-Based Access Control (RBAC) is implemented in the HomeManager platform. This system controls which users can perform specific actions within organizations based on their assigned roles and the permissions associated with those roles.

## Table of Contents

1. [Overview](#overview)
2. [Core Components](#core-components)
3. [Data Model](#data-model)
4. [Multi-Tenant Security](#multi-tenant-security)
5. [Permission Flow](#permission-flow)
6. [API Endpoints](#api-endpoints)
7. [Permission Checking](#permission-checking)
8. [Frontend Integration](#frontend-integration)
9. [Mobile App Integration](#mobile-app-integration)
10. [Common Issues and Troubleshooting](#common-issues-and-troubleshooting)
11. [Frontend/Mobile Permission Naming Consistency](#frontendmobile-permission-naming-consistency)

## Overview

The HomeManager platform uses a role-based access control system to manage permissions within organizations. The system associates users with organizations through memberships, and each membership assigns a specific role to the user. Roles define sets of permissions that determine what actions a user can perform within an organization.

## Core Components

The RBAC implementation consists of the following core components:

1. **Organizations** (`Organization` model): Represents a distinct entity that groups users and resources
2. **Roles** (`OrganizationRole` model): Defines sets of permissions that can be assigned to users
3. **Memberships** (`OrganizationMembership` model): Connects users to organizations with a specific role
4. **Permission Checks** (`IsOrganizationOwnerOrAdmin` custom permission class): Enforces access control at the API level

## Data Model

### Organization Role Model

```python
class OrganizationRole(OrganizationModel):
    """
    Represents roles within an organization.
    These are used for permission checking.
    """
    ROLE_TYPES = [
        ('owner', 'Owner'),
        ('admin', 'Admin'),
        ('member', 'Member'),
        ('guest', 'Guest'),
    ]
    
    name = models.CharField(max_length=50)
    slug = models.SlugField(unique=False)  # Unique per organization, not system-wide
    role_type = models.CharField(max_length=20, choices=ROLE_TYPES)
    description = models.TextField(blank=True, null=True)
    
    class Meta:
        ordering = ['name']
        unique_together = ('organization', 'slug')  # Ensure role slugs are unique per organization
    
    # Permissions for this role
    can_manage_users = models.BooleanField(default=False)
    can_manage_billing = models.BooleanField(default=False)
    can_manage_properties = models.BooleanField(default=False)
    can_manage_tenants = models.BooleanField(default=False)
    can_view_reports = models.BooleanField(default=False)
```

The role model defines permissions through boolean fields. Each field represents the ability to perform a specific action or access a specific resource.

### Organization Membership Model

```python
class OrganizationMembership(models.Model):
    """
    Represents a user's membership in an organization.
    This allows users to be members of organizations with different roles.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Relations
    organization = models.ForeignKey('Organization', on_delete=models.CASCADE, related_name='memberships')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='organization_memberships')
    role = models.ForeignKey(OrganizationRole, on_delete=models.PROTECT, related_name='memberships')
    
    # Membership status
    is_active = models.BooleanField(default=True)
    is_invited = models.BooleanField(default=False)
```

The membership model connects users to organizations and assigns a role to that relationship.

## Multi-Tenant Security

The HomeManager platform is designed to support multiple organizations (tenants) using a shared backend. To ensure complete isolation of data and capabilities between organizations, the RBAC system implements several security measures:

### Organization-Scoped Roles

- `OrganizationRole` inherits from `OrganizationModel`, which automatically applies organization filtering
- Roles are uniquely identified by their slug **within each organization**, allowing different organizations to define similar roles
- The database enforces a unique constraint on the combination of `(organization, slug)` to maintain data integrity

### ViewSet Security

All role and membership management is secured at the API level through:

1. **QuerySet Filtering**: Each ViewSet's `get_queryset` method filters results to only show data from the authenticated user's organization
2. **Create Protection**: The `perform_create` methods ensure new roles and memberships are created within the user's organization
3. **Update Protection**: Additional validation in `perform_update` prevents changing a role's organization
4. **Cross-Organization Protection**: When creating memberships, validation ensures the role belongs to the same organization as the membership

### Security Validation

The `OrganizationMembershipViewSet.perform_create` method includes validation to prevent:
- Creating memberships in organizations other than the user's own
- Assigning roles from one organization to memberships in another organization

```python
# Example validation in OrganizationMembershipViewSet
membership = serializer.instance
if membership.role and membership.role.organization != membership.organization:
    membership.delete()  # Clean up the invalid membership
    raise ValidationError("The role must belong to the same organization as the membership")
```

### Testing Multi-Tenant Security

The `test_role_tenant_security.py` script validates the multi-tenant isolation by:
1. Creating two separate organizations with similar roles
2. Verifying users from one organization cannot see or modify roles from another
3. Ensuring cross-organization role assignments are prevented

## Permission Flow

1. A user is added to an organization through a membership
2. The membership assigns a specific role to the user
3. The role defines what permissions the user has within the organization
4. When the user attempts to access a resource or perform an action:
   - The system checks if the user is authenticated
   - It identifies the user's role in the relevant organization
   - It verifies if the role has the necessary permission for the requested action
   - Access is granted or denied based on this check

## API Endpoints

The RBAC system exposes the following key endpoints:

### `/api/organizations/roles/`

Manages the roles defined in the system.

- **GET**: Returns a list of roles (requires admin/owner permissions)
- **POST**: Creates a new role (requires admin/owner permissions)
- **PUT/PATCH**: Updates an existing role (requires admin/owner permissions)
- **DELETE**: Removes a role (requires admin/owner permissions)

Example response:
```json
{
  "count": 3,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "Property Manager",
      "slug": "property-manager",
      "role_type": "admin",
      "description": "Can manage properties and tenants",
      "can_manage_users": true,
      "can_manage_billing": false,
      "can_manage_properties": true,
      "can_manage_tenants": true,
      "can_view_reports": true
    },
    // Additional roles...
  ]
}
```

### `/api/organizations/memberships/`

Manages the relationships between users, organizations, and roles.

- **GET**: Returns a list of memberships for the user's organization
- **POST**: Creates a new membership (invites a user to an organization)
- **PUT/PATCH**: Updates an existing membership (e.g., changes role)
- **DELETE**: Removes a membership (removes a user from an organization)

Example response:
```json
{
  "count": 2,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": "uuid-string",
      "organization": 1,
      "user": 101,
      "user_details": {
        "id": 101,
        "username": "john.doe",
        "email": "john.doe@example.com",
        "first_name": "John",
        "last_name": "Doe"
      },
      "role": 1,
      "role_details": {
        "id": 1,
        "name": "Property Manager",
        "slug": "property-manager",
        "role_type": "admin",
        "description": "Can manage properties and tenants",
        "can_manage_users": true,
        "can_manage_billing": false,
        "can_manage_properties": true,
        "can_manage_tenants": true,
        "can_view_reports": true
      },
      "is_active": true,
      "is_invited": false
    },
    // Additional memberships...
  ]
}
```

## Permission Checking

Permission checks are implemented using Django REST Framework's permission classes. The main permission class is `IsOrganizationOwnerOrAdmin`:

```python
class IsOrganizationOwnerOrAdmin(permissions.BasePermission):
    """
    Custom permission to only allow organization owners or admins to access/modify data.
    """
    def has_permission(self, request, view):
        # Check if user is authenticated
        if not request.user.is_authenticated:
            return False
        
        # Staff/Superusers always have permission
        if request.user.is_superuser or request.user.is_staff:
            return True
        
        # For non-staff users, check organization-level permissions
        user = request.user
        
        # First, check if user has an organization
        if not hasattr(user, 'organization') or not user.organization:
            # Check memberships to find organizations
            from .membership_models import OrganizationMembership
            
            memberships = OrganizationMembership.objects.filter(
                user=user,
                is_active=True
            )
            
            # If we find memberships, check roles
            if memberships.exists():
                for membership in memberships:
                    if not membership.role:
                        continue
                    
                    # Direct check for owner or admin role types
                    if membership.role.role_type in ['owner', 'admin']:
                        return True
                    
                    # Check for specific permission to manage users
                    if membership.role.can_manage_users:
                        return True
            
            return False
        
        # User has an organization, check if they're the primary owner
        if hasattr(user.organization, 'primary_owner') and user.organization.primary_owner == user:
            return True
        
        # Check user's memberships for the organization
        from .membership_models import OrganizationMembership
        
        memberships = OrganizationMembership.objects.filter(
            user=user,
            organization=user.organization,
            is_active=True
        )
        
        for membership in memberships:
            if not membership.role:
                continue
            
            # Check for owner or admin role type
            if membership.role.role_type in ['owner', 'admin']:
                return True
            
            # Check for specific permission to manage users
            if membership.role.can_manage_users:
                return True
        
        # Default deny
        return False
```

This permission class is used in the view sets to restrict access based on the user's role:

```python
class OrganizationRoleViewSet(viewsets.ModelViewSet):
    """ViewSet for viewing and editing OrganizationRole instances"""
    queryset = OrganizationRole.objects.all()
    serializer_class = OrganizationRoleSerializer
    permission_classes = [IsOrganizationOwnerOrAdmin]
```

## Frontend Integration

The frontend integrates with the RBAC system through the following mechanisms:

1. **Role Context**: A context provider that loads and manages role information, including:
   - The user's roles
   - Available roles in the organization
   - Permission checking using the `hasPermission` function

2. **Role-Based UI Elements**: UI elements that are conditionally rendered based on the user's permissions

3. **API Calls**: Role-based API calls that handle CRUD operations for roles and memberships

Example permission check in the frontend (React):
```javascript
const { hasPermission } = useRoles();

// In a component
return (
  <div>
    {hasPermission('can_manage_users') && (
      <button onClick={openUserManagementModal}>Manage Users</button>
    )}
  </div>
);
```

## Mobile App Integration

The mobile app integrates with the RBAC system through:

1. **AuthContext**: Provides authentication and role information to all screens

2. **hasPermission**: A helper function to check if the current user has a specific permission:
   ```javascript
   const hasPermission = (permissionName) => {
     if (!authState.user || !authState.memberships) return false;
     
     // Get user's current organization memberships
     const userRoles = authState.memberships.filter(membership => 
       membership.user === authState.user.id && 
       membership.organization === authState.currentOrganization?.id
     );
     
     if (userRoles.length > 0) {
       // Check if any of the user's roles have the required permission
       const allPermissions = userRoles.flatMap(getRolePermissions);
       return allPermissions.includes(permissionName);
     }
     return false;
   };
   ```

3. **Conditional Rendering**: UI elements that are conditionally rendered based on the user's permissions

4. **Role Management Screens**: Dedicated screens for viewing and managing roles and user assignments

## Frontend/Mobile Permission Naming Consistency

To ensure that permissions are consistently named and applied across both the backend and frontend applications, the following conventions should be followed:

1. **Permission Names**: All permission names should match between frontend and backend:
   - Backend model field: `can_manage_users` 
   - Frontend permission key: `can_manage_users`

2. **Standard Permission Keys**:
   - `can_manage_users`: Manage users and roles
   - `can_manage_billing`: Manage billing and payments
   - `can_manage_properties`: Manage property listings and details
   - `can_manage_tenants`: Manage tenant information and relationships
   - `can_view_reports`: View analytics and reports
   
3. **Extended Permissions**: The frontend also supports these permissions derived from role types:
   - `can_manage_roles`: For owner/admin to manage roles
   - `can_manage_system_settings`: For owner/admin to manage system settings
   - `can_view_dashboard`: For all non-guest users to access dashboard

4. **Permission Checks**: Use the `hasPermission()` function in the frontend to check if a user has a specific permission:

```javascript
// Example permission check in a React component
if (hasPermission('can_manage_users')) {
  // Show user management UI
} else {
  // Show access denied or hide the UI element
}
```

### Permission Mapping

This table shows how backend permissions are mapped to frontend permission keys:

| Backend Model Field | Frontend Permission Key |
|---------------------|------------------------|
| can_manage_users    | can_manage_users       |
| can_manage_billing  | can_manage_billing     |
| can_manage_properties | can_manage_properties |
| can_manage_tenants  | can_manage_tenants     |
| can_view_reports    | can_view_reports       |
| role_type == 'owner/admin' | can_manage_roles |
| role_type == 'owner/admin' | can_manage_system_settings |
| role_type != 'guest' | can_view_dashboard |

## Common Issues and Troubleshooting

### Permission Denied Errors

If users are receiving "Permission Denied" errors when they believe they should have access:

1. **Check the user's membership**: Verify that the user has an active membership in the organization
   ```sql
   SELECT * FROM organizations_organizationmembership 
   WHERE user_id = <user_id> AND organization_id = <organization_id>;
   ```

2. **Verify role assignments**: Check that the membership is associated with the correct role
   ```sql
   SELECT om.*, or.name, or.role_type 
   FROM organizations_organizationmembership om
   JOIN organizations_organizationrole or ON om.role_id = or.id
   WHERE om.user_id = <user_id> AND om.organization_id = <organization_id>;
   ```

3. **Check permission flags**: Make sure the role has the necessary permission flags set
   ```sql
   SELECT * FROM organizations_organizationrole 
   WHERE id = <role_id>;
   ```

4. **Debug permission checks**: Add logging to the permission classes to identify where checks are failing

### Role Type vs. Permission Flags

The system checks both the role type (`owner`, `admin`, etc.) and specific permission flags. This can cause confusion when:

1. A user has a role type of "admin" but specific permission flags are set to `False`
2. A user has a role type of "member" but specific permission flags are set to `True`

For clarity, follow these guidelines:
- The role type is a high-level category
- Permission flags provide fine-grained control
- Owner/admin role types should generally have all or most permissions set to `True`
- Member/guest role types should have limited permissions

## Conclusion

The RBAC system in HomeManager provides a flexible and powerful way to control access to resources and actions within organizations. By understanding how roles, memberships, and permissions interact, you can effectively manage access across the platform.
