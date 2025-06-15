from django.db import models
import uuid
import os
from django.conf import settings
from organizations.models import Organization

def property_image_path(instance, filename):
    """Define upload path for property images"""
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    return os.path.join('property_images', filename)

class Property(models.Model):
    """Model representing a property (residential or commercial)"""
    PROPERTY_TYPES = [
        ('residential', 'Residential'),
        ('commercial', 'Commercial'),
        ('short_term', 'Short-Term Rental'),
    ]
    
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='properties')
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='properties', null=True, blank=True)
    name = models.CharField(max_length=200)
    address = models.TextField()
    property_type = models.CharField(max_length=20, choices=PROPERTY_TYPES)
    description = models.TextField(blank=True, null=True)
    image = models.ImageField(upload_to=property_image_path, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name

class PropertyImage(models.Model):
    """Model for property images"""
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to=property_image_path)
    description = models.CharField(max_length=200, blank=True, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Image for {self.property.name}"

class Unit(models.Model):
    """Model representing a unit within a property (apartment, room, office space)"""
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='units')
    unit_number = models.CharField(max_length=20)
    unit_type = models.CharField(max_length=50, blank=True, null=True, help_text="Type of unit (e.g., Studio, 1BR, 2BR)")
    floor = models.CharField(max_length=10, blank=True, null=True)
    size = models.DecimalField(max_digits=8, decimal_places=2, blank=True, null=True)
    bedrooms = models.PositiveSmallIntegerField(blank=True, null=True)
    bathrooms = models.DecimalField(max_digits=3, decimal_places=1, blank=True, null=True)
    monthly_rent = models.DecimalField(max_digits=10, decimal_places=2)
    security_deposit = models.DecimalField(max_digits=10, decimal_places=2, default=20000, 
                                          help_text="Default security deposit amount for this unit")
    is_occupied = models.BooleanField(default=False)
    description = models.TextField(blank=True, null=True)
    access_code = models.CharField(max_length=20, blank=True, null=True, unique=True, 
                                  help_text="Simple code for tenant web access")
    
    class Meta:
        unique_together = ('property', 'unit_number')
    
    def __str__(self):
        return f"{self.property.name} - Unit {self.unit_number}"

class QRCode(models.Model):
    """Model to manage QR codes for tenant access and payments"""
    unit = models.OneToOneField(Unit, on_delete=models.CASCADE, related_name='qr_code')
    code = models.CharField(max_length=50, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    last_accessed = models.DateTimeField(blank=True, null=True)
    access_count = models.PositiveIntegerField(default=0)
    payment_enabled = models.BooleanField(default=True)
    
    def save(self, *args, **kwargs):
        if not self.code:
            self.code = uuid.uuid4().hex[:10]
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"QR Code for {self.unit}"

class MpesaConfig(models.Model):
    """M-Pesa configuration for an organization"""
    organization = models.OneToOneField(Organization, on_delete=models.CASCADE, related_name='mpesa_config')
    is_active = models.BooleanField(default=True)
    is_sandbox = models.BooleanField(default=True, help_text="Use M-Pesa sandbox for testing")
    consumer_key = models.CharField(max_length=255, help_text="M-Pesa API consumer key")
    consumer_secret = models.CharField(max_length=255, help_text="M-Pesa API consumer secret")
    business_short_code = models.CharField(max_length=10, help_text="Paybill or Till number")
    passkey = models.CharField(max_length=255, help_text="M-Pesa API passkey")
    callback_url = models.URLField(null=True, blank=True, help_text="Optional custom callback URL")
    timeout_url = models.URLField(null=True, blank=True, help_text="Optional custom timeout URL")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "M-Pesa Configuration"
        verbose_name_plural = "M-Pesa Configurations"
    
    def __str__(self):
        return f"M-Pesa Config for {self.organization.name}"

class PropertyMpesaConfig(models.Model):
    """M-Pesa configuration for a specific property"""
    property = models.OneToOneField(Property, on_delete=models.CASCADE, related_name='mpesa_config')
    is_active = models.BooleanField(default=True)
    is_sandbox = models.BooleanField(default=True, help_text="Use M-Pesa sandbox for testing")
    consumer_key = models.CharField(max_length=255, help_text="M-Pesa API consumer key")
    consumer_secret = models.CharField(max_length=255, help_text="M-Pesa API consumer secret")
    business_short_code = models.CharField(max_length=10, help_text="Paybill or Till number")
    passkey = models.CharField(max_length=255, help_text="M-Pesa API passkey")
    callback_url = models.URLField(null=True, blank=True, help_text="Optional custom callback URL")
    timeout_url = models.URLField(null=True, blank=True, help_text="Optional custom timeout URL")
    use_organization_config = models.BooleanField(default=True, help_text="Use organization's M-Pesa config instead of this one")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Property M-Pesa Configuration"
        verbose_name_plural = "Property M-Pesa Configurations"
    def __str__(self):
        return f"M-Pesa Config for {self.property.name}"
        
    def get_effective_config(self):
        """Returns either this config or the organization config based on use_organization_config flag"""
        if self.use_organization_config and self.property.organization.mpesa_config:
            return self.property.organization.mpesa_config
        return self
