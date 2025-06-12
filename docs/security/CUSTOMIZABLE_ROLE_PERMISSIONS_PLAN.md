# Customizable Role Permissions Implementation Plan

## Overview
This document outlines the backend changes needed to implement customizable permissions for predefined roles, where organizations can customize permissions for system-defined roles like Owner, Admin, Manager, etc.

## Current Architecture vs Proposed Architecture

### Current System
- Roles have fixed permissions defined in the Role model
- Permissions are boolean fields directly on the Role model
- All organizations share the same role definitions

### Proposed System
- **Base Roles**: System-defined role templates (Owner, Admin, Manager, Member, Guest)
- **Organization Role Customizations**: Per-organization permission overrides for base roles
- **Flexible Permissions**: Organizations can enable/disable specific permissions per role

## Database Schema Changes

### 1. New Model: `BaseRole` (System-defined role templates)
```python
class BaseRole(models.Model):
    """System-defined base roles that serve as templates"""
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(unique=True)
    description = models.TextField()
    role_type = models.CharField(max_length=20, choices=ROLE_TYPE_CHOICES)
    is_system_role = models.BooleanField(default=True)
    
    # Default permissions (can be overridden per organization)
    default_can_manage_users = models.BooleanField(default=False)
    default_can_manage_billing = models.BooleanField(default=False)
    default_can_manage_properties = models.BooleanField(default=False)
    default_can_manage_tenants = models.BooleanField(default=False)
    default_can_view_reports = models.BooleanField(default=False)
    default_can_manage_roles = models.BooleanField(default=False)
    default_can_manage_system_settings = models.BooleanField(default=False)
    default_can_view_dashboard = models.BooleanField(default=False)
    default_can_manage_tickets = models.BooleanField(default=False)
    default_manage_notices = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

### 2. New Model: `OrganizationRoleCustomization`
```python
class OrganizationRoleCustomization(models.Model):
    """Per-organization customizations for base roles"""
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    base_role = models.ForeignKey(BaseRole, on_delete=models.CASCADE)
    
    # Custom permissions (override base role defaults)
    can_manage_users = models.BooleanField(null=True, blank=True)
    can_manage_billing = models.BooleanField(null=True, blank=True)
    can_manage_properties = models.BooleanField(null=True, blank=True)
    can_manage_tenants = models.BooleanField(null=True, blank=True)
    can_view_reports = models.BooleanField(null=True, blank=True)
    can_manage_roles = models.BooleanField(null=True, blank=True)
    can_manage_system_settings = models.BooleanField(null=True, blank=True)
    can_view_dashboard = models.BooleanField(null=True, blank=True)
    can_manage_tickets = models.BooleanField(null=True, blank=True)
    manage_notices = models.BooleanField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['organization', 'base_role']
```

### 3. Update Existing `Role` Model
```python
class Role(models.Model):
    """Organization-specific role instances based on base roles"""
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    base_role = models.ForeignKey(BaseRole, on_delete=models.CASCADE)
    
    # Remove individual permission fields - use computed properties instead
    # Keep existing fields for backward compatibility during migration
    
    @property
    def can_manage_users(self):
        return self.get_effective_permission('can_manage_users')
    
    @property
    def can_manage_billing(self):
        return self.get_effective_permission('can_manage_billing')
    
    # ... other permission properties
    
    def get_effective_permission(self, permission_name):
        """Get effective permission value (customization overrides base role default)"""
        try:
            customization = OrganizationRoleCustomization.objects.get(
                organization=self.organization,
                base_role=self.base_role
            )
            # Check if there's a custom value for this permission
            custom_value = getattr(customization, permission_name, None)
            if custom_value is not None:
                return custom_value
        except OrganizationRoleCustomization.DoesNotExist:
            pass
        
        # Fall back to base role default
        default_field = f'default_{permission_name}'
        return getattr(self.base_role, default_field, False)
    
    @property
    def name(self):
        return self.base_role.name
    
    @property
    def description(self):
        return self.base_role.description
    
    @property
    def role_type(self):
        return self.base_role.role_type
