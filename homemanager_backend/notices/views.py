from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.shortcuts import get_object_or_404
from .models import Notice, NoticeView
from .serializers import NoticeSerializer, NoticeDetailSerializer, NoticeViewSerializer
from tenants.models import Tenant
from sms.utils import send_notice_sms

class NoticeViewSet(viewsets.ModelViewSet):
    """ViewSet for viewing and editing Notice instances"""
    queryset = Notice.objects.all()
    serializer_class = NoticeSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        """Return a different serializer for retrieve action"""
        if self.action == 'retrieve':
            return NoticeDetailSerializer
        return NoticeSerializer
    
    def get_queryset(self):
        """Filter notices to only show those for the user's organization"""
        user = self.request.user
        if user.is_superuser:
            return Notice.objects.all()
        
        # Filter by notice_type, property, important, archived
        notice_type = self.request.query_params.get('notice_type', None)
        property_id = self.request.query_params.get('property', None)
        important = self.request.query_params.get('important', None)
        archived = self.request.query_params.get('archived', None)
        active = self.request.query_params.get('active', None)
        
        queryset = Notice.objects.all()
        
        if user.organization:
            queryset = queryset.filter(property__organization=user.organization)
        else:
            return Notice.objects.none()
        
        if notice_type:
            queryset = queryset.filter(notice_type=notice_type)
        
        if property_id:
            queryset = queryset.filter(property_id=property_id)
        
        if important is not None:
            important_bool = important.lower() == 'true'
            queryset = queryset.filter(is_important=important_bool)
        
        if archived is not None:
            archived_bool = archived.lower() == 'true'
            queryset = queryset.filter(is_archived=archived_bool)
            
        if active is not None and active.lower() == 'true':
            # Only return active notices (current date is between start_date and end_date)
            today = timezone.now().date()
            queryset = queryset.filter(
                start_date__lte=today
            ).filter(
                end_date__isnull=True
            ) | queryset.filter(
                start_date__lte=today, 
                end_date__gte=today
            )
        
        return queryset.order_by('-created_at')
    
    @action(detail=True, methods=['post'])
    def mark_viewed(self, request, pk=None):
        """Mark a notice as viewed by a tenant"""
        notice = self.get_object()
        tenant_id = request.data.get('tenant_id', None)
        
        if not tenant_id:
            return Response(
                {'error': 'tenant_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        tenant = get_object_or_404(Tenant, pk=tenant_id)
        
        # Ensure tenant belongs to the same organization
        if tenant.unit.property.organization != request.user.organization:
            return Response(
                {'error': 'Unauthorized tenant'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Create or get the view record
        notice_view, created = NoticeView.objects.get_or_create(
            notice=notice,
            tenant=tenant
        )
        
        # If it wasn't newly created, update the viewed_at timestamp
        if not created:
            notice_view.viewed_at = timezone.now()
            notice_view.save()
        
        serializer = NoticeViewSerializer(notice_view)
        return Response(serializer.data)

    def perform_create(self, serializer):
        """Create notice and optionally send SMS notifications"""
        # Save the notice first
        notice = serializer.save()
        
        # Check if SMS should be sent
        send_sms_flag = serializer.validated_data.get('send_sms', False)
        
        if send_sms_flag:
            # Send SMS to all tenants in the property
            sms_result = send_notice_sms(notice, send_sms_flag=True)
            
            # You could log the SMS result or store it somewhere
            # For now, we'll just print it for debugging
            print(f"SMS Result for Notice {notice.id}: {sms_result}")
    
    def perform_update(self, serializer):
        """Update notice and optionally send SMS notifications if newly enabled"""
        # Get the old instance to check if send_sms changed
        old_instance = self.get_object()
        old_send_sms = old_instance.send_sms
        
        # Save the updated notice
        notice = serializer.save()
        
        # Check if SMS was newly enabled
        new_send_sms = serializer.validated_data.get('send_sms', old_send_sms)
        
        if new_send_sms and not old_send_sms:
            # SMS was newly enabled, send notifications
            sms_result = send_notice_sms(notice, send_sms_flag=True)
            print(f"SMS Result for Updated Notice {notice.id}: {sms_result}")

class NoticeViewViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing NoticeView instances (read-only)"""
    queryset = NoticeView.objects.all()
    serializer_class = NoticeViewSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter notice views to only show those for the user's organization"""
        user = self.request.user
        if user.is_superuser:
            return NoticeView.objects.all()
        
        # Filter by notice or tenant if provided
        notice_id = self.request.query_params.get('notice', None)
        tenant_id = self.request.query_params.get('tenant', None)
        
        queryset = NoticeView.objects.all()
        
        if user.organization:
            queryset = queryset.filter(notice__property__organization=user.organization)
        else:
            return NoticeView.objects.none()
        
        if notice_id:
            queryset = queryset.filter(notice_id=notice_id)
        
        if tenant_id:
            queryset = queryset.filter(tenant_id=tenant_id)
            
        return queryset.order_by('-viewed_at')
