from rest_framework import viewsets, permissions
from .models import Tenant, Lease
from .serializers import TenantSerializer, TenantDetailSerializer, LeaseSerializer
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status

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
    
    @action(detail=True, methods=['post'])
    def transfer(self, request, pk=None):
        """Transfer a tenant from one unit to another"""
        from .models import Lease
        from properties.models import Unit
        
        tenant = self.get_object()
        from_unit_id = request.data.get('from_unit_id')
        to_unit_id = request.data.get('to_unit_id')
        
        if not from_unit_id or not to_unit_id:
            return Response(
                {'error': 'Both from_unit_id and to_unit_id are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if tenant is currently in the from_unit
        if not tenant.unit or str(tenant.unit.id) != str(from_unit_id):
            return Response(
                {'error': f'Tenant is not currently in unit {from_unit_id}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get the to_unit object
        try:
            to_unit = Unit.objects.get(id=to_unit_id)
        except Unit.DoesNotExist:
            return Response(
                {'error': f'Unit with ID {to_unit_id} does not exist'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if to_unit is already occupied by someone else
        if to_unit.is_occupied and (to_unit.tenant_set.first() and to_unit.tenant_set.first() != tenant):
            return Response(
                {'error': f'Unit {to_unit.unit_number} is already occupied'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get the from_unit object
        from_unit = tenant.unit
        
        # Extract lease details from request data
        lease_start_date = request.data.get('lease_start_date')
        lease_end_date = request.data.get('lease_end_date')
        rent_amount = request.data.get('rent_amount', to_unit.monthly_rent)
        security_deposit = request.data.get('security_deposit', to_unit.security_deposit)
        
        # Deactivate current leases
        active_leases = Lease.objects.filter(tenant=tenant, unit=from_unit, is_active=True)
        for lease in active_leases:
            lease.is_active = False
            lease.save()
        
        # Transfer tenant to new unit
        tenant.unit = to_unit
        tenant.save()
        
        # Update unit statuses
        from_unit.is_occupied = False
        from_unit.save()
        
        to_unit.is_occupied = True
        to_unit.save()
        
        # Create new lease if lease dates are provided
        new_lease = None
        if lease_start_date and lease_end_date:
            new_lease = Lease.objects.create(
                tenant=tenant,
                unit=to_unit,
                start_date=lease_start_date,
                end_date=lease_end_date,
                rent_amount=rent_amount,
                security_deposit=security_deposit,
                is_active=True
            )
        
        # Return response with updated tenant info
        serializer = TenantDetailSerializer(tenant)
        response_data = serializer.data
        
        if new_lease:
            from .serializers import LeaseSerializer
            lease_serializer = LeaseSerializer(new_lease)
            response_data['new_lease'] = lease_serializer.data
        
        return Response(response_data, status=status.HTTP_200_OK)

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
