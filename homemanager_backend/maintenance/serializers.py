from rest_framework import serializers
from .models import ServiceProvider, Ticket, TicketComment

class ServiceProviderSerializer(serializers.ModelSerializer):
    """Serializer for the ServiceProvider model"""
    provider_type_display = serializers.CharField(source='get_provider_type_display', read_only=True)
    
    class Meta:
        model = ServiceProvider
        fields = ['id', 'owner', 'name', 'provider_type', 'provider_type_display', 'phone_number',
                 'email', 'address', 'notes', 'created_at']
        read_only_fields = ['id', 'created_at']

class TicketCommentSerializer(serializers.ModelSerializer):
    """Serializer for the TicketComment model"""
    class Meta:
        model = TicketComment
        fields = ['id', 'ticket', 'author_name', 'is_owner', 'comment', 'created_at']
        read_only_fields = ['id', 'created_at']

class TicketSerializer(serializers.ModelSerializer):
    """Serializer for the Ticket model"""
    property_name = serializers.CharField(source='property.name', read_only=True)
    unit_number = serializers.CharField(source='unit.unit_number', read_only=True)
    tenant_name = serializers.CharField(source='tenant.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    assigned_to_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Ticket
        fields = ['id', 'property', 'property_name', 'unit', 'unit_number', 
                 'tenant', 'tenant_name', 'title', 'description', 'status', 
                 'status_display', 'priority', 'priority_display', 'created_at', 
                 'updated_at', 'assigned_to', 'assigned_to_name', 'resolved_at', 
                 'satisfaction_rating']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return obj.assigned_to.name
        return None

class TicketDetailSerializer(TicketSerializer):
    """Detailed serializer for Ticket including comments"""
    comments = TicketCommentSerializer(many=True, read_only=True)
    
    class Meta(TicketSerializer.Meta):
        fields = TicketSerializer.Meta.fields + ['comments']
