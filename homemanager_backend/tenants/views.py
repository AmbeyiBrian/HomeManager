from rest_framework import viewsets, permissions
from .models import Tenant, Lease
from .serializers import TenantSerializer, TenantDetailSerializer, LeaseSerializer

class TenantViewSet(viewsets.ModelViewSet):
    """ViewSet for viewing and editing Tenant instances"""
    queryset = Tenant.objects.all()
    serializer_class = TenantSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        """Return a different serializer for retrieve action"""
        if self.action == 'retrieve':
            return TenantDetailSerializer
        return TenantSerializer
    
    def get_queryset(self):
        """
        Filter tenants to only show those in the user's organization
        """
        user = self.request.user
        if user.is_superuser:
            return Tenant.objects.all()
        
        # Filter by unit or property if provided
        property_id = self.request.query_params.get('property', None)
        unit_id = self.request.query_params.get('unit', None)
        queryset = Tenant.objects.all()
        
        if user.organization:
            queryset = queryset.filter(unit__property__organization=user.organization)
        else:
            return Tenant.objects.none()
        
        if property_id:
            queryset = queryset.filter(unit__property_id=property_id)
        
        if unit_id:
            queryset = queryset.filter(unit_id=unit_id)
            
        return queryset

class LeaseViewSet(viewsets.ModelViewSet):
    """ViewSet for viewing and editing Lease instances"""
    queryset = Lease.objects.all()
    serializer_class = LeaseSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        Filter leases to only show those in the user's organization
        """
        user = self.request.user
        if user.is_superuser:
            return Lease.objects.all()
        
        # Filter by tenant, unit or property if provided
        tenant_id = self.request.query_params.get('tenant', None)
        unit_id = self.request.query_params.get('unit', None)
        property_id = self.request.query_params.get('property', None)
        is_active = self.request.query_params.get('active', None)
        
        queryset = Lease.objects.all()
        
        if user.organization:
            queryset = queryset.filter(unit__property__organization=user.organization)
        else:
            return Lease.objects.none()
        
        if tenant_id:
            queryset = queryset.filter(tenant_id=tenant_id)
        
        if unit_id:
            queryset = queryset.filter(unit_id=unit_id)
        
        if property_id:
            queryset = queryset.filter(unit__property_id=property_id)
        
        if is_active is not None:
            is_active_bool = is_active.lower() == 'true'
            queryset = queryset.filter(is_active=is_active_bool)
            
        return queryset
