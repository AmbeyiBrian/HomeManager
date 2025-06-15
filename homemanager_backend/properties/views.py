from rest_framework import viewsets, permissions, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import models
from .models import Property, PropertyImage, Unit, QRCode, MpesaConfig, PropertyMpesaConfig
from users.models import User
from .serializers import (
    PropertySerializer, PropertyDetailSerializer, PropertyImageSerializer,
    UnitSerializer, QRCodeSerializer, MpesaConfigSerializer, PropertyMpesaConfigSerializer
)

class PropertyViewSet(viewsets.ModelViewSet):
    """ViewSet for viewing and editing Property instances"""
    queryset = Property.objects.all()
    serializer_class = PropertySerializer
    permission_classes = [permissions.IsAuthenticated]
      
    def get_serializer_class(self):
        """Return a different serializer for retrieve action"""
        if self.action == 'retrieve':
            return PropertyDetailSerializer
        return PropertySerializer
    
    def get_queryset(self):
        """
        Filter properties to only show those in the user's organization
        unless the user is a superuser
        """
        user = self.request.user
        if user.is_superuser:
            queryset = Property.objects.all()
            print(f"DEBUG: Returning all {queryset.count()} properties for superuser")
            return queryset
        if user.organization:
            queryset = Property.objects.filter(organization=user.organization)
            print(f"DEBUG: Filtered properties for organization '{user.organization.name}': {queryset.count()} properties")
            return queryset
        print("DEBUG: User has no organization, returning empty queryset")
        return Property.objects.none()    
    
    def perform_create(self, serializer):
        """Set owner and organization when creating a new property"""
        user = self.request.user
        
        # Ensure the user has an organization
        if not user.organization:
            raise serializers.ValidationError(
                "You must belong to an organization to create a property"
            )
            
        # Set both owner and organization consistently
        serializer.save(
            owner=user,
            organization=user.organization
        )
        
        print(f"Created property: {serializer.instance.name}")
        print(f"Owner: {serializer.instance.owner.username}")
        print(f"Organization: {serializer.instance.organization.name}")
    
    def perform_update(self, serializer):
        """
        Ensure property ownership stays consistent with organization
        when organization is changed
        """
        instance = self.get_object()
        data = serializer.validated_data
        
        # If organization is being changed, update the owner
        if 'organization' in data and data['organization'] != instance.organization:
            new_org = data['organization']
            user = self.request.user
            
            # Only allow organization admins or superusers to change organization
            if not (user.is_superuser or user.is_organization_admin):
                raise serializers.ValidationError(
                    "Only organization admins or superusers can change a property's organization"
                )
                
            # Find a suitable owner from the new organization (admin preferred)
            new_owner = User.objects.filter(
                organization=new_org,
                is_organization_admin=True
            ).first()
            
            if not new_owner:
                new_owner = User.objects.filter(organization=new_org).first()
                
            if not new_owner:
                raise serializers.ValidationError(
                    f"No users found in the {new_org.name} organization to assign as owner"
                )
                
            # Update the owner to someone from the new organization
            data['owner'] = new_owner
            print(f"Changing property organization from {instance.organization.name} to {new_org.name}")
            print(f"Changing property owner from {instance.owner.username} to {new_owner.username}")
            
        serializer.save()
    
    @action(detail=True, methods=['get'])
    def rent_stats(self, request, pk=None):
        """Get rent statistics for a specific property"""
        property_obj = self.get_object()
        
        # Get all units for this property
        units = property_obj.units.all()
        
        # Calculate total monthly rent for occupied units
        total_monthly_rent = sum(
            unit.monthly_rent for unit in units.filter(is_occupied=True)
        )
        
        # Calculate total collected payments for this property
        from payments.models import RentPayment
        total_collected = RentPayment.objects.filter(
            unit__property=property_obj,
            status='completed'
        ).aggregate(total=models.Sum('amount'))['total'] or 0
        
        # Calculate pending rent (monthly rent - collected payments)
        pending_rent = max(0, total_monthly_rent - total_collected)
        
        return Response({
            'collected': float(total_collected),
            'pending': float(pending_rent),
            'total_monthly_rent': float(total_monthly_rent),
            'occupied_units': units.filter(is_occupied=True).count(),
            'total_units': units.count(),
        })

class PropertyImageViewSet(viewsets.ModelViewSet):
    """ViewSet for viewing and editing PropertyImage instances"""
    queryset = PropertyImage.objects.all()
    serializer_class = PropertyImageSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter images to only show those for properties in the user's organization"""
        user = self.request.user
        if user.is_superuser:
            return PropertyImage.objects.all()
        
        if user.organization:
            return PropertyImage.objects.filter(property__organization=user.organization)
        return PropertyImage.objects.none()

