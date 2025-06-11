from django.contrib import admin
from .models import Tenant, Lease

class LeaseInline(admin.TabularInline):
    """Inline admin for Lease model"""
    model = Lease
    extra = 1

@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    """Admin configuration for Tenant model"""
    list_display = ('name', 'phone_number', 'unit', 'move_in_date', 'move_out_date')
    list_filter = ('unit__property', 'move_in_date')
    search_fields = ('name', 'phone_number', 'email', 'unit__unit_number', 'unit__property__name')
    inlines = [LeaseInline]

@admin.register(Lease)
class LeaseAdmin(admin.ModelAdmin):
    """Admin configuration for Lease model"""
    list_display = ('unit', 'tenant', 'start_date', 'end_date', 'is_active')
    list_filter = ('is_active', 'start_date', 'end_date')
    search_fields = ('unit__unit_number', 'tenant__name', 'unit__property__name')
