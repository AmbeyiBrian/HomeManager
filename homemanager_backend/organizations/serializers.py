from rest_framework import serializers
from .models import Organization, SubscriptionPlan, Subscription, SubscriptionPayment
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
    """Serializer for the OrganizationRole model"""
    class Meta:
        model = OrganizationRole
        fields = ['id', 'name', 'slug', 'role_type', 'description',
                 'can_manage_users', 'can_manage_billing', 'can_manage_properties',
                 'can_manage_tenants', 'can_view_reports']
        read_only_fields = ['id']

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
