from django.contrib import admin
from .models import SMSTemplate, SMSMessage, SMSProvider

@admin.register(SMSTemplate)
class SMSTemplateAdmin(admin.ModelAdmin):
    """Admin configuration for SMSTemplate model"""
    list_display = ('name', 'organization', 'created_at')
    list_filter = ('organization',)
    search_fields = ('name', 'template_text', 'organization__name')

@admin.register(SMSMessage)
class SMSMessageAdmin(admin.ModelAdmin):
    """Admin configuration for SMSMessage model"""
    list_display = ('phone_number', 'tenant', 'message_type', 'sent_at', 'status')
    list_filter = ('status', 'delivery_status', 'message_type')
    search_fields = ('phone_number', 'message_content', 'tenant__name')
    readonly_fields = ('sent_at', 'delivery_time')

@admin.register(SMSProvider)
class SMSProviderAdmin(admin.ModelAdmin):
    """Admin configuration for SMSProvider model"""
    list_display = ('provider_name', 'organization', 'sender_id', 'is_active')
    list_filter = ('is_active', 'organization')
    search_fields = ('provider_name', 'organization__name')