class UnitViewSet(viewsets.ModelViewSet):
    """ViewSet for viewing and editing Unit instances"""
    queryset = Unit.objects.all()
    serializer_class = UnitSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter units to only show those for properties in the user's organization"""
        user = self.request.user
        if user.is_superuser:
            return Unit.objects.all()
        
        # Filter by property parameter if provided
        property_id = self.request.query_params.get('property', None)
        queryset = Unit.objects.all()
        
        if user.organization:
            queryset = queryset.filter(property__organization=user.organization)
        else:
            return Unit.objects.none()
            
        if property_id:
            queryset = queryset.filter(property_id=property_id)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def available(self, request):
        """List available (unoccupied) units with optional filtering"""
        # Get basic queryset using the same organization filtering as get_queryset
        queryset = self.get_queryset()
        
        # Filter to only show available (unoccupied) units
        queryset = queryset.filter(is_occupied=False)
        
        # Additional filters
        property_id = request.query_params.get('property_id', None)
        bedrooms = request.query_params.get('bedrooms', None)
        bathrooms = request.query_params.get('bathrooms', None)
        max_rent = request.query_params.get('max_rent', None)
        max_security_deposit = request.query_params.get('max_security_deposit', None)
        
        if property_id:
            queryset = queryset.filter(property_id=property_id)
            
        if bedrooms:
            queryset = queryset.filter(bedrooms=bedrooms)
            
        if bathrooms:
            queryset = queryset.filter(bathrooms=bathrooms)
            
        if max_rent:
            queryset = queryset.filter(monthly_rent__lte=max_rent)
            
        if max_security_deposit:
            queryset = queryset.filter(security_deposit__lte=max_security_deposit)
        
        # Serialize and return the data
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    @action(detail=True, methods=['post', 'patch'])
    def allocate_tenant(self, request, pk=None):
        """Allocate a tenant to this unit"""
        from tenants.models import Tenant, Lease
        
        unit = self.get_object()
        tenant_id = request.data.get('tenant_id')
        
        if not tenant_id:
            return Response(
                {'error': 'tenant_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if unit is already occupied by a different tenant
        if unit.is_occupied and request.method == 'POST':
            return Response(
                {'error': 'Unit is already occupied'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get the tenant object
        try:
            tenant = Tenant.objects.get(id=tenant_id)
        except Tenant.DoesNotExist:
            return Response(
                {'error': f'Tenant with ID {tenant_id} does not exist'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # For POST requests (new allocations), prevent if tenant is already assigned
        # For PATCH requests (reallocations), allow changing units
        if tenant.unit and request.method == 'POST':
            return Response(
                {'error': f'Tenant is already assigned to unit {tenant.unit.unit_number}. Use PATCH to reallocate.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
          # Extract lease details from request data
        lease_start_date = request.data.get('lease_start_date')
        lease_end_date = request.data.get('lease_end_date')
        rent_amount = request.data.get('rent_amount', unit.monthly_rent)
        security_deposit = request.data.get('security_deposit', unit.security_deposit)
        
        # Assign tenant to unit
        tenant.unit = unit
        tenant.save()
          # Mark unit as occupied for POST and as unoccupied for PATCH (reallocation)
        # For PATCH (reallocation), we set is_occupied to False to indicate
        # that the unit is being reallocated and needs management attention
        if request.method == 'POST':
            unit.is_occupied = True
        else:  # PATCH
            unit.is_occupied = False
        unit.save()
          # Create lease if lease dates are provided
        lease = None
        if lease_start_date and lease_end_date:
            # Note: Lease model doesn't have rent_amount and security_deposit fields
            # Those values are properties of the unit, not the lease
            lease = Lease.objects.create(
                tenant=tenant,
                unit=unit,
                start_date=lease_start_date,
                end_date=lease_end_date,
                is_active=True
            )
            
            # If we need to update unit rent amount or security deposit
            if rent_amount != unit.monthly_rent or security_deposit != unit.security_deposit:
                unit.monthly_rent = rent_amount
                unit.security_deposit = security_deposit
                unit.save()
        
        # Return response with updated tenant info
        from tenants.serializers import TenantDetailSerializer
        tenant_serializer = TenantDetailSerializer(tenant)
        
        response_data = tenant_serializer.data
        if lease:
            from tenants.serializers import LeaseSerializer
            lease_serializer = LeaseSerializer(lease)
            response_data['lease'] = lease_serializer.data
        
        return Response(response_data, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def deallocate_tenant(self, request, pk=None):
        """Deallocate a tenant from this unit"""
        from tenants.models import Tenant, Lease
        
        unit = self.get_object()
        tenant_id = request.data.get('tenant_id')
        
        if not tenant_id:
            return Response(
                {'error': 'tenant_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if unit is occupied
        if not unit.is_occupied:
            return Response(
                {'error': 'Unit is not occupied'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get the tenant object
        try:
            tenant = Tenant.objects.get(id=tenant_id)
        except Tenant.DoesNotExist:
            return Response(
                {'error': f'Tenant with ID {tenant_id} does not exist'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if tenant is assigned to this unit
        if tenant.unit != unit:
            return Response(
                {'error': 'Tenant is not assigned to this unit'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Deactivate any active leases
        active_leases = Lease.objects.filter(tenant=tenant, unit=unit, is_active=True)
        for lease in active_leases:
            lease.is_active = False
            lease.save()
        
        # Deallocate tenant from unit
        tenant.unit = None
        tenant.save()
        
        # Mark unit as unoccupied
        unit.is_occupied = False
        unit.save()
        
        # Return response with updated tenant info
        from tenants.serializers import TenantDetailSerializer
        tenant_serializer = TenantDetailSerializer(tenant)
        
        return Response(tenant_serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def generate_qr_code(self, request, pk=None):
        """Generate a QR code for the unit"""
        unit = self.get_object()
        
        # Check if QR code already exists
        try:
            qr_code = unit.qr_code
            return Response(
                {'detail': 'QR code already exists for this unit.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except QRCode.DoesNotExist:
            # Create new QR code
            qr_code = QRCode.objects.create(unit=unit)
            serializer = QRCodeSerializer(qr_code)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

class QRCodeViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing QRCode instances (read-only)"""
    queryset = QRCode.objects.all()
    serializer_class = QRCodeSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter QR codes to only show those for units in the user's organization"""
        user = self.request.user
        if user.is_superuser:
            return QRCode.objects.all()
        
        if user.organization:
            return QRCode.objects.filter(unit__property__organization=user.organization)
        return QRCode.objects.none()

class MpesaConfigViewSet(viewsets.ModelViewSet):
    """ViewSet for viewing and editing MpesaConfig instances"""
    queryset = MpesaConfig.objects.all()
    serializer_class = MpesaConfigSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter M-Pesa configs to only show those in the user's organization"""
        user = self.request.user
        if user.is_superuser:
            return MpesaConfig.objects.all()
        if user.organization:
            return MpesaConfig.objects.filter(organization=user.organization)
        return MpesaConfig.objects.none()

class PropertyMpesaConfigViewSet(viewsets.ModelViewSet):
    """ViewSet for viewing and editing PropertyMpesaConfig instances"""
    queryset = PropertyMpesaConfig.objects.all()
    serializer_class = PropertyMpesaConfigSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter property M-Pesa configs to only show those in the user's organization"""
        user = self.request.user
        if user.is_superuser:
            return PropertyMpesaConfig.objects.all()
        if user.organization:
            return PropertyMpesaConfig.objects.filter(property__organization=user.organization)
        return PropertyMpesaConfig.objects.none()
    
    def perform_create(self, serializer):
        """Validate that the property belongs to the user's organization"""
        property_id = self.request.data.get('property')
        if property_id:
            property_obj = get_object_or_404(Property, id=property_id)
            if property_obj.organization != self.request.user.organization:
                raise serializers.ValidationError("Property must belong to your organization")
        serializer.save()
        
    @action(detail=False, methods=['get'])
    def by_property(self, request):
        """Get M-Pesa config for a specific property"""
        property_id = request.query_params.get('property_id')
        if not property_id:
            return Response({"error": "Property ID is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        property_obj = get_object_or_404(Property, id=property_id)
        
        # Check if user has access to this property
        if property_obj.organization != request.user.organization and not request.user.is_superuser:
            return Response({"error": "You don't have access to this property"}, 
                           status=status.HTTP_403_FORBIDDEN)
        
        try:
            config = PropertyMpesaConfig.objects.get(property=property_obj)
            serializer = self.get_serializer(config)
            return Response(serializer.data)
        except PropertyMpesaConfig.DoesNotExist:
            # Return organization config if available
            if property_obj.organization.mpesa_config:
                serializer = MpesaConfigSerializer(property_obj.organization.mpesa_config)
                data = serializer.data
                data['use_organization_config'] = True
                return Response(data)
            return Response({"error": "No M-Pesa configuration found for this property"}, 
                           status=status.HTTP_404_NOT_FOUND)
