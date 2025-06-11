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
    
    class Meta:
        model = Notice
        fields = ['id', 'property', 'property_name', 'title', 'content', 'notice_type',
                 'notice_type_display', 'created_at', 'start_date', 'end_date',
                 'is_important', 'is_archived', 'send_sms', 'view_count']
        read_only_fields = ['id', 'created_at', 'view_count']
    
    def get_view_count(self, obj):
        return obj.views.count()

class NoticeDetailSerializer(NoticeSerializer):
    """Detailed serializer for Notice including views"""
    views = NoticeViewSerializer(many=True, read_only=True)
    
    class Meta(NoticeSerializer.Meta):
        fields = NoticeSerializer.Meta.fields + ['views']
