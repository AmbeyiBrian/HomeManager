from django.db import models
from properties.models import Property
from tenants.models import Tenant

class Notice(models.Model):
    """Model representing notices posted by the property owner"""
    NOTICE_TYPE_CHOICES = [
        ('general', 'General Announcement'),
        ('rent', 'Rent & Payments'),
        ('maintenance', 'Maintenance & Repairs'),
        ('inspection', 'Inspection & Access'),
        ('eviction', 'Eviction & Legal'),
        ('amenities', 'Amenities & Facilities'),
        ('policy', 'Policy & Rules Update'),
        ('event', 'Community Event'),
        ('emergency', 'Emergency Alert'),
        ('utility', 'Utility & Service'),
    ]
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='notices')
    title = models.CharField(max_length=200)
    content = models.TextField()
    notice_type = models.CharField(max_length=20, choices=NOTICE_TYPE_CHOICES, default='general')
    created_at = models.DateTimeField(auto_now_add=True)
    start_date = models.DateField()
    end_date = models.DateField(blank=True, null=True)
    is_important = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False)
    send_sms = models.BooleanField(default=False)  # New field for SMS functionality
    
    def __str__(self):
        return self.title

class NoticeView(models.Model):
    """Model to track which tenants have viewed a notice"""
    notice = models.ForeignKey(Notice, on_delete=models.CASCADE, related_name='views')
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='viewed_notices')
    viewed_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('notice', 'tenant')
    
    def __str__(self):
        return f"{self.tenant.name} viewed {self.notice.title}"
