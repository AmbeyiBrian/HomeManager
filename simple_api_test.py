#!/usr/bin/env python3
"""
Simple test to verify the /api/users/my-organization/ endpoint
"""

import os
import sys
import django
import json

# Add the backend directory to Python path
backend_path = os.path.join(os.path.dirname(__file__), 'homemanager_backend')
sys.path.insert(0, backend_path)

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'homemanager_backend.settings')
django.setup()

# Now import Django models
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

def test_my_organization_endpoint():
    """Test the my-organization endpoint"""
    
    try:
        # Find the specific user with username 'owner_1'
        user = User.objects.get(username='owner_1')
        print(f"Found user: {user.username} (email: {user.email})")
        print(f"User organization: {user.organization}")
        
        if not user.organization:
            print("❌ User has no organization assigned!")
            return
            
        # Create API client and authenticate
        client = APIClient()
        
        # Get JWT access token for the user
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        
        # Set authentication header
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        
        print("\n" + "="*60)
        print("TESTING /api/users/my-organization/ ENDPOINT")
        print("="*60)
        
        # Test the my-organization endpoint
        response = client.get('/api/users/my-organization/')
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ SUCCESS! Response:")
            print(json.dumps(data, indent=2, default=str))
            
            if 'results' in data and len(data['results']) > 0:
                org_data = data['results'][0]
                print(f"\n✅ Organization found: {org_data.get('name', 'Unknown')}")
                print(f"Organization ID: {org_data.get('id', 'Unknown')}")
                print(f"Available fields: {list(org_data.keys())}")
            else:
                print("⚠️  No organization data in results")
        else:
            print(f"❌ FAILED! Response: {response.content}")
            
    except User.DoesNotExist:
        print("❌ User 'owner_1' not found in database")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("Testing /api/users/my-organization/ endpoint")
    print("=" * 50)
    test_my_organization_endpoint()
