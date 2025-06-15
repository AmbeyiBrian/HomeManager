from rest_framework import serializers
from .models import Property, PropertyImage, Unit, QRCode, MpesaConfig, PropertyMpesaConfig

class PropertyImageSerializer(serializers.ModelSerializer):
    """Serializer for property images"""
    class Meta:
        model = PropertyImage
        fields = ['id', 'property', 'image', 'description', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at']

class QRCodeSerializer(serializers.ModelSerializer):
    """Serializer for the QRCode model"""
    class Meta:
        model = QRCode
        fields = ['id', 'unit', 'code', 'created_at', 'is_active', 
                 'last_accessed', 'access_count', 'payment_enabled']
        read_only_fields = ['id', 'code', 'created_at', 'last_accessed', 'access_count']

class UnitSerializer(serializers.ModelSerializer):
    """Serializer for the Unit model"""
    qr_code = QRCodeSerializer(read_only=True)
    tenant_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Unit
        fields = ['id', 'property', 'unit_number', 'unit_type', 'floor', 'size', 'bedrooms', 
                 'bathrooms', 'monthly_rent', 'security_deposit', 'is_occupied', 'description', 
                 'access_code', 'qr_code', 'tenant_name']
        read_only_fields = ['id']
    
    def get_tenant_name(self, obj):
        """Get the name of the current tenant, if any"""
        # Get latest active lease for unit
        active_lease = obj.leases.filter(is_active=True).first()
        if active_lease and active_lease.tenant:
            return active_lease.tenant.name
        return None

class PropertySerializer(serializers.ModelSerializer):
    """Serializer for the Property model"""
    unit_count = serializers.SerializerMethodField()
    occupied_units = serializers.SerializerMethodField()
    vacancy_rate = serializers.SerializerMethodField()
    total_monthly_rent = serializers.SerializerMethodField()
    
    class Meta:
        model = Property
        fields = ['id', 'owner', 'organization', 'name', 'address', 'property_type', 
                 'description', 'image', 'created_at', 'unit_count', 'occupied_units', 
                 'vacancy_rate', 'total_monthly_rent']
        read_only_fields = ['id', 'owner', 'organization', 'created_at', 'unit_count', 'occupied_units', 
                           'vacancy_rate', 'total_monthly_rent']
    
    def get_unit_count(self, obj):
        """Get the number of units in the property"""
        return obj.units.count()
    
    def get_occupied_units(self, obj):
        """Get the number of occupied units in the property"""
        return obj.units.filter(is_occupied=True).count()
    
    def get_vacancy_rate(self, obj):
        """Calculate vacancy rate"""
        unit_count = obj.units.count()
        if unit_count == 0:
            return 0
        occupied = obj.units.filter(is_occupied=True).count()
        return round((unit_count - occupied) / unit_count * 100, 2)
    
    def get_total_monthly_rent(self, obj):
        """Calculate total monthly rent for the property"""
        return sum(unit.monthly_rent for unit in obj.units.all())

class PropertyDetailSerializer(PropertySerializer):
    """Detailed serializer for Property including units and images"""
    units = UnitSerializer(many=True, read_only=True)
    images = PropertyImageSerializer(many=True, read_only=True)
    
    class Meta(PropertySerializer.Meta):
        fields = PropertySerializer.Meta.fields + ['units', 'images']

class MpesaConfigSerializer(serializers.ModelSerializer):
    """Serializer for the MpesaConfig model"""
    
    class Meta:
        model = MpesaConfig
        fields = ['id', 'organization', 'is_active', 'is_sandbox', 'consumer_key', 'consumer_secret',
                 'business_short_code', 'passkey', 'callback_url', 'timeout_url']
        read_only_fields = ['id']
        extra_kwargs = {
            'consumer_key': {'write_only': True},
            'consumer_secret': {'write_only': True},
            'passkey': {'write_only': True},
        }

class PropertyMpesaConfigSerializer(serializers.ModelSerializer):
    """Serializer for the PropertyMpesaConfig model"""
    property_name = serializers.CharField(source='property.name', read_only=True)
    organization_config_available = serializers.SerializerMethodField()
    
    class Meta:
        model = PropertyMpesaConfig
        fields = ['id', 'property', 'property_name', 'is_active', 'is_sandbox', 
                 'consumer_key', 'consumer_secret', 'business_short_code', 'passkey', 
                 'callback_url', 'timeout_url', 'use_organization_config', 
                 'organization_config_available']
        read_only_fields = ['id']
        extra_kwargs = {
            'consumer_key': {'write_only': True},
            'consumer_secret': {'write_only': True},
            'passkey': {'write_only': True},
        }
    
    def get_organization_config_available(self, obj):
        """Check if the property's organization has M-Pesa configured"""
        try:
            return bool(obj.property.organization.mpesa_config)
        except:
            return False
