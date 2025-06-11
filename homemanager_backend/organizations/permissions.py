from rest_framework import permissions
import logging

logger = logging.getLogger(__name__)

class IsOrganizationOwnerOrAdmin(permissions.BasePermission):
    """
    Custom permission to only allow organization owners or admins to access/modify data.
    """
    def has_permission(self, request, view):
        # Check if user is authenticated
        if not request.user.is_authenticated:
            logger.info(f"Permission check failed: User not authenticated")
            return False
        
        # Staff/Superusers always have permission
        if request.user.is_superuser or request.user.is_staff:
            logger.info(f"Permission granted: User {request.user.username} is staff/superuser")
            return True
        
        # For non-staff users, check for organization-level permissions
        user = request.user
        
        # First, check if user has an organization
        logger.info(f"User: {user.username}, Has organization attr: {hasattr(user, 'organization')}")
        if not hasattr(user, 'organization') or not user.organization:
            logger.info(f"Permission check failed: User {user.username} has no organization")
            
            # Instead of denying immediately, let's try to find memberships 
            # without using user.organization
            from .membership_models import OrganizationMembership
            from .models import Organization
            
            # Try to find any memberships for this user first
            all_memberships = OrganizationMembership.objects.filter(
                user=user,
                is_active=True
            )
            
            logger.info(f"Found {all_memberships.count()} total memberships for user")
            
            # If we find memberships, use the first one's organization
            if all_memberships.exists():
                user_org = all_memberships.first().organization
                logger.info(f"Found organization from membership: {user_org.name}")
                
                # Check if user is the primary_owner of this organization
                if user_org.primary_owner == user:
                    logger.info(f"Permission granted: User {user.username} is primary owner of {user_org.name}")
                    return True
                
                # Check if any of the memberships have admin/owner role
                for membership in all_memberships:
                    if not membership.role:
                        continue
                        
                    logger.info(f"Checking role: {membership.role.name}, type: {membership.role.role_type}")
                    
                    # Direct check for owner or admin role types
                    if membership.role.role_type in ['owner', 'admin']:
                        logger.info(f"Permission granted: User {user.username} has owner/admin role")
                        return True
                        
                    # Check for specific permission to manage users
                    if membership.role.can_manage_users:
                        logger.info(f"Permission granted: User has can_manage_users permission")
                        return True
            
            return False
        
        # Check if user is the primary_owner of the organization
        if hasattr(user.organization, 'primary_owner') and user.organization.primary_owner == user:
            logger.info(f"Permission granted: User {user.username} is primary owner")
            return True
        
        # Check if the user has a membership with owner/admin role
        from .membership_models import OrganizationMembership
        
        # Get all memberships for this user in their organization
        memberships = OrganizationMembership.objects.filter(
            user=user,
            organization=user.organization,
            is_active=True
        )
        
        # Log for debugging
        logger.info(f"User: {user.username}, Organization: {user.organization.name if user.organization else 'None'}")
        logger.info(f"Memberships count: {memberships.count()}")
        for m in memberships:
            logger.info(f"Membership: {m}, Role: {m.role.name if m.role else 'None'}, Type: {m.role.role_type if m.role else 'None'}")
        
        # Check each membership
        for membership in memberships:
            # Check if role is owner or admin
            if not membership.role:
                continue
                
            logger.info(f"Checking role: {membership.role.name}, type: {membership.role.role_type}")
            # Direct check for owner or admin role types
            if membership.role.role_type in ['owner', 'admin']:
                logger.info(f"Permission granted: User {user.username} has owner/admin role: {membership.role.name}")
                return True
                
            # Check for specific permission to manage users (which includes roles)
            if membership.role.can_manage_users:
                logger.info(f"Permission granted: User {user.username} has can_manage_users permission")
                return True
        
        # Default deny
        logger.info(f"Permission denied for user: {user.username}")
        return False

    def has_object_permission(self, request, view, obj):
        # Check if user is authenticated
        if not request.user.is_authenticated:
            logger.info(f"Object permission check failed: User not authenticated")
            return False
            
        # Staff/Superusers always have permission
        if request.user.is_superuser or request.user.is_staff:
            logger.info(f"Object permission granted: User {request.user.username} is staff/superuser")
            return True
            
        # For non-staff users, check for organization-level permissions
        user = request.user
        
        # Get information about the object
        obj_type = obj.__class__.__name__
        obj_id = getattr(obj, 'id', 'unknown')
        logger.info(f"Checking object permission for {obj_type} (id: {obj_id})")
        
        # Allow if the user is organization's primary owner
        if hasattr(obj, 'organization') and obj.organization and obj.organization.primary_owner == user:
            logger.info(f"Object permission granted: User {user.username} is primary owner of the object's organization")
            return True
            
        # Check if the object belongs to the user's organization
        if hasattr(obj, 'organization') and hasattr(user, 'organization') and user.organization:
            if user.organization != obj.organization:
                logger.info(f"Object permission denied: Object's org ({obj.organization.id}) doesn't match user's org ({user.organization.id})")
                return False
            
        # For organizations, check if user is primary_owner
        if obj_type == 'Organization' and obj.primary_owner == user:
            logger.info(f"Object permission granted: User {user.username} is primary owner of organization {obj.name}")
            return True
            
        # Check if the user has a membership with owner/admin role in the organization
        from .membership_models import OrganizationMembership
        
        # Get the relevant organization for permission check
        organization = None
        if hasattr(obj, 'organization') and obj.organization:
            organization = obj.organization
        elif obj_type == 'Organization':
            organization = obj
        
        if not organization:
            logger.info(f"Object permission denied: Cannot determine organization for object")
            return False
            
        # Get all memberships for this user in the relevant organization
        memberships = OrganizationMembership.objects.filter(
            user=user,
            organization=organization,
            is_active=True
        )
        
        logger.info(f"Found {memberships.count()} memberships for user in organization {organization.name}")
        
        for membership in memberships:
            # Check if role is owner or admin
            if not membership.role:
                continue
                
            logger.info(f"Checking role: {membership.role.name}, type: {membership.role.role_type}")
            
            if membership.role.role_type in ['owner', 'admin']:
                logger.info(f"Object permission granted: User {user.username} has owner/admin role")
                return True
                
            # Check for specific permission to manage roles
            if membership.role.can_manage_users:  # Assuming managing users includes managing roles
                logger.info(f"Object permission granted: User {user.username} has can_manage_users permission")
                return True
        
        # Default deny
        logger.info(f"Object permission denied for user: {user.username}")
        return False
