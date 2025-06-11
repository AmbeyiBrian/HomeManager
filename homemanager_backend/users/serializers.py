from rest_framework import serializers
from .models import User
from organizations.models import Organization

class UserSerializer(serializers.ModelSerializer):
    """Serializer for the User model"""
    organization_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'phone_number', 
                  'is_property_owner', 'is_tenant', 'organization', 'organization_name']
        read_only_fields = ['id']
        extra_kwargs = {
            'password': {'write_only': True}
        }
    
    def get_organization_name(self, obj):
        if obj.organization:
            return obj.organization.name
        return None

class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating User instances with password handling"""
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'password_confirm', 'first_name', 
                  'last_name', 'phone_number', 'is_property_owner', 'is_tenant', 'organization']
        extra_kwargs = {
            'password': {'write_only': True},
        }
    
    def validate(self, data):
        if data['password'] != data.pop('password_confirm'):
            raise serializers.ValidationError({"password": "Password fields don't match."})
        return data

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            phone_number=validated_data.get('phone_number', ''),
            is_property_owner=validated_data.get('is_property_owner', True),
            is_tenant=validated_data.get('is_tenant', False),
            organization=validated_data.get('organization', None)
        )
        return user
