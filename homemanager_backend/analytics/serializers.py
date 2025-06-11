from rest_framework import serializers
from .models import Dashboard, Report, PropertyMetric, PaymentAnalytics, SMSAnalytics

class DashboardSerializer(serializers.ModelSerializer):
    """Serializer for the Dashboard model"""
    owner_name = serializers.SerializerMethodField()
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    
    class Meta:
        model = Dashboard
        fields = ['id', 'owner', 'owner_name', 'organization', 'organization_name', 
                 'name', 'description', 'layout_config', 'is_default', 
                 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_owner_name(self, obj):
        return f"{obj.owner.first_name} {obj.owner.last_name}".strip() or obj.owner.username

class ReportSerializer(serializers.ModelSerializer):
    """Serializer for the Report model"""
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    report_type_display = serializers.CharField(source='get_report_type_display', read_only=True)
    format_display = serializers.CharField(source='get_format_display', read_only=True)
    
    class Meta:
        model = Report
        fields = ['id', 'organization', 'organization_name', 'name', 'description', 
                 'report_type', 'report_type_display', 'parameters', 'format', 
                 'format_display', 'created_at']
        read_only_fields = ['id', 'created_at']

class PropertyMetricSerializer(serializers.ModelSerializer):
    """Serializer for the PropertyMetric model"""
    property_name = serializers.CharField(source='property.name', read_only=True)
    net_income = serializers.SerializerMethodField()
    
    class Meta:
        model = PropertyMetric
        fields = ['id', 'property', 'property_name', 'period_start', 'period_end', 
                 'occupancy_rate', 'revenue', 'expenses', 'net_income', 'maintenance_count']
        read_only_fields = ['id']
    
    def get_net_income(self, obj):
        return obj.revenue - obj.expenses

class PaymentAnalyticsSerializer(serializers.ModelSerializer):
    """Serializer for the PaymentAnalytics model"""
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    
    class Meta:
        model = PaymentAnalytics
        fields = ['id', 'organization', 'organization_name', 'period', 
                 'total_collected', 'on_time_percentage', 'payment_method_breakdown', 
                 'average_days_late']
        read_only_fields = ['id']

class SMSAnalyticsSerializer(serializers.ModelSerializer):
    """Serializer for the SMSAnalytics model"""
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    
    class Meta:
        model = SMSAnalytics
        fields = ['id', 'organization', 'organization_name', 'period', 
                 'sms_count', 'delivery_rate', 'tenant_response_rate', 'cost']
        read_only_fields = ['id']
