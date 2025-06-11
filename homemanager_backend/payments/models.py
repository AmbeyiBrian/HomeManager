from django.db import models
from django.utils import timezone
from properties.models import Unit
from tenants.models import Tenant

class RentPayment(models.Model):
    """Model representing a rent payment"""
    PAYMENT_STATUS = [
        ('pending', 'Pending'),
        ('initiated', 'Initiated'),  # When payment request has been sent
        ('processing', 'Processing'),  # When payment is being processed
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    PAYMENT_METHODS = [
        ('m_pesa', 'M-Pesa'),
        ('card', 'Credit/Debit Card'),
        ('bank', 'Bank Transfer'),
        ('cash', 'Cash'),
        ('other', 'Other'),
    ]
    
    unit = models.ForeignKey(Unit, on_delete=models.CASCADE, related_name='rent_payments')
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='rent_payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    due_date = models.DateField()
    payment_date = models.DateTimeField(blank=True, null=True)
    status = models.CharField(max_length=10, choices=PAYMENT_STATUS, default='pending')
    payment_method = models.CharField(max_length=10, choices=PAYMENT_METHODS, blank=True, null=True)
    transaction_id = models.CharField(max_length=100, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    receipt_sent = models.BooleanField(default=False)
    late_fee_applied = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    def __str__(self):
        return f"Rent payment for {self.unit} - {self.tenant.name} ({self.due_date})"
        
        
class MpesaPayment(models.Model):
    """Model representing an M-Pesa payment transaction"""
    rent_payment = models.ForeignKey(RentPayment, on_delete=models.CASCADE, related_name='mpesa_transactions')
    # Add property reference for property-specific payments
    property = models.ForeignKey('properties.Property', on_delete=models.CASCADE, 
                               related_name='mpesa_payments')
    organization = models.ForeignKey('organizations.Organization', on_delete=models.CASCADE, 
                                    related_name='mpesa_payments', null=True)
    phone_number = models.CharField(max_length=15)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    reference = models.CharField(max_length=100)  # Account reference
    description = models.CharField(max_length=255)
    checkout_request_id = models.CharField(max_length=100, blank=True, null=True)
    merchant_request_id = models.CharField(max_length=100, blank=True, null=True)
    mpesa_receipt_number = models.CharField(max_length=100, blank=True, null=True)
    transaction_date = models.DateTimeField(blank=True, null=True)
    result_code = models.CharField(max_length=5, blank=True, null=True)
    result_description = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"M-Pesa payment for {self.rent_payment}"
        
    def save(self, *args, **kwargs):
        if not self.property_id and self.rent_payment:
            # Auto-set the property from the rent payment's unit
            self.property = self.rent_payment.unit.property
            
        if not self.organization_id and self.property:
            # Auto-set the organization from the property
            self.organization = self.property.organization
            
        if self.mpesa_receipt_number and not self.transaction_date:
            self.transaction_date = timezone.now()
            # Update the related rent payment
            self.rent_payment.status = 'completed'
            self.rent_payment.payment_method = 'm_pesa'
            self.rent_payment.payment_date = self.transaction_date
            self.rent_payment.transaction_id = self.mpesa_receipt_number
            self.rent_payment.save()
            
        super().save(*args, **kwargs)
