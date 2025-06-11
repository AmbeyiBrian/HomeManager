from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from .serializers import UserSerializer, UserCreateSerializer

User = get_user_model()

class UserViewSet(viewsets.ModelViewSet):
    """ViewSet for viewing and editing User instances"""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        Filter queryset based on user's organization
        Only admins can see all users across all organizations
        """
        user = self.request.user
        if user.is_superuser:
            return User.objects.all()
        
        # Regular users can only see users in their organization
        if user.organization:
            return User.objects.filter(organization=user.organization)
        return User.objects.none()
    
    def get_serializer_class(self):
        """Use different serializers for different actions"""
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer
    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user's profile"""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def my_organization(self, request):
        """Get current user's organization"""
        user = request.user
        if user.organization:
            from organizations.serializers import OrganizationSerializer
            serializer = OrganizationSerializer(user.organization, context={'request': request})
            return Response({'results': [serializer.data]})
        return Response({'results': []})
    
    @action(detail=True, methods=['post'])
    def set_password(self, request, pk=None):
        """Change a user's password"""
        user = self.get_object()
        
        if not request.user.is_superuser and request.user.id != user.id:
            return Response({'error': 'You do not have permission to change this password.'},
                           status=status.HTTP_403_FORBIDDEN)
        
        serializer = self.get_serializer(data=request.data)
        if 'current_password' not in request.data and request.user.id == user.id:
            return Response({'error': 'Current password is required.'},
                           status=status.HTTP_400_BAD_REQUEST)
            
        if request.user.id == user.id and not user.check_password(request.data.get('current_password', '')):
            return Response({'error': 'Current password is incorrect.'},
                           status=status.HTTP_400_BAD_REQUEST)
            
        if 'password' not in request.data or 'password_confirm' not in request.data:
            return Response({'error': 'New password and confirmation are required.'},
                          status=status.HTTP_400_BAD_REQUEST)
            
        if request.data['password'] != request.data['password_confirm']:
            return Response({'error': 'Passwords do not match.'},
                          status=status.HTTP_400_BAD_REQUEST)
            
        user.set_password(request.data['password'])
        user.save()
        return Response({'status': 'password set'}, status=status.HTTP_200_OK)
