from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import SMSTemplate, SMSMessage, SMSProvider
from .serializers import SMSTemplateSerializer, SMSMessageSerializer, SMSProviderSerializer
from tenants.models import Tenant

class SMSTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet for viewing and editing SMSTemplate instances"""
    queryset = SMSTemplate.objects.all()
    serializer_class = SMSTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter templates to only show those for the user's organization"""
        user = self.request.user
        if user.is_superuser:
            return SMSTemplate.objects.all()
        
        if user.organization:
            return SMSTemplate.objects.filter(organization=user.organization)
        return SMSTemplate.objects.none()
    
    def perform_create(self, serializer):
        """Set organization when creating a template"""
        serializer.save(organization=self.request.user.organization)

class SMSMessageViewSet(viewsets.ModelViewSet):
    """ViewSet for viewing and editing SMSMessage instances"""
    queryset = SMSMessage.objects.all()
    serializer_class = SMSMessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter messages to only show those for the user's organization"""
        user = self.request.user
        if user.is_superuser:
            return SMSMessage.objects.all()
        
        # Filter by tenant, status, date range
        tenant_id = self.request.query_params.get('tenant', None)
        status_param = self.request.query_params.get('status', None)
        start_date = self.request.query_params.get('start_date', None)
        end_date = self.request.query_params.get('end_date', None)
        
        queryset = SMSMessage.objects.all()
        
        if user.organization:
            queryset = queryset.filter(tenant__unit__property__organization=user.organization)
        else:
            return SMSMessage.objects.none()
        
        if tenant_id:
            queryset = queryset.filter(tenant_id=tenant_id)
        
        if status_param:
            queryset = queryset.filter(status=status_param)
        
        if start_date:
            queryset = queryset.filter(sent_at__date__gte=start_date)
        
        if end_date:
            queryset = queryset.filter(sent_at__date__lte=end_date)
            
        return queryset.order_by('-sent_at')
    
    @action(detail=False, methods=['post'])
    def send(self, request):
        """Send an SMS message"""
        tenant_id = request.data.get('tenant_id')
        message_content = request.data.get('message_content')
        
        if not tenant_id or not message_content:
            return Response(
                {'error': 'Both tenant_id and message_content are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            tenant = Tenant.objects.get(id=tenant_id)
            
            # Ensure tenant belongs to the user's organization
            if tenant.unit.property.organization != request.user.organization:
                return Response(
                    {'error': 'Unauthorized tenant'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Create the SMS message
            sms_message = SMSMessage.objects.create(
                tenant=tenant,
                phone_number=tenant.phone_number,
                message_content=message_content,
                message_type='manual',
                sent_at=timezone.now(),
                status='pending'
            )
            
            # In a real implementation, we would send the SMS via an SMS gateway here
            # For now, just update the status
            sms_message.status = 'sent'
            sms_message.save()
            
            serializer = self.get_serializer(sms_message)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Tenant.DoesNotExist:
            return Response(
                {'error': 'Tenant not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['post'])
    def send_bulk(self, request):
        """Send SMS messages to multiple tenants"""
        tenant_ids = request.data.get('tenant_ids', [])
        message_content = request.data.get('message_content')
        
        if not tenant_ids or not message_content:
            return Response(
                {'error': 'Both tenant_ids and message_content are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        messages = []
        for tenant_id in tenant_ids:
            try:
                tenant = Tenant.objects.get(id=tenant_id)
                
                # Ensure tenant belongs to the user's organization
                if tenant.unit.property.organization != request.user.organization:
                    continue
                
                # Create the SMS message
                sms_message = SMSMessage.objects.create(
                    tenant=tenant,
                    phone_number=tenant.phone_number,
                    message_content=message_content,
                    message_type='bulk',
                    sent_at=timezone.now(),
                    status='pending'
                )
                
                # In a real implementation, we would send the SMS via an SMS gateway here
                # For now, just update the status
                sms_message.status = 'sent'
                sms_message.save()
                
                messages.append(sms_message)
                
            except Tenant.DoesNotExist:
                continue
        
        if not messages:
            return Response(
                {'error': 'No valid tenants found'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        serializer = self.get_serializer(messages, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class SMSProviderViewSet(viewsets.ModelViewSet):
    """ViewSet for viewing and editing SMSProvider instances"""
    queryset = SMSProvider.objects.all()
    serializer_class = SMSProviderSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter providers to only show those for the user's organization"""
        user = self.request.user
        if user.is_superuser:
            return SMSProvider.objects.all()
        
        if user.organization:
            return SMSProvider.objects.filter(organization=user.organization)
        return SMSProvider.objects.none()
    
    def perform_create(self, serializer):
        """Set organization when creating a provider"""
        serializer.save(organization=self.request.user.organization)
