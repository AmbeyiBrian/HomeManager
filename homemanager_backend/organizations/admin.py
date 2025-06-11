from django.contrib import admin
from .models import Organization, SubscriptionPlan, Subscription, SubscriptionPayment
from .membership_models import OrganizationRole, OrganizationMembership

@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    """Admin configuration for Organization model"""
    list_display = ('name', 'slug', 'primary_owner', 'subscription_status', 'trial_enabled')
    list_filter = ('subscription_status', 'trial_enabled')
    search_fields = ('name', 'slug', 'primary_owner__username')
    prepopulated_fields = {'slug': ('name',)}

@admin.register(OrganizationRole)
class OrganizationRoleAdmin(admin.ModelAdmin):
    """Admin configuration for OrganizationRole model"""
    list_display = ('name', 'slug', 'role_type')
    list_filter = ('role_type', 'can_manage_users', 'can_manage_billing')
    search_fields = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}

@admin.register(OrganizationMembership)
class OrganizationMembershipAdmin(admin.ModelAdmin):
    """Admin configuration for OrganizationMembership model"""
    list_display = ('user', 'organization', 'role', 'is_active', 'is_invited')
    list_filter = ('is_active', 'is_invited', 'role')
    search_fields = ('user__username', 'organization__name')

@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    """Admin configuration for SubscriptionPlan model"""
    list_display = ('name', 'slug', 'price_monthly', 'price_yearly', 'max_properties', 'max_units', 'is_active')
    list_filter = ('is_active', 'is_public', 'has_tenant_portal', 'has_payment_processing')
    search_fields = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}

@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    """Admin configuration for Subscription model"""
    list_display = ('organization', 'plan', 'status', 'billing_period', 'start_date', 'end_date')
    list_filter = ('status', 'billing_period')
    search_fields = ('organization__name',)

@admin.register(SubscriptionPayment)
class SubscriptionPaymentAdmin(admin.ModelAdmin):
    """Admin configuration for SubscriptionPayment model"""
    list_display = ('subscription', 'amount', 'currency', 'status', 'payment_method', 'payment_date')
    list_filter = ('status', 'payment_method', 'currency')
    search_fields = ('subscription__organization__name', 'transaction_id')
