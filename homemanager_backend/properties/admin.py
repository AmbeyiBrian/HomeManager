from django.contrib import admin
from .models import Property, PropertyImage, Unit, QRCode, MpesaConfig, PropertyMpesaConfig

@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    """Admin configuration for Property model"""
    list_display = ('name', 'owner', 'organization', 'property_type', 'address')
    list_filter = ('property_type', 'organization')
    search_fields = ('name', 'address', 'owner__username', 'organization__name')

class PropertyImageInline(admin.TabularInline):
    """Inline admin for PropertyImage model"""
    model = PropertyImage
    extra = 1

class UnitInline(admin.TabularInline):
    """Inline admin for Unit model"""
    model = Unit
    extra = 1

@admin.register(Unit)
class UnitAdmin(admin.ModelAdmin):
    """Admin configuration for Unit model"""
    list_display = ('unit_number', 'property', 'bedrooms', 'bathrooms', 'monthly_rent', 'is_occupied')
    list_filter = ('is_occupied', 'property__property_type', 'property')
    search_fields = ('unit_number', 'property__name')

@admin.register(QRCode)
class QRCodeAdmin(admin.ModelAdmin):
    """Admin configuration for QRCode model"""
    list_display = ('unit', 'code', 'is_active', 'last_accessed', 'access_count')
    list_filter = ('is_active', 'payment_enabled')
    search_fields = ('code', 'unit__unit_number', 'unit__property__name')
    readonly_fields = ('code', 'created_at', 'last_accessed', 'access_count')

@admin.register(MpesaConfig)
class MpesaConfigAdmin(admin.ModelAdmin):
    """Admin configuration for MpesaConfig model"""
    list_display = ('organization', 'is_active', 'is_sandbox', 'business_short_code')
    list_filter = ('is_active', 'is_sandbox')
    search_fields = ('organization__name', 'business_short_code')

@admin.register(PropertyMpesaConfig)
class PropertyMpesaConfigAdmin(admin.ModelAdmin):
    """Admin configuration for PropertyMpesaConfig model"""
    list_display = ('property', 'is_active', 'is_sandbox', 'business_short_code', 'use_organization_config')
    list_filter = ('is_active', 'is_sandbox', 'use_organization_config')
    search_fields = ('property__name', 'business_short_code')
    
    fieldsets = (
        ('Property Information', {
            'fields': ('property', 'use_organization_config')
        }),
        ('Status', {
            'fields': ('is_active', 'is_sandbox')
        }),
        ('M-Pesa API Credentials', {
            'fields': ('consumer_key', 'consumer_secret', 'business_short_code', 'passkey'),
            'classes': ('collapse',),
            'description': 'These credentials are used to authenticate with the M-Pesa API'
        }),
        ('Callback URLs', {
            'fields': ('callback_url', 'timeout_url'),
            'classes': ('collapse',),
            'description': 'Optional custom URLs for M-Pesa callbacks'
        }),
    )

# Add the inlines to the PropertyAdmin
PropertyAdmin.inlines = [PropertyImageInline, UnitInline]
