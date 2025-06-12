from django.contrib import admin
from .models import Organization, SubscriptionPlan, Subscription, SubscriptionPayment, BaseRole, OrganizationRoleCustomization
from .membership_models import OrganizationRole, OrganizationMembership

@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    """Admin configuration for Organization model"""
    list_display = ('name', 'slug', 'primary_owner', 'subscription_status', 'trial_enabled')
    list_filter = ('subscription_status', 'trial_enabled')
    search_fields = ('name', 'slug', 'primary_owner__username')
    prepopulated_fields = {'slug': ('name',)}

@admin.register(BaseRole)
class BaseRoleAdmin(admin.ModelAdmin):
    """Admin configuration for BaseRole model"""
    list_display = ('name', 'slug', 'role_type', 'is_system_role')
    list_filter = ('role_type', 'is_system_role', 'default_can_manage_users', 'default_can_manage_billing')
    search_fields = ('name', 'slug', 'description')
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ('created_at', 'updated_at')

@admin.register(OrganizationRoleCustomization)
class OrganizationRoleCustomizationAdmin(admin.ModelAdmin):
    """Admin configuration for OrganizationRoleCustomization model"""
    list_display = ('organization', 'base_role', 'get_customized_permissions')
    list_filter = ('base_role', 'can_manage_users', 'can_manage_billing')
    search_fields = ('organization__name', 'base_role__name')
    readonly_fields = ('created_at', 'updated_at')
    
    def get_customized_permissions(self, obj):
        """Show which permissions are customized for this role"""
        customized = []
        permissions = [
            'can_manage_users', 'can_manage_billing', 'can_manage_properties',
            'can_manage_tenants', 'can_view_reports', 'can_manage_roles',
            'can_manage_system_settings', 'can_view_dashboard', 
            'can_manage_tickets', 'manage_notices'
        ]
        for perm in permissions:
            value = getattr(obj, perm, None)
            if value is not None:
                customized.append(f"{perm}: {value}")
        return ", ".join(customized) if customized else "No customizations"
    get_customized_permissions.short_description = 'Customized Permissions'

@admin.register(OrganizationRole)
class OrganizationRoleAdmin(admin.ModelAdmin):
    """Admin configuration for OrganizationRole model"""
    list_display = ('organization', 'get_role_name', 'get_role_type', 'get_effective_permissions')
    list_filter = ('base_role__role_type', 'organization')
    search_fields = ('organization__name', 'base_role__name')
    readonly_fields = ('created_at', 'updated_at')
    
    def get_role_name(self, obj):
        return obj.name
    get_role_name.short_description = 'Role Name'
    
    def get_role_type(self, obj):
        return obj.role_type
    get_role_type.short_description = 'Role Type'
    
    def get_effective_permissions(self, obj):
        """Show effective permissions for this role"""
        permissions = []
        if obj.can_manage_users:
            permissions.append('Users')
        if obj.can_manage_billing:
            permissions.append('Billing')
        if obj.can_manage_properties:
            permissions.append('Properties')
        if obj.can_manage_tenants:
            permissions.append('Tenants')
        if obj.can_view_reports:
            permissions.append('Reports')
        return ", ".join(permissions) if permissions else "No permissions"
    get_effective_permissions.short_description = 'Effective Permissions'

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
