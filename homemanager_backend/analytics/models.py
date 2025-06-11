from django.db import models
from django.conf import settings
from django.utils import timezone
from organizations.models import Organization, OrganizationModel
from properties.models import Property
import json

class Dashboard(models.Model):
    """Configures custom analytics dashboards for users"""
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='dashboards'
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='dashboards'
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    layout_config = models.JSONField(default=dict)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.name} - {self.organization.name}"

class Report(models.Model):
    """Defines scheduled and on-demand reports"""
    REPORT_TYPES = [
        ('occupancy', 'Occupancy Report'),
        ('financials', 'Financial Report'),
        ('rent_collection', 'Rent Collection Report'),
        ('maintenance', 'Maintenance Report'),
        ('tenant', 'Tenant Report'),
        ('custom', 'Custom Report'),
    ]
    
    FORMAT_CHOICES = [
        ('pdf', 'PDF'),
        ('csv', 'CSV'),
        ('excel', 'Excel'),
        ('web', 'Web View Only'),
    ]
    
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='reports'
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    report_type = models.CharField(max_length=20, choices=REPORT_TYPES)
    parameters = models.JSONField(default=dict)
    format = models.CharField(max_length=10, choices=FORMAT_CHOICES, default='pdf')
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.name} - {self.get_report_type_display()}"

class PropertyMetric(models.Model):
    """Tracks key performance indicators for properties"""
    property = models.ForeignKey(
        Property,
        on_delete=models.CASCADE,
        related_name='metrics'
    )
    period_start = models.DateField()
    period_end = models.DateField()
    occupancy_rate = models.DecimalField(max_digits=5, decimal_places=2)
    revenue = models.DecimalField(max_digits=12, decimal_places=2)
    expenses = models.DecimalField(max_digits=12, decimal_places=2)
    maintenance_count = models.PositiveIntegerField(default=0)
    
    class Meta:
        unique_together = ('property', 'period_start', 'period_end')
    
    def __str__(self):
        return f"{self.property.name} metrics ({self.period_start} to {self.period_end})"

class PaymentAnalytics(OrganizationModel):
    """Aggregates payment data for trend analysis"""
    period = models.CharField(max_length=20)  # e.g., '2023-06' for June 2023
    total_collected = models.DecimalField(max_digits=12, decimal_places=2)
    on_time_percentage = models.DecimalField(max_digits=5, decimal_places=2)
    payment_method_breakdown = models.JSONField(default=dict)
    average_days_late = models.DecimalField(max_digits=5, decimal_places=2)
    
    class Meta:
        unique_together = ('organization', 'period')
    
    def __str__(self):
        return f"Payment analytics for {self.organization.name} - {self.period}"

class SMSAnalytics(OrganizationModel):
    """Monitors SMS communication metrics"""
    period = models.CharField(max_length=20)  # e.g., '2023-06' for June 2023
    sms_count = models.PositiveIntegerField(default=0)
    delivery_rate = models.DecimalField(max_digits=5, decimal_places=2)
    tenant_response_rate = models.DecimalField(max_digits=5, decimal_places=2)
    cost = models.DecimalField(max_digits=8, decimal_places=2)
    
    class Meta:
        unique_together = ('organization', 'period')
    
    def __str__(self):
        return f"SMS analytics for {self.organization.name} - {self.period}"
