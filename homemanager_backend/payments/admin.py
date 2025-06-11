from django.contrib import admin
from .models import RentPayment, MpesaPayment

@admin.register(RentPayment)
class RentPaymentAdmin(admin.ModelAdmin):
    list_display = ('tenant', 'unit', 'amount', 'due_date', 'payment_date', 'status', 'payment_method')
    list_filter = ('status', 'payment_method', 'due_date', 'receipt_sent')
    search_fields = ('tenant__name', 'unit__unit_number', 'transaction_id')
    date_hierarchy = 'due_date'
    readonly_fields = ('transaction_id',)
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('tenant', 'unit', 'amount', 'due_date')
        }),
        ('Payment Details', {
            'fields': ('payment_date', 'status', 'payment_method', 'transaction_id')
        }),
        ('Additional Information', {
            'fields': ('description', 'receipt_sent', 'late_fee_applied')
        }),
    )


@admin.register(MpesaPayment)
class MpesaPaymentAdmin(admin.ModelAdmin):
    list_display = ('rent_payment', 'phone_number', 'amount', 'mpesa_receipt_number', 'transaction_date', 'result_code')
    list_filter = ('result_code', 'created_at', 'organization')
    search_fields = ('phone_number', 'mpesa_receipt_number', 'checkout_request_id', 'reference')
    date_hierarchy = 'created_at'
    readonly_fields = ('checkout_request_id', 'merchant_request_id', 'mpesa_receipt_number', 'transaction_date', 
                      'result_code', 'result_description', 'created_at', 'updated_at')
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('rent_payment', 'organization', 'phone_number', 'amount')
        }),
        ('Transaction Details', {
            'fields': ('reference', 'description', 'checkout_request_id', 'merchant_request_id')
        }),
        ('M-Pesa Response', {
            'fields': ('mpesa_receipt_number', 'transaction_date', 'result_code', 'result_description')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
