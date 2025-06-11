from rest_framework import serializers
from .models import SMSTemplate, SMSMessage, SMSProvider

class SMSTemplateSerializer(serializers.ModelSerializer):
    """Serializer for the SMSTemplate model"""
    class Meta:
        model = SMSTemplate
        fields = ['id', 'organization', 'name', 'template_text', 'description', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

class SMSMessageSerializer(serializers.ModelSerializer):
    """Serializer for the SMSMessage model"""
    tenant_name = serializers.SerializerMethodField()
    
    class Meta:
        model = SMSMessage
        fields = ['id', 'tenant', 'tenant_name', 'phone_number', 'message_content', 
                 'message_type', 'sent_at', 'status', 'delivery_status', 'delivery_time']
        read_only_fields = ['id', 'sent_at']
    
    def get_tenant_name(self, obj):
        if obj.tenant:
            return obj.tenant.name
        return None

class SMSProviderSerializer(serializers.ModelSerializer):
    """Serializer for the SMSProvider model"""
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    
    class Meta:
        model = SMSProvider
        fields = ['id', 'organization', 'organization_name', 'provider_name', 
                 'api_key', 'sender_id', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']
        extra_kwargs = {
            'api_key': {'write_only': True},
        }
