from django.db import models
from django.conf import settings
from properties.models import Property, Unit
from tenants.models import Tenant

class ServiceProvider(models.Model):
    """Model representing a service provider (plumber, electrician, etc.)"""
    PROVIDER_TYPES = [
        ('plumber', 'Plumber'),
        ('electrician', 'Electrician'),
        ('carpenter', 'Carpenter'),
        ('cleaner', 'Cleaner'),
        ('painter', 'Painter'),
        ('general', 'General Maintenance'),
        ('other', 'Other'),
    ]
    
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='service_providers')
    organization = models.ForeignKey(
        'organizations.Organization', 
        on_delete=models.CASCADE,
        related_name='service_providers',
        null=True,
        blank=True
    )
    name = models.CharField(max_length=200)
    provider_type = models.CharField(max_length=20, choices=PROVIDER_TYPES)
    phone_number = models.CharField(max_length=15)
    email = models.EmailField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.name} ({self.get_provider_type_display()})"

class Ticket(models.Model):
    """Model representing a maintenance ticket or issue logged by a tenant"""
    STATUS_CHOICES = [
        ('new', 'New'),
        ('assigned', 'Assigned'),
        ('in_progress', 'In Progress'),
        ('on_hold', 'On Hold'),
        ('resolved', 'Resolved'),
        ('closed', 'Closed'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='tickets')
    unit = models.ForeignKey(Unit, on_delete=models.CASCADE, related_name='tickets')
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='tickets')
    title = models.CharField(max_length=200)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    assigned_to = models.ForeignKey(ServiceProvider, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tickets')
    resolved_at = models.DateTimeField(blank=True, null=True)
    satisfaction_rating = models.PositiveSmallIntegerField(blank=True, null=True)
    
    def __str__(self):
        return f"{self.title} - {self.unit}"

class TicketComment(models.Model):
    """Model representing comments/updates on a ticket"""
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='comments')
    author_name = models.CharField(max_length=200)
    is_owner = models.BooleanField(default=False)  # To distinguish between tenant and owner comments
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Comment on {self.ticket.title} by {self.author_name}"
