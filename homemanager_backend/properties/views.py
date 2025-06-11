from rest_framework import viewsets, permissions, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import models
from .models import Property, PropertyImage, Unit, QRCode, MpesaConfig, PropertyMpesaConfig
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
            return Property.objects.all()
        if user.organization:
            return Property.objects.filter(organization=user.organization)
        return Property.objects.none()
    
    def perform_create(self, serializer):
        """Set owner and organization when creating a new property"""
        serializer.save(
            owner=self.request.user,
            organization=self.request.user.organization
        )
    
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
