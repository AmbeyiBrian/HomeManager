from django.db import models
from django.conf import settings
from django.utils import timezone
import uuid
from .models import OrganizationModel

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
    slug = models.SlugField(unique=False)  # Changed from unique=True to allow same slug across different orgs
    role_type = models.CharField(max_length=20, choices=ROLE_TYPES)
    description = models.TextField(blank=True, null=True)
    
    # Permissions for this role
    can_manage_users = models.BooleanField(default=False)
    can_manage_billing = models.BooleanField(default=False)
    can_manage_properties = models.BooleanField(default=False)
    can_manage_tenants = models.BooleanField(default=False)
    can_view_reports = models.BooleanField(default=False)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name
    
    class Meta:
        ordering = ['name']
        unique_together = ('organization', 'slug')  # Ensure role slugs are unique per organization


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
