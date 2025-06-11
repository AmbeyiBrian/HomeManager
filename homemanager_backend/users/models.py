from django.db import models
from django.contrib.auth.models import AbstractUser
from django.contrib.contenttypes.models import ContentType

class User(AbstractUser):
    """Custom user model for property owners and managers"""
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    is_property_owner = models.BooleanField(default=True)
    is_tenant = models.BooleanField(default=False)    
    organization = models.ForeignKey(
        'organizations.Organization', 
        on_delete=models.SET_NULL, 
        related_name='users',
        null=True,
        blank=True
    )
    
    def __str__(self):
        return self.username
        
    def get_organization(self):
        """Get the user's organization"""
        return self.organization
        
    def get_organizations(self):
        """
        Get all organizations that the user belongs to
        This method is maintained for backward compatibility
        but now returns a list with only the user's organization
        """
        from organizations.models import Organization
        if self.organization:
            return [self.organization]
        return []
