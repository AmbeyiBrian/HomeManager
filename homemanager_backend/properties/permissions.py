from rest_framework import permissions


class IsPropertyManager(permissions.BasePermission):
    """
    Permission to check if user is a manager for the property.
    """

    def has_permission(self, request, view):
        # Allow all authenticated users at the view level
        # Filtering will be done in has_object_permission
        return request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # Check if user has manager role in the property's organization
        user = request.user
        
        # Superusers have all permissions
        if user.is_superuser:
            return True
            
        # Basic check - if user belongs to property's organization
        if hasattr(obj, 'organization') and user.organization == obj.organization:
            # For simplicity, assume all users in an organization can manage properties
            # This can be refined later when role systems are implemented
            return True
            
        # Staff users also have access
        return user.is_staff


class IsPropertyOwner(permissions.BasePermission):
    """
    Permission to check if user is the owner of the property.
    """

    def has_permission(self, request, view):
        # Allow all authenticated users at the view level
        return request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # Check if user is the owner of the property's organization
        user = request.user
        
        # Superusers have all permissions
        if user.is_superuser:
            return True
            
        # Check if user is property owner flag is set
        if user.is_property_owner:
            # If they're in the same organization as the property
            if hasattr(obj, 'organization') and user.organization == obj.organization:
                return True
        
        # Staff users also have access
        return user.is_staff
