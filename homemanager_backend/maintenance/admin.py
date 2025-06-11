from django.contrib import admin
from .models import ServiceProvider, Ticket, TicketComment

class TicketCommentInline(admin.TabularInline):
    """Inline admin for TicketComment model"""
    model = TicketComment
    extra = 1

@admin.register(ServiceProvider)
class ServiceProviderAdmin(admin.ModelAdmin):
    """Admin configuration for ServiceProvider model"""
    list_display = ('name', 'provider_type', 'owner', 'phone_number')
    list_filter = ('provider_type',)
    search_fields = ('name', 'phone_number', 'email', 'owner__username')

@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    """Admin configuration for Ticket model"""
    list_display = ('title', 'property', 'unit', 'tenant', 'status', 'priority', 'created_at')
    list_filter = ('status', 'priority', 'property', 'created_at')
    search_fields = ('title', 'description', 'property__name', 'unit__unit_number', 'tenant__name')
    inlines = [TicketCommentInline]
    readonly_fields = ('created_at', 'updated_at')

@admin.register(TicketComment)
class TicketCommentAdmin(admin.ModelAdmin):
    """Admin configuration for TicketComment model"""
    list_display = ('ticket', 'author_name', 'is_owner', 'created_at')
    list_filter = ('is_owner', 'created_at')
    search_fields = ('author_name', 'comment', 'ticket__title')
    readonly_fields = ('created_at',)
