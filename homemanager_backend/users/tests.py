from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from .models import User
from organizations.models import Organization

class UserModelTests(TestCase):
    def setUp(self):
        self.organization = Organization.objects.create(
            name='Test Organization',
            email='test@example.com'
        )
        
        self.user = User.objects.create_user(
            username='testuser',
            email='testuser@example.com',
            password='securepassword',
            organization=self.organization
        )
        
    def test_user_creation(self):
        """Test user creation with organization"""
        self.assertEqual(self.user.username, 'testuser')
        self.assertEqual(self.user.email, 'testuser@example.com')
        self.assertEqual(self.user.organization, self.organization)
        self.assertTrue(self.user.is_property_owner)
        self.assertFalse(self.user.is_tenant)
    
    def test_get_organization(self):
        """Test get_organization method"""
        self.assertEqual(self.user.get_organization(), self.organization)
    
    def test_get_organizations(self):
        """Test get_organizations method"""
        organizations = self.user.get_organizations()
        self.assertEqual(len(organizations), 1)
        self.assertEqual(organizations[0], self.organization)


class UserAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.organization = Organization.objects.create(
            name='Test Organization',
            email='test@example.com'
        )
        
        self.admin_user = User.objects.create_user(
            username='adminuser',
            email='admin@example.com',
            password='securepassword',
            organization=self.organization,
            is_staff=True
        )
        
        self.regular_user = User.objects.create_user(
            username='regularuser',
            email='regular@example.com',
            password='securepassword',
            organization=self.organization
        )
        
    def test_user_list_authenticated(self):
        """Authenticated users can access user list API"""
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('user-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)  # 2 users
    
    def test_user_list_unauthenticated(self):
        """Unauthenticated users cannot access user list API"""
        url = reverse('user-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_user_detail(self):
        """Users can access their own user detail"""
        self.client.force_authenticate(user=self.regular_user)
        url = reverse('user-detail', kwargs={'pk': self.regular_user.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'regularuser')
        
    def test_me_endpoint(self):
        """Test the 'me' endpoint returns the current user"""
        self.client.force_authenticate(user=self.regular_user)
        url = reverse('user-me')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'regularuser')
        self.assertEqual(response.data['email'], 'regular@example.com')
