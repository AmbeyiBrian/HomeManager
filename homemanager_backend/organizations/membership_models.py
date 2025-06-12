from django.db import models
from django.conf import settings
from django.utils import timezone
import uuid
from .models import OrganizationModel

class OrganizationRole(OrganizationModel):
    """
    Organization-specific role instances based on base roles.
    Each organization gets its own role instances that inherit from BaseRole templates.
    """
    base_role = models.ForeignKey(
        'organizations.BaseRole',
        on_delete=models.CASCADE,
        related_name='organization_roles'
    )
    
    # Keep existing fields for backward compatibility during migration
    # but they will be deprecated in favor of computed properties
    _legacy_can_manage_users = models.BooleanField(default=False, help_text="Legacy field - use computed property")
    _legacy_can_manage_billing = models.BooleanField(default=False, help_text="Legacy field - use computed property")    
    _legacy_can_manage_properties = models.BooleanField(default=False, help_text="Legacy field - use computed property")
    _legacy_can_manage_tenants = models.BooleanField(default=False, help_text="Legacy field - use computed property")
    _legacy_can_view_reports = models.BooleanField(default=False, help_text="Legacy field - use computed property")
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    @property
    def name(self):
        """Get role name from base role"""
        if self.base_role:
            return self.base_role.name
        # Fallback for migration period
        return "Legacy Role"
    
    @property
    def slug(self):
        """Get role slug from base role"""
        if self.base_role:
            return self.base_role.slug
        # Fallback for migration period
        return "legacy-role"
    
    @property
    def role_type(self):
        """Get role type from base role"""
        if self.base_role:
            return self.base_role.role_type
        # Fallback for migration period
        return "member"
    
    @property
    def description(self):
        """Get role description from base role"""
        if self.base_role:
            return self.base_role.description
        # Fallback for migration period
        return "Legacy role from previous system"
    
    @property
    def can_manage_users(self):
        """Get effective permission value (customization overrides base role default)"""
        return self.get_effective_permission('can_manage_users')
    
    @property
    def can_manage_billing(self):
        """Get effective permission value (customization overrides base role default)"""
        return self.get_effective_permission('can_manage_billing')
    
    @property
    def can_manage_properties(self):
        """Get effective permission value (customization overrides base role default)"""
        return self.get_effective_permission('can_manage_properties')
    
    @property
    def can_manage_tenants(self):
        """Get effective permission value (customization overrides base role default)"""
        return self.get_effective_permission('can_manage_tenants')
    
    @property
    def can_view_reports(self):
        """Get effective permission value (customization overrides base role default)"""
        return self.get_effective_permission('can_view_reports')
    
    @property
    def can_manage_roles(self):
        """Get effective permission value (customization overrides base role default)"""
        return self.get_effective_permission('can_manage_roles')
    
    @property
    def can_manage_system_settings(self):
        """Get effective permission value (customization overrides base role default)"""
        return self.get_effective_permission('can_manage_system_settings')
    
    @property
    def can_view_dashboard(self):
        """Get effective permission value (customization overrides base role default)"""
        return self.get_effective_permission('can_view_dashboard')
    
    @property
    def can_manage_tickets(self):
        """Get effective permission value (customization overrides base role default)"""
        return self.get_effective_permission('can_manage_tickets')
    
    @property
    def manage_notices(self):
        """Get effective permission value (customization overrides base role default)"""        
        return self.get_effective_permission('manage_notices')
    
    def get_effective_permission(self, permission_name):
        """
        Get effective permission value (customization overrides base role default)
        
        Args:
            permission_name: The name of the permission (e.g., 'can_manage_users')
        
        Returns:
            bool: The effective permission value
        """
        # During migration, if base_role is None, use legacy fields
        if not self.base_role:
            legacy_field = f'_legacy_{permission_name}'
            return getattr(self, legacy_field, False)
        
        try:
            from .models import OrganizationRoleCustomization
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
    
    def __str__(self):
        try:
            org_name = self.organization.name if self.organization else "No Organization"
        except:
            org_name = "No Organization"
            
        try:
            role_name = self.base_role.name if self.base_role else "Legacy Role"
        except:
            role_name = "Unknown Role"
            
        return f"{org_name} - {role_name}"
    
    class Meta:
        ordering = ['organization', 'base_role__name']
        unique_together = ('organization', 'base_role')  # Each organization can have only one instance of each base role
        verbose_name = "Organization Role"
        verbose_name_plural = "Organization Roles"


class OrganizationMembership(models.Model):
    """
    Represents a user's membership in an organization.
    This allows users to be members of a single organization with different roles.
    """
    # Unique ID for reference
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Relations
    organization = models.ForeignKey(
        'Organization',
        on_delete=models.CASCADE,
        related_name='memberships'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='organization_memberships'
    )
    role = models.ForeignKey(
        OrganizationRole,
        on_delete=models.PROTECT,
        related_name='memberships'
    )
    
    # Membership status
    is_active = models.BooleanField(default=True)
    
    # Invitation status
    is_invited = models.BooleanField(default=False)
    invitation_sent_at = models.DateTimeField(null=True, blank=True)
    invitation_accepted_at = models.DateTimeField(null=True, blank=True)
    invitation_token = models.UUIDField(default=uuid.uuid4, editable=False)
    
    # Dates
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('organization', 'user')
        ordering = ['organization', 'user']
    
    def __str__(self):
        return f"{self.user} - {self.organization} - {self.role}"
    
    def send_invitation(self):
        """
        Send an invitation email to the user.
        Mark the membership as invited.
        """
        # Set invitation fields
        self.is_invited = True
        self.invitation_sent_at = timezone.now()
        self.invitation_token = uuid.uuid4()
        self.save()
        
        # In a real implementation, we would send an email here
        # For now, just log the invitation
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Invitation sent to {self.user.email} for organization {self.organization.name}")
        
    def accept_invitation(self):
        """
        Mark the invitation as accepted.
        """
        self.is_invited = False
        self.invitation_accepted_at = timezone.now()
        self.is_active = True
        self.save()
