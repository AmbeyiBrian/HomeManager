"""
Test cases to validate multi-tenant security implementation for RBAC.
These tests ensure that organizations are properly isolated from each other.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from organizations.models import Organization
from organizations.membership_models import OrganizationRole, OrganizationMembership

User = get_user_model()

class MultiTenantSecurityTestCase(TestCase):
    """Test cases for multi-tenant security in RBAC implementation."""

    def setUp(self):
        """Set up test data - create organizations, users, and roles"""
        # Create superuser for API operations
        self.superuser = User.objects.create_superuser(
            username='admin',
            email='admin@example.com',
            password='adminpassword'
        )
        
        # Create two separate organizations
        self.org1 = Organization.objects.create(name="Test Organization 1", slug="test-org-1")
        self.org2 = Organization.objects.create(name="Test Organization 2", slug="test-org-2")
        
        # Create users for each organization
        self.user1 = User.objects.create_user(
            username='user1',
            email='user1@example.com',
            password='password',
            organization=self.org1
        )
        self.user2 = User.objects.create_user(
            username='user2',
            email='user2@example.com',
            password='password',
            organization=self.org2
        )
        
        # Create roles in each organization with the same slug (unique per org)
        self.role1 = OrganizationRole.objects.create(
            name="Admin Role",
            slug="admin-role",
            organization=self.org1,
            role_type="admin",
            can_manage_users=True
        )
        self.role2 = OrganizationRole.objects.create(
            name="Admin Role", 
            slug="admin-role",  # Same slug, different org
            organization=self.org2,
            role_type="admin",
            can_manage_users=True
        )
        
        # Create memberships
        self.membership1 = OrganizationMembership.objects.create(
            user=self.user1,
            organization=self.org1,
            role=self.role1
        )
        self.membership2 = OrganizationMembership.objects.create(
            user=self.user2,
            organization=self.org2,
            role=self.role2
        )
        
        # API clients
        self.client_user1 = APIClient()
        self.client_user1.force_authenticate(user=self.user1)
        
        self.client_user2 = APIClient()
        self.client_user2.force_authenticate(user=self.user2)
        
        self.client_admin = APIClient()
        self.client_admin.force_authenticate(user=self.superuser)

    def test_role_isolation(self):
        """Test that users can only see and manage roles from their own organization."""
        # User1 should only see roles from org1
        response = self.client_user1.get('/api/organizations/roles/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        roles = response.data
        self.assertEqual(len(roles), 1, "User1 should only see one role")
        self.assertEqual(roles[0]['id'], self.role1.id, "User1 should only see roles from Org1")
        
        # User2 should only see roles from org2
        response = self.client_user2.get('/api/organizations/roles/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        roles = response.data
        self.assertEqual(len(roles), 1, "User2 should only see one role")
        self.assertEqual(roles[0]['id'], self.role2.id, "User2 should only see roles from Org2")
        
        # Admin should see all roles
        response = self.client_admin.get('/api/organizations/roles/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2, "Admin should see all roles")

    def test_cross_organization_role_access(self):
        """Test that users cannot access roles from other organizations."""
        # User1 cannot retrieve role2
        response = self.client_user1.get(f'/api/organizations/roles/{self.role2.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # User2 cannot retrieve role1
        response = self.client_user2.get(f'/api/organizations/roles/{self.role1.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_create_role_in_other_organization(self):
        """Test that users cannot create roles in other organizations."""
        # User1 tries to create role in org2
        response = self.client_user1.post('/api/organizations/roles/', {
            'name': 'Unauthorized Role',
            'slug': 'unauthorized-role',
            'role_type': 'member',
            'organization': self.org2.id,
            'can_manage_users': False
        })
        
        # Should fail with validation error
        self.assertNotEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify no role was created
        self.assertEqual(OrganizationRole.objects.filter(slug='unauthorized-role').count(), 0)

    def test_update_role_across_organization(self):
        """Test that users cannot update roles from other organizations."""
        # User1 tries to update a role from org2
        response = self.client_user1.put(f'/api/organizations/roles/{self.role2.id}/', {
            'name': 'Updated Role Name',
            'slug': 'admin-role',
            'role_type': 'admin'
        })
        
        # Should fail with 404 since the role is filtered out
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # Verify role2 was not updated
        self.role2.refresh_from_db()
        self.assertEqual(self.role2.name, "Admin Role")

    def test_cross_organization_role_assignment(self):
        """Test that users cannot assign roles from one org to users in another."""
        # Create a new user for org1
        new_user = User.objects.create_user(
            username='new_user',
            email='new_user@example.com',
            password='password',
            organization=self.org1
        )
        
        # User1 tries to create membership with role from org2
        response = self.client_user1.post('/api/organizations/memberships/', {
            'user': new_user.id,
            'organization': self.org1.id,
            'role': self.role2.id  # Role from org2
        })
        
        # Should fail with validation error
        self.assertIn(response.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_404_NOT_FOUND])
        
        # Verify no cross-organization membership was created
        self.assertEqual(
            OrganizationMembership.objects.filter(user=new_user, role=self.role2).count(), 
            0
        )

    def test_role_uniqueness_per_organization(self):
        """Test that the same role slug can exist in different organizations."""
        # Create a new role in org1 with the same slug as in org2
        new_role = OrganizationRole.objects.create(
            name="Another Admin Role",
            slug="another-admin-role",
            organization=self.org1,
            role_type="admin"
        )
        
        # Now create a role with the same slug in org2
        same_slug_role = OrganizationRole.objects.create(
            name="Another Admin Role",
            slug="another-admin-role", 
            organization=self.org2,
            role_type="admin"
        )
        
        self.assertNotEqual(new_role.id, same_slug_role.id)
        self.assertEqual(new_role.slug, same_slug_role.slug)
        
        # This should work because they're in different organizations
        self.assertEqual(OrganizationRole.objects.filter(slug="another-admin-role").count(), 2)
