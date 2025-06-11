#!/usr/bin/env python
"""
Complete test script to validate HomeManager organization API structure
Tests all organization-related endpoints and verifies data structures
"""
import os
import sys
import django
import json
import requests
from datetime import datetime

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'homemanager_backend'))

# Set Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'homemanager_backend.settings')

# Setup Django
django.setup()

# Now import Django models
from django.contrib.auth import get_user_model
from organizations.models import Organization, SubscriptionPlan
from organizations.membership_models import OrganizationRole, OrganizationMembership

User = get_user_model()

class OrganizationAPITester:
    def __init__(self, base_url='http://localhost:8000'):
        self.base_url = base_url
        self.access_token = None
        self.test_user = None
        self.test_org = None
        
    def setup_test_data(self):
        """Create test data if it doesn't exist"""
        print("Setting up test data...")
        
        # Create or get test user
        self.test_user, created = User.objects.get_or_create(
            email='test@example.com',
            defaults={
                'first_name': 'Test',
                'last_name': 'User',
                'is_active': True,
            }
        )
        if created:
            self.test_user.set_password('testpassword123')
            self.test_user.save()
            print(f"Created test user: {self.test_user.email}")
        else:
            print(f"Using existing test user: {self.test_user.email}")
        
        # Create or get test organization
        self.test_org, created = Organization.objects.get_or_create(
            name='Test Organization',
            defaults={
                'slug': 'test-organization',
                'description': 'Test organization for API testing',
                'email': 'contact@testorg.com',
                'phone': '+254712345678',
                'address': '123 Test Street, Nairobi',
                'primary_owner': self.test_user,
                'status': 'active',
            }
        )
        if created:
            print(f"Created test organization: {self.test_org.name}")
        else:
            print(f"Using existing test organization: {self.test_org.name}")
        
        # Link user to organization if not already linked
        if not self.test_user.organization:
            self.test_user.organization = self.test_org
            self.test_user.save()
            print("Linked test user to organization")
        
        print("Test data setup complete!")
        
    def get_auth_token(self):
        """Get JWT token for authentication"""
        print("Authenticating...")
        auth_url = f"{self.base_url}/api/auth/token/"
        
        auth_data = {
            'email': 'test@example.com',
            'password': 'testpassword123'
        }
        
        try:
            response = requests.post(auth_url, json=auth_data)
            if response.status_code == 200:
                tokens = response.json()
                self.access_token = tokens['access']
                print("Authentication successful!")
                return True
            else:
                print(f"Authentication failed: {response.status_code}")
                print(f"Response: {response.text}")
                return False
        except requests.exceptions.ConnectionError:
            print("Could not connect to Django server. Make sure it's running on localhost:8000")
            return False
        except Exception as e:
            print(f"Authentication error: {e}")
            return False
    
    def make_authenticated_request(self, method, url, **kwargs):
        """Make an authenticated API request"""
        headers = kwargs.pop('headers', {})
        headers['Authorization'] = f'Bearer {self.access_token}'
        headers['Content-Type'] = 'application/json'
        
        return requests.request(method, url, headers=headers, **kwargs)
    
    def test_current_user_endpoint(self):
        """Test the current user profile endpoint"""
        print("\n" + "="*50)
        print("TESTING CURRENT USER PROFILE")
        print("="*50)
        
        url = f"{self.base_url}/api/users/me/"
        response = self.make_authenticated_request('GET', url)
        
        if response.status_code == 200:
            user_data = response.json()
            print("✓ Current user endpoint working")
            print(f"User ID: {user_data.get('id')}")
            print(f"Email: {user_data.get('email')}")
            print(f"Organization ID: {user_data.get('organization')}")
            print(f"Full user data structure:")
            print(json.dumps(user_data, indent=2))
            return user_data
        else:
            print(f"✗ Current user endpoint failed: {response.status_code}")
            print(f"Response: {response.text}")
            return None
    
    def test_organizations_endpoint(self):
        """Test the organizations endpoint"""
        print("\n" + "="*50)
        print("TESTING ORGANIZATIONS ENDPOINT")
        print("="*50)
        
        # List organizations
        url = f"{self.base_url}/api/organizations/organizations/"
        response = self.make_authenticated_request('GET', url)
        
        if response.status_code == 200:
            orgs_data = response.json()
            print("✓ Organizations list endpoint working")
            print(f"Number of organizations: {len(orgs_data)}")
            
            if orgs_data:
                org = orgs_data[0]  # Get first organization
                print(f"\nFirst organization data structure:")
                print(json.dumps(org, indent=2))
                
                # Test single organization detail
                org_id = org['id']
                detail_url = f"{self.base_url}/api/organizations/organizations/{org_id}/"
                detail_response = self.make_authenticated_request('GET', detail_url)
                
                if detail_response.status_code == 200:
                    org_detail = detail_response.json()
                    print(f"\n✓ Organization detail endpoint working")
                    print(f"Organization detail data structure:")
                    print(json.dumps(org_detail, indent=2))
                    return org_detail
                else:
                    print(f"✗ Organization detail failed: {detail_response.status_code}")
            else:
                print("No organizations found")
        else:
            print(f"✗ Organizations endpoint failed: {response.status_code}")
            print(f"Response: {response.text}")
        
        return None
    
    def test_memberships_endpoint(self):
        """Test the organization memberships endpoint"""
        print("\n" + "="*50)
        print("TESTING MEMBERSHIPS ENDPOINT")
        print("="*50)
        
        url = f"{self.base_url}/api/organizations/memberships/"
        response = self.make_authenticated_request('GET', url)
        
        if response.status_code == 200:
            memberships_data = response.json()
            print("✓ Memberships endpoint working")
            print(f"Number of memberships: {len(memberships_data)}")
            
            if memberships_data:
                membership = memberships_data[0]
                print(f"\nFirst membership data structure:")
                print(json.dumps(membership, indent=2))
            else:
                print("No memberships found")
            
            return memberships_data
        else:
            print(f"✗ Memberships endpoint failed: {response.status_code}")
            print(f"Response: {response.text}")
            return None
    
    def test_roles_endpoint(self):
        """Test the organization roles endpoint"""
        print("\n" + "="*50)
        print("TESTING ROLES ENDPOINT")
        print("="*50)
        
        url = f"{self.base_url}/api/organizations/roles/"
        response = self.make_authenticated_request('GET', url)
        
        print(f"Response status: {response.status_code}")
        if response.status_code == 200:
            roles_data = response.json()
            print("✓ Roles endpoint working")
            print(f"Number of roles: {len(roles_data)}")
            
            if roles_data:
                role = roles_data[0]
                print(f"\nFirst role data structure:")
                print(json.dumps(role, indent=2))
            
            return roles_data
        elif response.status_code == 403:
            print("✓ Roles endpoint requires admin permissions (expected for non-admin users)")
            return []
        else:
            print(f"✗ Roles endpoint failed: {response.status_code}")
            print(f"Response: {response.text}")
            return None
    
    def test_subscriptions_endpoint(self):
        """Test the subscriptions endpoint"""
        print("\n" + "="*50)
        print("TESTING SUBSCRIPTIONS ENDPOINT")
        print("="*50)
        
        url = f"{self.base_url}/api/organizations/subscriptions/"
        response = self.make_authenticated_request('GET', url)
        
        if response.status_code == 200:
            subs_data = response.json()
            print("✓ Subscriptions endpoint working")
            print(f"Number of subscriptions: {len(subs_data)}")
            
            if subs_data:
                sub = subs_data[0]
                print(f"\nFirst subscription data structure:")
                print(json.dumps(sub, indent=2))
            
            return subs_data
        else:
            print(f"✗ Subscriptions endpoint failed: {response.status_code}")
            print(f"Response: {response.text}")
            return None
    
    def analyze_currentorg_structure(self, user_data, org_data, membership_data):
        """Analyze and document the currentOrg structure used in mobile app"""
        print("\n" + "="*50)
        print("ANALYZING currentOrg STRUCTURE")
        print("="*50)
        
        if not user_data or not org_data:
            print("Missing user or organization data for analysis")
            return
        
        # Build the currentOrg object as it would appear in the mobile app
        current_org = {
            # Core organization fields from organization API
            'id': org_data.get('id'),
            'name': org_data.get('name'),
            'slug': org_data.get('slug'),
            'description': org_data.get('description'),
            'email': org_data.get('email'),
            'phone': org_data.get('phone'),
            'address': org_data.get('address'),
            'website': org_data.get('website'),
            'logo': org_data.get('logo'),
            'status': org_data.get('status'),
            'primary_owner': org_data.get('primary_owner'),
            'subscription_status': org_data.get('subscription_status'),
            'trial_enabled': org_data.get('trial_enabled'),
            'subscription_plan': org_data.get('subscription_plan'),
            'plan_name': org_data.get('plan_name'),
            'created_at': org_data.get('created_at'),
            'updated_at': org_data.get('updated_at'),
            
            # User role and membership information
            'user_role': None,  # This would be derived from membership data
            'membership_status': None,  # This would be derived from membership data
        }
        
        # Add user role if membership data is available
        if membership_data:
            for membership in membership_data:
                if membership.get('user') == user_data.get('id'):
                    current_org['user_role'] = membership.get('role')
                    current_org['membership_status'] = 'active' if membership.get('is_active') else 'inactive'
                    current_org['joined_at'] = membership.get('joined_at')
                    break
        
        print("Reconstructed currentOrg structure:")
        print(json.dumps(current_org, indent=2))
        
        print("\nField Analysis:")
        print("-" * 30)
        for key, value in current_org.items():
            if value is not None:
                print(f"✓ {key}: {type(value).__name__}")
            else:
                print(f"✗ {key}: None (may not be available)")
        
        return current_org
    
    def run_all_tests(self):
        """Run all API tests"""
        print("HomeManager Organization API Test Suite")
        print("=" * 60)
        print(f"Testing against: {self.base_url}")
        print(f"Timestamp: {datetime.now().isoformat()}")
        
        # Setup test data
        self.setup_test_data()
        
        # Authenticate
        if not self.get_auth_token():
            print("Authentication failed. Cannot proceed with tests.")
            return False
        
        # Run tests
        user_data = self.test_current_user_endpoint()
        org_data = self.test_organizations_endpoint()
        membership_data = self.test_memberships_endpoint()
        roles_data = self.test_roles_endpoint()
        subscriptions_data = self.test_subscriptions_endpoint()
        
        # Analyze currentOrg structure
        if user_data and org_data:
            self.analyze_currentorg_structure(user_data, org_data, membership_data)
        
        print("\n" + "="*60)
        print("API TEST SUMMARY")
        print("="*60)
        print(f"✓ User profile endpoint: {'✓' if user_data else '✗'}")
        print(f"✓ Organizations endpoint: {'✓' if org_data else '✗'}")
        print(f"✓ Memberships endpoint: {'✓' if membership_data is not None else '✗'}")
        print(f"✓ Roles endpoint: {'✓' if roles_data is not None else '✗'}")
        print(f"✓ Subscriptions endpoint: {'✓' if subscriptions_data is not None else '✗'}")
        
        return True

def main():
    """Main function to run the tests"""
    # Check if Django server is running
    try:
        response = requests.get('http://localhost:8000/api/')
        print("Django server is running!")
    except requests.exceptions.ConnectionError:
        print("Django server is not running. Please start it with:")
        print("cd homemanager_backend && python manage.py runserver")
        return
    
    # Run tests
    tester = OrganizationAPITester()
    tester.run_all_tests()

if __name__ == '__main__':
    main()
