from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from .models import Organization, SubscriptionPlan, Subscription, SubscriptionPayment
from .membership_models import OrganizationRole, OrganizationMembership
from .serializers import (
    OrganizationSerializer, 
    SubscriptionPlanSerializer,
    SubscriptionSerializer, 
    SubscriptionPaymentSerializer,
    OrganizationRoleSerializer,
    OrganizationMembershipSerializer
)
from .permissions import IsOrganizationOwnerOrAdmin

class OrganizationViewSet(viewsets.ModelViewSet):
    """ViewSet for viewing and editing Organization instances"""
    queryset = Organization.objects.all()
    serializer_class = OrganizationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        Filter organizations to only show the user's organization.
        Only global superusers without an organization get all organizations.
        """
        user = self.request.user
        if user.is_superuser and not user.organization:
            return Organization.objects.all()
        
        if user.organization:
            return Organization.objects.filter(id=user.organization.id)
        return Organization.objects.none()
    
    def perform_create(self, serializer):
        """Set the primary_owner field when creating a new organization"""
        organization = serializer.save(primary_owner=self.request.user)
        
        # Also update the user's organization field
        user = self.request.user
        user.organization = organization
        user.save()

class SubscriptionPlanViewSet(viewsets.ModelViewSet):
    """ViewSet for viewing and editing SubscriptionPlan instances"""
    queryset = SubscriptionPlan.objects.all()
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [permissions.IsAdminUser]
    
    def get_queryset(self):
        """Return active and public plans for non-admin users"""
        user = self.request.user
        if user.is_superuser or user.is_staff:
            return SubscriptionPlan.objects.all()
        return SubscriptionPlan.objects.filter(is_active=True, is_public=True)

class SubscriptionViewSet(viewsets.ModelViewSet):
    """ViewSet for viewing and editing Subscription instances"""
    queryset = Subscription.objects.all()
    serializer_class = SubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        Filter subscriptions to only show the user's organization subscriptions.
        Only global superusers without an organization get all subscriptions.
        """
        user = self.request.user
        if user.is_superuser and not user.organization:
            return Subscription.objects.all()
        
        if user.organization:
            return Subscription.objects.filter(organization=user.organization)
        return Subscription.objects.none()
    
    def perform_create(self, serializer):
        """Set organization when creating a new subscription"""
        if not self.request.user.is_superuser and 'organization' not in serializer.validated_data:
            serializer.save(organization=self.request.user.organization)
        else:
            serializer.save()

class SubscriptionPaymentViewSet(viewsets.ModelViewSet):
    """ViewSet for viewing and editing SubscriptionPayment instances"""
    queryset = SubscriptionPayment.objects.all()
    serializer_class = SubscriptionPaymentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        Filter payments to only show the user's organization payments.
        Only global superusers without an organization get all payments.
        """
        user = self.request.user
        if user.is_superuser and not user.organization:
            return SubscriptionPayment.objects.all()
        
        if user.organization:
            return SubscriptionPayment.objects.filter(organization=user.organization)
        return SubscriptionPayment.objects.none()

class OrganizationRoleViewSet(viewsets.ModelViewSet):
    """ViewSet for viewing and editing OrganizationRole instances"""
    queryset = OrganizationRole.objects.all()
    serializer_class = OrganizationRoleSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        Return all roles without organization filtering.
        Any authenticated user can access all roles.
        """
        return OrganizationRole.objects.all()
    def perform_create(self, serializer):
        """Create roles without organization restrictions"""
        serializer.save()
            
    def perform_update(self, serializer):
        """Update roles without organization restrictions"""
        serializer.save()

class OrganizationMembershipViewSet(viewsets.ModelViewSet):
    """ViewSet for viewing and editing OrganizationMembership instances"""
    # Define as empty queryset - will be filtered in get_queryset
    queryset = OrganizationMembership.objects.none()  
    serializer_class = OrganizationMembershipSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        Filter memberships to only show the user's organization memberships.
        Only global superusers without an organization get all memberships.
        """
        user = self.request.user
        if not user.is_authenticated:
            return OrganizationMembership.objects.none()
            
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"User {user.username} requesting memberships, is_superuser={user.is_superuser}")
        
        # Only allow true system admins (superusers without an organization) to see all memberships
        if user.is_superuser and not user.organization:
            logger.info(f"Global admin {user.username} gets all memberships")
            return OrganizationMembership.objects.all()
        
        if user.organization:
            logger.info(f"User {user.username} filtered to organization {user.organization.id}")
            # Make extra sure we're filtering properly
            filtered_memberships = OrganizationMembership.objects.filter(organization=user.organization)
            logger.info(f"Found {filtered_memberships.count()} memberships for user's organization")
            return filtered_memberships
        
        logger.warning(f"User {user.username} has no organization, returning empty queryset")
        return OrganizationMembership.objects.none()
    
    def get_object(self):
        """Override to ensure users can only access memberships from their organization"""
        obj = super().get_object()
        
        # Allow global superusers (without organization) to access any membership
        if self.request.user.is_superuser and not self.request.user.organization:
            return obj
            
        # For all other users (including superusers with an organization), check that 
        # the membership belongs to their organization
        if not self.request.user.organization or obj.organization != self.request.user.organization:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"User {self.request.user.username} attempted to access membership {obj.id} from another organization")
            from rest_framework.exceptions import NotFound
            raise NotFound("Membership not found")
            
        return obj
    
    def perform_create(self, serializer):
        """Ensure new memberships are associated with the user's organization"""
        # If organization is not provided in request data, use the user's organization
        if 'organization' not in self.request.data and not self.request.user.is_superuser:
            if self.request.user.organization:
                organization = self.request.user.organization
                serializer.save(organization=organization)
            else:
                raise ValidationError("User has no associated organization")
        else:
            # Make sure the provided organization matches the user's organization
            if not self.request.user.is_superuser and int(self.request.data.get('organization')) != self.request.user.organization.id:
                raise ValidationError("You can only create memberships for your organization")
            serializer.save()
        
        # Additional validation: ensure the role belongs to the same organization
        membership = serializer.instance
        if membership.role and hasattr(membership.role, 'organization') and membership.role.organization != membership.organization:
            # If role and membership organizations don't match, this is a security issue
            membership.delete()  # Clean up the invalid membership
            raise ValidationError("The role must belong to the same organization as the membership")
    
    @action(detail=True, methods=['post'])
    def send_invitation(self, request, pk=None):
        """Send an invitation to the membership"""
        membership = self.get_object()
        membership.send_invitation()
        return Response({'status': 'invitation sent'}, status=status.HTTP_200_OK)
