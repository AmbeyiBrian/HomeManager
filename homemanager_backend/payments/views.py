from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import RentPayment, MpesaPayment
from .serializers import RentPaymentSerializer, RentPaymentDetailSerializer, MpesaPaymentSerializer

class RentPaymentViewSet(viewsets.ModelViewSet):
    """ViewSet for viewing and editing RentPayment instances"""
    queryset = RentPayment.objects.all()
    serializer_class = RentPaymentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        """Return a different serializer for retrieve action"""
        if self.action == 'retrieve':
            return RentPaymentDetailSerializer
        return RentPaymentSerializer
    
    def get_queryset(self):
        """Filter payments to only show those for the user's organization"""
        user = self.request.user
        if user.is_superuser:
            return RentPayment.objects.all()
        
        # Filter by status, unit, tenant, etc.
        status_param = self.request.query_params.get('status', None)
        unit_id = self.request.query_params.get('unit', None)
        tenant_id = self.request.query_params.get('tenant', None)
        property_id = self.request.query_params.get('property', None)
        start_date = self.request.query_params.get('start_date', None)
        end_date = self.request.query_params.get('end_date', None)
        
        queryset = RentPayment.objects.all()
        
        if user.organization:
            queryset = queryset.filter(unit__property__organization=user.organization)
        else:
            return RentPayment.objects.none()
        
        if status_param:
            queryset = queryset.filter(status=status_param)
        
        if unit_id:
            queryset = queryset.filter(unit_id=unit_id)
        
        if tenant_id:
            queryset = queryset.filter(tenant_id=tenant_id)
        
        if property_id:
            queryset = queryset.filter(unit__property_id=property_id)
        
        if start_date:
            queryset = queryset.filter(due_date__gte=start_date)
        
        if end_date:
            queryset = queryset.filter(due_date__lte=end_date)
            
        return queryset.order_by('-due_date')
    
    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        """Mark a payment as completed"""
        payment = self.get_object()
        payment.status = 'completed'
        payment.payment_date = timezone.now()
        payment.payment_method = request.data.get('payment_method', 'cash')
        payment.transaction_id = request.data.get('transaction_id', '')
        payment.save()
        
        serializer = self.get_serializer(payment)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def initiate_mpesa(self, request, pk=None):
        """Initiate M-Pesa payment for a rent payment"""
        payment = self.get_object()
        phone_number = request.data.get('phone_number', None)
        
        if not phone_number:
            # Use tenant's phone number if not provided
            phone_number = payment.tenant.phone_number
        
        # Get the property for the payment
        property_obj = payment.unit.property
        
        # Check for property-specific M-Pesa config
        from properties.models import PropertyMpesaConfig
        try:
            # Try to get property-specific config
            mpesa_config = PropertyMpesaConfig.objects.get(property=property_obj)
            
            # If config exists but is set to use organization config, use org config instead
            if mpesa_config.use_organization_config:
                mpesa_config = property_obj.organization.mpesa_config
        except PropertyMpesaConfig.DoesNotExist:
            # Fallback to organization config
            mpesa_config = property_obj.organization.mpesa_config
        
        if not mpesa_config:
            return Response(
                {"error": "No M-Pesa configuration found for this property or organization"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Create an M-Pesa payment record
        mpesa_payment = MpesaPayment.objects.create(
            rent_payment=payment,
            property=property_obj,
            organization=request.user.organization,
            phone_number=phone_number,
            amount=payment.amount,
            reference=f"Rent-{payment.id}",
            description=f"Rent payment for {payment.unit}"
        )
        
        # In a real implementation, we would call the M-Pesa API here using mpesa_config
        # For now, just update the payment status
        payment.status = 'initiated'
        payment.payment_method = 'm_pesa'
        payment.save()
        
        serializer = MpesaPaymentSerializer(mpesa_payment)
        return Response(serializer.data)

class MpesaPaymentViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing MpesaPayment instances (read-only)"""
    queryset = MpesaPayment.objects.all()
    serializer_class = MpesaPaymentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter M-Pesa payments to only show those for the user's organization"""
        user = self.request.user
        if user.is_superuser:
            return MpesaPayment.objects.all()
        
        # Filter by rent_payment or property if provided
        rent_payment_id = self.request.query_params.get('rent_payment', None)
        property_id = self.request.query_params.get('property', None)
        queryset = MpesaPayment.objects.all()
        
        if user.organization:
            queryset = queryset.filter(organization=user.organization)
            
            # Additional filters
            if property_id:
                queryset = queryset.filter(property_id=property_id)
            elif rent_payment_id:
                queryset = queryset.filter(rent_payment_id=rent_payment_id)
        else:
            return MpesaPayment.objects.none()
        
        if rent_payment_id:
            queryset = queryset.filter(rent_payment_id=rent_payment_id)
            
        return queryset.order_by('-created_at')
