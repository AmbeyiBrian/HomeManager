from rest_framework import serializers
from .models import Organization, SubscriptionPlan, Subscription, SubscriptionPayment, BaseRole, OrganizationRoleCustomization
from .membership_models import OrganizationRole, OrganizationMembership

class OrganizationSerializer(serializers.ModelSerializer):
    """Serializer for the Organization model"""
    user_role = serializers.SerializerMethodField()
    
    class Meta:
        model = Organization
        fields = ['id', 'name', 'slug', 'description', 'email', 'phone', 'website', 'address',
                 'subscription_status', 'plan_name', 'user_role', 'created_at']
        read_only_fields = ['id', 'slug', 'created_at']
    
    def get_user_role(self, obj):
        """Get the current user's role in this organization"""
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return None
            
        try:
            membership = OrganizationMembership.objects.get(
                organization=obj,
                user=request.user,
                is_active=True
            )
            return membership.role.name if membership.role else None
        except OrganizationMembership.DoesNotExist:
            return None

class SubscriptionPlanSerializer(serializers.ModelSerializer):
    """Serializer for the SubscriptionPlan model"""
    class Meta:
        model = SubscriptionPlan
        fields = ['id', 'name', 'slug', 'description', 'price_monthly', 'price_yearly',
                 'currency', 'max_properties', 'max_units', 'max_users',
                 'has_tenant_portal', 'has_payment_processing', 'has_maintenance_management',
                 'has_custom_branding', 'has_api_access', 'support_level']
        read_only_fields = ['id', 'slug']

class SubscriptionSerializer(serializers.ModelSerializer):
    """Serializer for the Subscription model"""
    plan_details = SubscriptionPlanSerializer(source='plan', read_only=True)
    
    class Meta:
        model = Subscription
        fields = ['id', 'organization', 'plan', 'plan_details', 'status', 'billing_period',
                 'start_date', 'end_date', 'trial_end_date']
        read_only_fields = ['id', 'created_at']

class SubscriptionPaymentSerializer(serializers.ModelSerializer):
    """Serializer for the SubscriptionPayment model"""
    class Meta:
        model = SubscriptionPayment
        fields = ['id', 'subscription', 'amount', 'currency', 'status', 
                 'payment_method', 'transaction_id', 'payment_date',
                 'receipt_number', 'receipt_url', 'notes']
        read_only_fields = ['id', 'created_at']

class OrganizationRoleSerializer(serializers.ModelSerializer):
    """Serializer for the OrganizationRole model with computed permissions"""
    # Include computed permission fields as read-only
    name = serializers.CharField(read_only=True)
    slug = serializers.CharField(read_only=True)
    role_type = serializers.CharField(read_only=True)
    description = serializers.CharField(read_only=True)
    can_manage_users = serializers.BooleanField(read_only=True)
    can_manage_billing = serializers.BooleanField(read_only=True)
    can_manage_properties = serializers.BooleanField(read_only=True)
    can_manage_tenants = serializers.BooleanField(read_only=True)
    can_view_reports = serializers.BooleanField(read_only=True)
    can_manage_roles = serializers.BooleanField(read_only=True)
    can_manage_system_settings = serializers.BooleanField(read_only=True)
    can_view_dashboard = serializers.BooleanField(read_only=True)
    can_manage_tickets = serializers.BooleanField(read_only=True)
    manage_notices = serializers.BooleanField(read_only=True)
    
    # Additional fields
    is_customized = serializers.SerializerMethodField()
    base_role_name = serializers.CharField(source='base_role.name', read_only=True)
    base_role_slug = serializers.CharField(source='base_role.slug', read_only=True)
    
    class Meta:
        model = OrganizationRole
        fields = [
            'id', 'organization', 'base_role', 'base_role_name', 'base_role_slug',
            'name', 'slug', 'role_type', 'description',
            'can_manage_users', 'can_manage_billing', 'can_manage_properties',
            'can_manage_tenants', 'can_view_reports', 'can_manage_roles',
            'can_manage_system_settings', 'can_view_dashboard', 
            'can_manage_tickets', 'manage_notices', 'is_customized',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'name', 'slug', 'role_type', 'description',
            'can_manage_users', 'can_manage_billing', 'can_manage_properties',
            'can_manage_tenants', 'can_view_reports', 'can_manage_roles',
            'can_manage_system_settings', 'can_view_dashboard', 
            'can_manage_tickets', 'manage_notices', 'is_customized',
            'created_at', 'updated_at'
        ]
    
    def get_is_customized(self, obj):
        """Check if this role has any customizations"""
        return OrganizationRoleCustomization.objects.filter(
            organization=obj.organization,
            base_role=obj.base_role
        ).exists()

class OrganizationMembershipSerializer(serializers.ModelSerializer):
    """Serializer for the OrganizationMembership model"""
    user_details = serializers.SerializerMethodField()
    role_details = OrganizationRoleSerializer(source='role', read_only=True)
    
    class Meta:
        model = OrganizationMembership
        fields = ['id', 'organization', 'user', 'user_details', 'role', 'role_details',
                 'is_active', 'is_invited', 'invitation_sent_at', 
                 'invitation_accepted_at', 'created_at']
        read_only_fields = ['id', 'invitation_token', 'created_at', 'updated_at']
    
    def get_user_details(self, obj):
        from users.serializers import UserSerializer
        return {
            'id': obj.user.id,
            'username': obj.user.username,
            'email': obj.user.email,
            'first_name': obj.user.first_name,
            'last_name': obj.user.last_name
        }

class BaseRoleSerializer(serializers.ModelSerializer):
    """Serializer for the BaseRole model"""
    class Meta:
        model = BaseRole
        fields = [
            'id', 'name', 'slug', 'description', 'role_type', 'is_system_role',
            'default_can_manage_users', 'default_can_manage_billing', 'default_can_manage_properties',
            'default_can_manage_tenants', 'default_can_view_reports', 'default_can_manage_roles',
            'default_can_manage_system_settings', 'default_can_view_dashboard', 
            'default_can_manage_tickets', 'default_manage_notices'
        ]
        read_only_fields = ['id', 'slug', 'is_system_role']

class OrganizationRoleCustomizationSerializer(serializers.ModelSerializer):
    """Serializer for the OrganizationRoleCustomization model"""
    base_role_name = serializers.CharField(source='base_role.name', read_only=True)
    base_role_description = serializers.CharField(source='base_role.description', read_only=True)
    base_role_slug = serializers.CharField(source='base_role.slug', read_only=True)
    
    class Meta:
        model = OrganizationRoleCustomization
        fields = [
            'id', 'organization', 'base_role', 'base_role_name', 'base_role_description', 'base_role_slug',
            'can_manage_users', 'can_manage_billing', 'can_manage_properties',
            'can_manage_tenants', 'can_view_reports', 'can_manage_roles',
            'can_manage_system_settings', 'can_view_dashboard', 
            'can_manage_tickets', 'manage_notices', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'organization', 'created_at', 'updated_at']
    
    def validate(self, data):
        """Validate that at least one permission is being customized"""
        permission_fields = [
            'can_manage_users', 'can_manage_billing', 'can_manage_properties',
            'can_manage_tenants', 'can_view_reports', 'can_manage_roles',
            'can_manage_system_settings', 'can_view_dashboard', 
            'can_manage_tickets', 'manage_notices'
        ]
        
        # Check if any permission field has a non-None value
        has_customization = any(data.get(field) is not None for field in permission_fields)
        
        if not has_customization:
            raise serializers.ValidationError(
                "At least one permission must be customized. "
                "To reset to defaults, delete the customization instead."
            )
        
        return data
