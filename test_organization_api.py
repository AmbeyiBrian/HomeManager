#!/usr/bin/env python3
"""
Test script to verify the actual data structure returned by the organization API endpoints.
This will help us confirm our assumptions about the currentOrg object structure.
"""

import os
import sys
import django
import json
from django.test import Client
from django.contrib.auth import get_user_model
from django.urls import reverse

# Add the backend directory to Python path
backend_path = os.path.join(os.path.dirname(__file__), 'homemanager_backend')
sys.path.insert(0, backend_path)

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'homemanager_backend.settings')
django.setup()

# Now import Django models
from organizations.models import Organization
from organizations.membership_models import OrganizationMembership, OrganizationRole
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

def get_existing_test_data():
    """Get existing user and organization data for testing"""
    print("Looking for existing data...")
      # Find the specific user with username 'owner_1'
    try:
        user = User.objects.get(username='owner_1')
        print(f"Found user: {user.username} (email: {user.email})")
    except User.DoesNotExist:
        raise Exception("User 'owner_1' not found in database. Please ensure the user exists.")
    
    # Find organizations this user is a member of
    memberships = OrganizationMembership.objects.filter(user=user, is_active=True)
    if memberships.exists():
        org = memberships.first().organization
        print(f"Found organization through membership: {org.name} (ID: {org.id})")
    else:
        # If no memberships found, try to find any organization
        org = Organization.objects.first()
        if not org:
            raise Exception("No organizations found in database. Please create at least one organization first.")
        print(f"Using first available organization: {org.name} (ID: {org.id})")
    
    print(f"Using user: {user.username} ({user.email})")
    print(f"Using organization: {org.name} (ID: {org.id})")
    
    return user, org

def test_organization_api_endpoints():
    """Test the organization API endpoints and print the actual data structure"""
    
    # Use existing test data
    user, org = get_existing_test_data()    # Create API client and authenticate
    client = APIClient()
    # Get JWT access token for the user
    refresh = RefreshToken.for_user(user)
    access_token = str(refresh.access_token)
    
    # Set authentication header
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
    
    # For organization-scoped endpoints, set the org header  
    client.credentials(HTTP_X_ORGANIZATION_ID=str(org.id))
    
    print("\n" + "="*80)
    print("TESTING ORGANIZATION API ENDPOINTS")
    print("="*80)
    
    # Test 1: List organizations endpoint
    print("\n1. Testing /api/organizations/ endpoint...")
    response = client.get('/api/organizations/')
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print("Response structure:")
        print(json.dumps(data, indent=2, default=str))
        
        if 'results' in data and len(data['results']) > 0:
            org_data = data['results'][0]
            print("\nFirst organization object keys:")
            print(list(org_data.keys()))
            
            print("\nDetailed organization structure:")
            for key, value in org_data.items():
                print(f"  {key}: {type(value).__name__} = {value}")
    else:
        print(f"Error: {response.content}")
    
    # Test 2: Organization detail endpoint
    print(f"\n2. Testing /api/organizations/{org.id}/ endpoint...")
    response = client.get(f'/api/organizations/{org.id}/')
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print("Organization detail response:")
        print(json.dumps(data, indent=2, default=str))
    else:
        print(f"Error: {response.content}")
    
    # Test 3: Organization memberships endpoint
    print(f"\n3. Testing /api/organizations/{org.id}/memberships/ endpoint...")
    response = client.get(f'/api/organizations/{org.id}/memberships/')
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print("Memberships response:")
        print(json.dumps(data, indent=2, default=str))
        
        if 'results' in data and len(data['results']) > 0:
            membership_data = data['results'][0]
            print("\nFirst membership object keys:")
            print(list(membership_data.keys()))
    else:
        print(f"Error: {response.content}")
    
    # Test 4: Organization roles endpoint
    print(f"\n4. Testing /api/organizations/organizations/{org.id}/roles/ endpoint...")
    response = client.get(f'/api/organizations/{org.id}/roles/')
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print("Roles response:")
        print(json.dumps(data, indent=2, default=str))
        
        if 'results' in data and len(data['results']) > 0:
            role_data = data['results'][0]
            print("\nFirst role object keys:")
            print(list(role_data.keys()))
    else:
        print(f"Error: {response.content}")
      # Test 5: My organization endpoint (what the mobile app actually calls)
    print("\n5. Testing /api/users/my-organization/ endpoint...")
    response = client.get('/api/users/my-organization/')
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print("My organization response:")
        print(json.dumps(data, indent=2, default=str))
        
        if 'results' in data and len(data['results']) > 0:
            org_data = data['results'][0]
            print("\nMy organization object keys:")
            print(list(org_data.keys()))
            
            print("\nChecking for user_role and membership data:")
            print(f"  user_role exists: {'user_role' in org_data}")
            print(f"  user_role value: {org_data.get('user_role', 'NOT FOUND')}")
            print(f"  memberships exists: {'memberships' in org_data}")
            print(f"  user_membership exists: {'user_membership' in org_data}")
            
            if 'memberships' in org_data:
                print(f"  memberships type: {type(org_data['memberships'])}")
                print(f"  memberships content: {org_data['memberships']}")
            if 'user_membership' in org_data:
                print(f"  user_membership type: {type(org_data['user_membership'])}")
                print(f"  user_membership content: {org_data['user_membership']}")
    else:
        print(f"Error: {response.content}")
    
    print("\n" + "="*80)
    print("API TESTING COMPLETED")
    print("="*80)

def analyze_serializer_code():
    """Analyze the actual serializer code to understand the data structure"""
    print("\n" + "="*80)
    print("ANALYZING SERIALIZER CODE")
    print("="*80)
    
    try:
        from organizations.serializers import OrganizationSerializer, OrganizationMembershipSerializer
        
        print("\n1. OrganizationSerializer fields:")
        if hasattr(OrganizationSerializer, 'Meta'):
            if hasattr(OrganizationSerializer.Meta, 'fields'):
                print(f"   Fields: {OrganizationSerializer.Meta.fields}")
        
        print("\n2. OrganizationMembershipSerializer fields:")
        if hasattr(OrganizationMembershipSerializer, 'Meta'):
            if hasattr(OrganizationMembershipSerializer.Meta, 'fields'):
                print(f"   Fields: {OrganizationMembershipSerializer.Meta.fields}")
        
        # Check if there are any custom methods or properties
        print("\n3. Custom methods in OrganizationSerializer:")
        for attr in dir(OrganizationSerializer):
            if not attr.startswith('_') and callable(getattr(OrganizationSerializer, attr)):
                method = getattr(OrganizationSerializer, attr)
                if hasattr(method, '__name__') and not method.__name__.startswith('_'):
                    print(f"   {attr}")
        
    except ImportError as e:
        print(f"Could not import serializers: {e}")

if __name__ == "__main__":
    print("HomeManager Organization API Test")
    print("=" * 40)
    
    try:
        # Analyze serializer code first
        analyze_serializer_code()
        
        # Test API endpoints
        test_organization_api_endpoints()
        
    except Exception as e:
        print(f"Error during testing: {e}")
        import traceback
        traceback.print_exc()
