from django.db import models
from organizations.models import OrganizationModel, Organization
from django.utils import timezone

class SMSTemplate(OrganizationModel):
    """Stores reusable message templates for different scenarios"""
    name = models.CharField(max_length=100)
    template_text = models.TextField()
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name


class SMSMessage(models.Model):
    """Records sent SMS messages for tracking and reporting"""
    tenant = models.ForeignKey(
        'tenants.Tenant',
        on_delete=models.CASCADE,
        related_name='sms_messages',
        null=True,
        blank=True
    )
    phone_number = models.CharField(max_length=15)
    message_content = models.TextField()
    message_type = models.CharField(max_length=50, blank=True, null=True)
    sent_at = models.DateTimeField(default=timezone.now)
    status = models.CharField(max_length=20, default='pending')
    delivery_status = models.CharField(max_length=20, blank=True, null=True)
    delivery_time = models.DateTimeField(blank=True, null=True)
    
    def __str__(self):
        return f"SMS to {self.phone_number} at {self.sent_at}"


class SMSProvider(models.Model):
    """Configures different SMS gateway providers"""
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='sms_providers'
    )
    provider_name = models.CharField(max_length=100)
    api_key = models.CharField(max_length=255)
    sender_id = models.CharField(max_length=20)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.provider_name} for {self.organization.name}"
