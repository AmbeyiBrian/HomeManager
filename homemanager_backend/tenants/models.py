from django.db import models
import os
import uuid
from django.conf import settings
from properties.models import Unit

def document_upload_path(instance, filename):
    """Define upload path for documents"""
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    return os.path.join('documents', filename)

class Tenant(models.Model):
    """Model representing a tenant (no login required)"""
    name = models.CharField(max_length=200)
    phone_number = models.CharField(max_length=15)  # Primary contact method, required
    email = models.EmailField(blank=True, null=True)  # Optional
    unit = models.ForeignKey(Unit, on_delete=models.CASCADE, related_name='tenants')
    move_in_date = models.DateField()
    move_out_date = models.DateField(blank=True, null=True)
    emergency_contact = models.CharField(max_length=200, blank=True, null=True)
    added_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name



class Lease(models.Model):
    """Model representing a lease agreement"""
    unit = models.ForeignKey(Unit, on_delete=models.CASCADE, related_name='leases')
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='leases')
    start_date = models.DateField()
    end_date = models.DateField()
    document = models.FileField(upload_to=document_upload_path, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    terms = models.TextField(blank=True, null=True)
    signed_at = models.DateTimeField(blank=True, null=True)
    
    def __str__(self):
        return f"Lease for {self.unit} - {self.tenant.name}"
