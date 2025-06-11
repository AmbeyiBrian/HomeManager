from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import ServiceProvider, Ticket, TicketComment
from .serializers import ServiceProviderSerializer, TicketSerializer, TicketDetailSerializer, TicketCommentSerializer

class ServiceProviderViewSet(viewsets.ModelViewSet):
    """ViewSet for viewing and editing ServiceProvider instances"""
    queryset = ServiceProvider.objects.all()
    serializer_class = ServiceProviderSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter service providers to only show those for the user's organization"""
        user = self.request.user
        if user.is_superuser:
            return ServiceProvider.objects.all()
        
        # Filter by provider_type if provided
        provider_type = self.request.query_params.get('provider_type', None)
        queryset = ServiceProvider.objects.filter(owner=user)
        
        if provider_type:
            queryset = queryset.filter(provider_type=provider_type)
            
        return queryset
    
    def perform_create(self, serializer):
        """Set owner to current user when creating a service provider"""
        serializer.save(owner=self.request.user)

class TicketViewSet(viewsets.ModelViewSet):
    """ViewSet for viewing and editing Ticket instances"""
    queryset = Ticket.objects.all()
    serializer_class = TicketSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        """Return a different serializer for retrieve action"""
        if self.action == 'retrieve':
            return TicketDetailSerializer
        return TicketSerializer
    def get_queryset(self):
        """Filter tickets to only show those for the user's organization"""
        user = self.request.user
        if user.is_superuser:
            return Ticket.objects.all()
        
        # Filter by status, priority, property, etc. if provided
        status_params = self.request.query_params.getlist('status')  # Get all status parameters
        priority = self.request.query_params.get('priority', None)
        property_id = self.request.query_params.get('property', None)
        unit_id = self.request.query_params.get('unit', None)
        tenant_id = self.request.query_params.get('tenant', None)
        
        queryset = Ticket.objects.all()
        
        if user.organization:
            queryset = queryset.filter(property__organization=user.organization)
        else:
            return Ticket.objects.none()
        
        if status_params:
            queryset = queryset.filter(status__in=status_params)
        
        if priority:
            queryset = queryset.filter(priority=priority)
        
        if property_id:
            queryset = queryset.filter(property_id=property_id)
        
        if unit_id:
            queryset = queryset.filter(unit_id=unit_id)
        
        if tenant_id:
            queryset = queryset.filter(tenant_id=tenant_id)
            
        return queryset.order_by('-created_at')
    
    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Mark a ticket as resolved"""
        ticket = self.get_object()
        ticket.status = 'resolved'
        ticket.resolved_at = timezone.now()
        ticket.save()
        
        serializer = self.get_serializer(ticket)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_comment(self, request, pk=None):
        """Add a comment to a ticket"""
        ticket = self.get_object()
        
        serializer = TicketCommentSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(
                ticket=ticket,
                author_name=request.user.get_full_name() or request.user.username,
                is_owner=True
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class TicketCommentViewSet(viewsets.ModelViewSet):
    """ViewSet for viewing and editing TicketComment instances"""
    queryset = TicketComment.objects.all()
    serializer_class = TicketCommentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter comments to only show those for tickets in the user's organization"""
        user = self.request.user
        if user.is_superuser:
            return TicketComment.objects.all()
        
        # Filter by ticket if provided
        ticket_id = self.request.query_params.get('ticket', None)
        queryset = TicketComment.objects.all()
        
        if user.organization:
            queryset = queryset.filter(ticket__property__organization=user.organization)
        else:
            return TicketComment.objects.none()
        
        if ticket_id:
            queryset = queryset.filter(ticket_id=ticket_id)
            
        return queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        """Set author_name and is_owner when creating a comment"""
        serializer.save(
            author_name=self.request.user.get_full_name() or self.request.user.username,
            is_owner=True
        )