```

## API Changes

### 1. New Endpoints

#### Get Organization Role Customizations
```
GET /api/organizations/role-customizations/
Response: List of customized roles for the organization
```

#### Update Role Permissions
```
PATCH /api/organizations/role-customizations/{base_role_id}/
Body: {
  "can_manage_users": true,
  "can_manage_billing": false,
  ...
}
```

#### Reset Role to Defaults
```
DELETE /api/organizations/role-customizations/{base_role_id}/
```

### 2. Updated Serializers

#### RoleSerializer (Updated)
```python
class RoleSerializer(serializers.ModelSerializer):
    # Include computed permission fields
    can_manage_users = serializers.BooleanField(read_only=True)
    can_manage_billing = serializers.BooleanField(read_only=True)
    # ... other permissions
    
    is_customized = serializers.SerializerMethodField()
    base_role_name = serializers.CharField(source='base_role.name', read_only=True)
    
    def get_is_customized(self, obj):
        return OrganizationRoleCustomization.objects.filter(
            organization=obj.organization,
            base_role=obj.base_role
        ).exists()
```

#### OrganizationRoleCustomizationSerializer
```python
class OrganizationRoleCustomizationSerializer(serializers.ModelSerializer):
    base_role_name = serializers.CharField(source='base_role.name', read_only=True)
    base_role_description = serializers.CharField(source='base_role.description', read_only=True)
    
    class Meta:
        model = OrganizationRoleCustomization
        fields = [
            'base_role', 'base_role_name', 'base_role_description',
            'can_manage_users', 'can_manage_billing', 'can_manage_properties',
            'can_manage_tenants', 'can_view_reports', 'can_manage_roles',
            'can_manage_system_settings', 'can_view_dashboard', 
            'can_manage_tickets', 'manage_notices'
        ]
```

## Migration Strategy

### Phase 1: Database Migration
1. Create `BaseRole` and `OrganizationRoleCustomization` models
2. Create base roles from existing unique role definitions
3. Create organization-specific Role instances linked to base roles
4. Preserve existing permission data during transition

### Phase 2: API Updates
1. Update role endpoints to return computed permissions
2. Add new customization endpoints
3. Update permission checking logic

### Phase 3: Frontend Updates
1. Update mobile app to use new "customize" interface
2. Update web frontend role management
3. Add reset to defaults functionality

## Data Seeding

### Create Base Roles
```python
# Management command: create_base_roles.py
base_roles = [
    {
        'name': 'Owner',
        'slug': 'owner',
        'description': 'Organization owner with full access',
        'role_type': 'owner',
        'default_can_manage_users': True,
        'default_can_manage_billing': True,
        'default_can_manage_properties': True,
        'default_can_manage_tenants': True,
        'default_can_view_reports': True,
        'default_can_manage_roles': True,
        'default_can_manage_system_settings': True,
        'default_can_view_dashboard': True,
        'default_can_manage_tickets': True,
        'default_manage_notices': True,
    },
    {
        'name': 'Administrator',
        'slug': 'admin',
        'description': 'Full administrative access except billing',
        'role_type': 'admin',
        'default_can_manage_users': True,
        'default_can_manage_billing': False,
        'default_can_manage_properties': True,
        'default_can_manage_tenants': True,
        'default_can_view_reports': True,
        'default_can_manage_roles': True,
        'default_can_manage_system_settings': False,
        'default_can_view_dashboard': True,
        'default_can_manage_tickets': True,
        'default_manage_notices': True,
    },
    # ... other roles
]
```

## Benefits of This Approach

1. **Flexibility**: Organizations can customize role permissions to fit their needs
2. **Consistency**: Base roles provide standardized starting points
3. **Scalability**: Easy to add new permissions or base roles
4. **Backward Compatibility**: Existing permission checking logic continues to work
5. **Auditability**: Clear separation between base definitions and customizations
6. **Multi-tenant Security**: Each organization's customizations are isolated

## Implementation Considerations

1. **Performance**: Add database indexes on foreign keys and commonly queried fields
2. **Caching**: Implement caching for role permissions to avoid repeated database queries
3. **Validation**: Ensure certain critical permissions can't be removed from owner roles
4. **UI/UX**: Clearly indicate which permissions are customized vs defaults
5. **Documentation**: Update API documentation and user guides

## Testing Strategy

1. **Unit Tests**: Test permission computation logic
2. **Integration Tests**: Test API endpoints for role customization
3. **Migration Tests**: Ensure data integrity during migration
4. **Performance Tests**: Verify permission checking performance
5. **User Acceptance Tests**: Validate UI workflows for role customization

This approach provides the flexibility you mentioned while maintaining system integrity and backward compatibility.
