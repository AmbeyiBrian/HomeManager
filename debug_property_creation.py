#!/usr/bin/env python3
"""
Debug script to test property creation and identify the 400 error
"""

import requests
import json

# API Configuration
API_BASE_URL = "http://192.169.0.101:8000"  # Update this to match your mobile app config
API_PROPERTIES_URL = f"{API_BASE_URL}/api/properties/properties/"
API_LOGIN_URL = f"{API_BASE_URL}/api/auth/token/"

def test_property_creation():
    """Test property creation to identify the 400 error"""
    
    print("🔍 Testing Property Creation...")
    print(f"API Base URL: {API_BASE_URL}")
      # Step 1: Login to get token
    print("\n1. Logging in...")
    login_data = {
        "username": "owner_1",  # Replace with your test credentials
        "password": "1234"
    }
    
    try:
        login_response = requests.post(API_LOGIN_URL, json=login_data)
        print(f"Login Status: {login_response.status_code}")
        
        if login_response.status_code != 200:
            print(f"Login failed: {login_response.text}")
            return
            
        token = login_response.json().get('access')
        if not token:
            print("No access token received")
            return
            
        print("✅ Login successful")
        
    except Exception as e:
        print(f"❌ Login error: {e}")
        return
    
    # Step 2: Test property creation with different data formats
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Test 1: Basic JSON data (similar to mobile app without image)
    print("\n2. Testing JSON property creation...")
    json_data = {
        "name": "Test Property JSON",
        "address": "123 Test Street",
        "property_type": "residential",
        "description": "Test property for debugging"
    }
    
    try:
        response = requests.post(API_PROPERTIES_URL, json=json_data, headers=headers)
        print(f"JSON Creation Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 400:
            print("❌ 400 Error found!")
            error_data = response.json()
            print(f"Error details: {json.dumps(error_data, indent=2)}")
        elif response.status_code == 201:
            print("✅ JSON creation successful")
        
    except Exception as e:
        print(f"❌ JSON creation error: {e}")
    
    # Test 2: FormData (similar to mobile app with image)
    print("\n3. Testing FormData property creation...")
    
    # Simulate FormData similar to mobile app
    formdata_headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'multipart/form-data'
    }
    
    # Remove Content-Type to let requests handle it
    del formdata_headers['Content-Type']
    
    files_data = {
        'name': (None, 'Test Property FormData'),
        'address': (None, '456 FormData Street'),
        'property_type': (None, 'residential'),
        'description': (None, 'Test property with FormData'),
        'is_react_native': (None, 'true'),
        'device_platform': (None, 'android'),
    }
    
    try:
        response = requests.post(API_PROPERTIES_URL, files=files_data, headers=formdata_headers)
        print(f"FormData Creation Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 400:
            print("❌ 400 Error found!")
            error_data = response.json()
            print(f"Error details: {json.dumps(error_data, indent=2)}")
        elif response.status_code == 201:
            print("✅ FormData creation successful")
            
    except Exception as e:
        print(f"❌ FormData creation error: {e}")
    
    # Test 3: Check user organization status
    print("\n4. Checking user organization status...")
    user_url = f"{API_BASE_URL}/api/users/me/"
    
    try:
        user_response = requests.get(user_url, headers=headers)
        print(f"User Info Status: {user_response.status_code}")
        
        if user_response.status_code == 200:
            user_data = user_response.json()
            print(f"User organization: {user_data.get('organization')}")
            print(f"User ID: {user_data.get('id')}")
            print(f"Username: {user_data.get('username')}")
            
            if not user_data.get('organization'):
                print("⚠️  User has no organization assigned!")
                print("This might be causing the 400 error in property creation.")
        
    except Exception as e:
        print(f"❌ User info error: {e}")

if __name__ == "__main__":
    test_property_creation()
