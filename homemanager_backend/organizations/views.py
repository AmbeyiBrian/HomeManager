from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, NotFound
from django.shortcuts import get_object_or_404
from .models import Organization, SubscriptionPlan, Subscription, SubscriptionPayment, BaseRole, OrganizationRoleCustomization
from .membership_models import OrganizationRole, OrganizationMembership
from .serializers import (
    OrganizationSerializer, 
    SubscriptionPlanSerializer,
    SubscriptionSerializer, 
    SubscriptionPaymentSerializer,
    OrganizationRoleSerializer,
    OrganizationMembershipSerializer,
    BaseRoleSerializer,
    OrganizationRoleCustomizationSerializer
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
        Filter roles to only show those from the user's organization.
        Only global superusers without an organization get all roles.
        """
        user = self.request.user
        if user.is_superuser and not user.organization:
            return OrganizationRole.objects.all()
        
        if user.organization:
            return OrganizationRole.objects.filter(organization=user.organization)
        return OrganizationRole.objects.none()
    
    def perform_create(self, serializer):
        """Set organization when creating a new role"""
        if not self.request.user.is_superuser and 'organization' not in serializer.validated_data:
            serializer.save(organization=self.request.user.organization)
        else:
            serializer.save()
    def perform_update(self, serializer):
        """Ensure users can only update roles from their organization"""
        obj = self.get_object()
        if not self.request.user.is_superuser and obj.organization != self.request.user.organization:
            raise ValidationError("You can only update roles for your organization")
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

class BaseRoleViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing BaseRole instances (read-only)"""
    queryset = BaseRole.objects.all()
    serializer_class = BaseRoleSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return all base roles - they are system-wide"""
        return BaseRole.objects.all().order_by('name')

class OrganizationRoleCustomizationViewSet(viewsets.ModelViewSet):
    """ViewSet for managing organization-specific role customizations"""
    queryset = OrganizationRoleCustomization.objects.all()
    serializer_class = OrganizationRoleCustomizationSerializer
    permission_classes = [permissions.IsAuthenticated, IsOrganizationOwnerOrAdmin]
    
    def get_queryset(self):
        """Filter customizations to current user's organization"""
        user = self.request.user
        if user.is_superuser and not user.organization:
            return OrganizationRoleCustomization.objects.all()
        
        if user.organization:
            return OrganizationRoleCustomization.objects.filter(organization=user.organization)
        return OrganizationRoleCustomization.objects.none()
    
    def perform_create(self, serializer):
        """Ensure customization is created for the user's organization"""
        if not self.request.user.is_superuser:
            if not self.request.user.organization:
                raise ValidationError("User has no associated organization")
            serializer.save(organization=self.request.user.organization)
        else:
            serializer.save()
    
    def perform_update(self, serializer):
        """Ensure users can only update their organization's customizations"""
        obj = self.get_object()
        if not self.request.user.is_superuser and obj.organization != self.request.user.organization:
            raise ValidationError("You can only update your organization's role customizations")
        serializer.save()
    
    @action(detail=False, methods=['get'])
    def available_roles(self, request):
        """Get all base roles with their current customization status"""
        user = request.user
        if not user.organization:
            return Response({'error': 'User has no associated organization'}, status=400)
        
        base_roles = BaseRole.objects.all()
        result = []
        
        for base_role in base_roles:
            # Check if there's a customization for this role
            try:
                customization = OrganizationRoleCustomization.objects.get(
                    organization=user.organization,
                    base_role=base_role
                )
                customization_data = OrganizationRoleCustomizationSerializer(customization).data
            except OrganizationRoleCustomization.DoesNotExist:
                customization_data = None
            
            # Get the organization role instance
            try:
                org_role = OrganizationRole.objects.get(
                    organization=user.organization,
                    base_role=base_role
                )
                role_data = OrganizationRoleSerializer(org_role).data
            except OrganizationRole.DoesNotExist:
                # Create organization role if it doesn't exist
                org_role = OrganizationRole.objects.create(
                    organization=user.organization,
                    base_role=base_role
                )
                role_data = OrganizationRoleSerializer(org_role).data
            
            result.append({
                'base_role': BaseRoleSerializer(base_role).data,
                'organization_role': role_data,
                'customization': customization_data,
                'is_customized': customization_data is not None
            })
        
        return Response(result)
    
    @action(detail=False, methods=['post'])
    def customize_role(self, request):
        """Create or update a role customization"""
        user = request.user
        if not user.organization:
            return Response({'error': 'User has no associated organization'}, status=400)
        
        base_role_id = request.data.get('base_role')
        if not base_role_id:
            return Response({'error': 'base_role is required'}, status=400)
        
        try:
            base_role = BaseRole.objects.get(id=base_role_id)
        except BaseRole.DoesNotExist:
            return Response({'error': 'Base role not found'}, status=404)
        
        # Get or create customization
        customization, created = OrganizationRoleCustomization.objects.get_or_create(
            organization=user.organization,
            base_role=base_role
        )
        
        # Update with provided permissions
        serializer = OrganizationRoleCustomizationSerializer(
            customization, 
            data=request.data, 
            partial=True
        )
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201 if created else 200)
        
        return Response(serializer.errors, status=400)
    
    @action(detail=False, methods=['delete'])
    def reset_role(self, request):
        """Reset a role to its default permissions by deleting customization"""
        user = request.user
        if not user.organization:
            return Response({'error': 'User has no associated organization'}, status=400)
        
        base_role_id = request.data.get('base_role') or request.query_params.get('base_role')
        if not base_role_id:
            return Response({'error': 'base_role is required'}, status=400)
        
        try:
            base_role = BaseRole.objects.get(id=base_role_id)
        except BaseRole.DoesNotExist:
            return Response({'error': 'Base role not found'}, status=404)
        
        try:
            customization = OrganizationRoleCustomization.objects.get(
                organization=user.organization,
                base_role=base_role
            )
            customization.delete()
            return Response({'message': 'Role permissions reset to defaults'}, status=200)
        except OrganizationRoleCustomization.DoesNotExist:
            return Response({'message': 'Role was already using default permissions'}, status=200)
