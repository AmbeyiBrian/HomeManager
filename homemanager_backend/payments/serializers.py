from rest_framework import serializers
from .models import RentPayment, MpesaPayment

class MpesaPaymentSerializer(serializers.ModelSerializer):
    """Serializer for the MpesaPayment model"""
    property_name = serializers.CharField(source='property.name', read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    
    class Meta:
        model = MpesaPayment
        fields = ['id', 'rent_payment', 'property', 'property_name', 'organization', 
                 'organization_name', 'phone_number', 'amount', 'reference', 'description', 
                 'checkout_request_id', 'merchant_request_id', 'mpesa_receipt_number', 
                 'transaction_date', 'result_code', 'result_description',
                 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at', 'checkout_request_id',
                           'merchant_request_id', 'mpesa_receipt_number', 
                           'transaction_date', 'result_code', 'result_description']

class RentPaymentSerializer(serializers.ModelSerializer):
    """Serializer for the RentPayment model"""
    unit_number = serializers.CharField(source='unit.unit_number', read_only=True)
    tenant_name = serializers.CharField(source='tenant.name', read_only=True)
    tenant_phone = serializers.CharField(source='tenant.phone_number', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    property_name = serializers.SerializerMethodField()
    
    class Meta:
        model = RentPayment
        fields = ['id', 'unit', 'unit_number', 'property_name', 'tenant', 'tenant_name',
                 'tenant_phone', 'amount', 'due_date', 'payment_date', 'status',
                 'status_display', 'payment_method', 'payment_method_display',
                 'transaction_id', 'description', 'receipt_sent', 'late_fee_applied']
        read_only_fields = ['id', 'transaction_id']
    
    def get_property_name(self, obj):
        return obj.unit.property.name

class RentPaymentDetailSerializer(RentPaymentSerializer):
    """Detailed serializer for RentPayment including M-Pesa transactions"""
    mpesa_transactions = MpesaPaymentSerializer(many=True, read_only=True)
    
    class Meta(RentPaymentSerializer.Meta):
        fields = RentPaymentSerializer.Meta.fields + ['mpesa_transactions']
