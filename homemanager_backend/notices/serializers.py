from rest_framework import serializers
from .models import Notice, NoticeView

class NoticeViewSerializer(serializers.ModelSerializer):
    """Serializer for the NoticeView model"""
    tenant_name = serializers.CharField(source='tenant.name', read_only=True)
    
    class Meta:
        model = NoticeView
        fields = ['id', 'notice', 'tenant', 'tenant_name', 'viewed_at']
        read_only_fields = ['id', 'viewed_at']

class NoticeSerializer(serializers.ModelSerializer):
    """Serializer for the Notice model"""
    property_name = serializers.CharField(source='property.name', read_only=True)
    notice_type_display = serializers.CharField(source='get_notice_type_display', read_only=True)
    view_count = serializers.SerializerMethodField()
    creator_name = serializers.SerializerMethodField()
    property_id = serializers.IntegerField(write_only=True, required=False)
    
    class Meta:
        model = Notice
        fields = ['id', 'property', 'property_id', 'property_name', 'creator', 'creator_name', 
                 'title', 'content', 'notice_type', 'notice_type_display', 'created_at', 
                 'start_date', 'end_date', 'is_important', 'is_archived', 'send_sms', 'view_count']
        read_only_fields = ['id', 'created_at', 'view_count', 'creator', 'creator_name']
    
    def get_creator_name(self, obj):
        if obj.creator:
            return f"{obj.creator.first_name} {obj.creator.last_name}".strip() or obj.creator.username
        return "Unknown"
    
    def get_view_count(self, obj):
        return obj.views.count()
    
    def validate(self, data):
        """
        Handle both property and property_id fields.
        """
        property_id = data.pop('property_id', None)
        if property_id and 'property' not in data:
            from properties.models import Property
            try:
                data['property'] = Property.objects.get(id=property_id)
            except Property.DoesNotExist:
                raise serializers.ValidationError({"property_id": "Property not found"})
                
        return data

class NoticeDetailSerializer(NoticeSerializer):
    """Detailed serializer for Notice including views"""
    views = NoticeViewSerializer(many=True, read_only=True)
    
    class Meta(NoticeSerializer.Meta):
        fields = NoticeSerializer.Meta.fields + ['views']
