#!/usr/bin/env python3
"""
Test script to verify React Native FormData image upload fixes
Tests the property image update endpoint with multipart form data
"""

import requests
import json
import os
from pathlib import Path

# Backend configuration
BASE_URL = "http://10.5.4.88:8000"
API_URL = f"{BASE_URL}/api"

# Test credentials (should match a real user)
USERNAME = "owner_1"  # Change to your test username
PASSWORD = "1234"  # Change to your test password

def get_auth_token():
    """Get authentication token using JWT endpoint"""
    try:
        # Try JWT token endpoint first (doesn't require CSRF)
        response = requests.post(f"{API_URL}/auth/token/", json={
            "username": USERNAME,
            "password": PASSWORD
        })
        if response.status_code == 200:
            result = response.json()
            return result.get("access") or result.get("token")
        
        # If JWT fails, try the regular login endpoint with session
        session = requests.Session()
        
        # First get CSRF token
        csrf_response = session.get(f"{BASE_URL}/admin/login/")
        csrf_token = None
        
        if 'csrftoken' in session.cookies:
            csrf_token = session.cookies['csrftoken']
        
        # Try login with CSRF token
        login_data = {
            "username": USERNAME,
            "password": PASSWORD
        }
        
        if csrf_token:
            login_data['csrfmiddlewaretoken'] = csrf_token
        
        response = session.post(f"{API_URL}/auth/login/", data=login_data)
        
        if response.status_code == 200:
            result = response.json()
            return result.get("token")
        else:
            print(f"Login failed: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        print(f"Login error: {e}")
        return None

def create_test_property(token):
    """Create a test property for image upload testing"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Get organizations first
    try:
        response = requests.get(f"{API_URL}/organizations/organizations/", headers=headers)
        if response.status_code != 200:
            print(f"Failed to get organizations: {response.status_code} - {response.text}")
            return None
            
        organizations = response.json()
        if not organizations:
            print("No organizations found. Creating test organization...")
            # Create test organization
            org_data = {
                "name": "Test Organization",
                "address": "123 Test St",
                "phone": "555-0123"
            }
            org_response = requests.post(f"{API_URL}/organizations/organizations/", 
                                       headers=headers, json=org_data)
            if org_response.status_code == 201:
                org_id = org_response.json()["id"]
                print(f"✅ Created test organization with ID: {org_id}")
            else:
                print(f"Failed to create organization: {org_response.status_code} - {org_response.text}")
                return None
        else:
            org_id = organizations[0]["id"]
            print(f"✅ Using existing organization with ID: {org_id}")
    
    except Exception as e:
        print(f"Error handling organizations: {e}")
        return None
    
    # Create test property
    try:
        property_data = {
            "name": "Test Property for Image Upload",
            "address": "456 Test Ave",
            "property_type": "apartment",
            "description": "Test property for image upload testing",
            "organization": org_id
        }
        
        response = requests.post(f"{API_URL}/properties/properties/", 
                               headers=headers, json=property_data)
        if response.status_code == 201:
            property_id = response.json()["id"]
            print(f"✅ Created test property with ID: {property_id}")
            return property_id
        else:
            print(f"Failed to create property: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        print(f"Error creating property: {e}")
        return None

def test_property_image_upload(token):
    """Test property image upload via FormData"""
    headers = {
        "Authorization": f"Bearer {token}",
        # Don't set Content-Type - let requests handle multipart/form-data
    }
    
    # Use property ID 198 directly for testing
    property_id = 198
    print(f"✅ Using property ID: {property_id}")
    
    # Verify the property exists
    try:
        response = requests.get(f"{API_URL}/properties/properties/{property_id}/", headers=headers)
        if response.status_code == 200:
            property_data = response.json()
            print(f"✅ Property found: {property_data['name']}")
            print(f"Current image: {property_data.get('image', 'No image')}")
        else:
            print(f"❌ Property {property_id} not found: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error verifying property {property_id}: {e}")
        return False
    
    # Create a small test image file
    test_image_path = "test_image.jpg"
    try:
        # Create a minimal JPEG file (1x1 pixel)
        minimal_jpeg = bytes([
            0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
            0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
            0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
            0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
            0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
            0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
            0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
            0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x11, 0x08, 0x00, 0x01,
            0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
            0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0xFF, 0xC4,
            0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xDA, 0x00, 0x0C,
            0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3F, 0x00, 0xB2, 0xC0,
            0x07, 0xFF, 0xD9
        ])
        
        with open(test_image_path, 'wb') as f:
            f.write(minimal_jpeg)
        print(f"Created test image: {test_image_path}")
        
    except Exception as e:
        print(f"Error creating test image: {e}")
        return False
    
    # Test 1: Text-only update (should work)
    print("\n=== Test 1: Text-only property update ===")
    try:
        text_data = {
            "name": "Updated Property Name (Text Only)",
            "description": "Updated description via text-only API call"
        }
        
        response = requests.patch(
            f"{API_URL}/properties/properties/{property_id}/",
            headers=headers,
            json=text_data
        )
        
        if response.status_code == 200:
            print("✅ Text-only update successful")
            print(f"Response: {response.json()}")
        else:
            print(f"❌ Text-only update failed: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Text-only update error: {e}")
    
    # Test 2: FormData with image upload
    print("\n=== Test 2: FormData image upload ===")
    try:
        # Prepare FormData exactly like React Native would
        files = {
            'image': ('test_image.jpg', open(test_image_path, 'rb'), 'image/jpeg')
        }
        
        data = {
            'name': 'Updated Property Name (With Image)',
            'description': 'Updated description with image upload'
        }
        
        print("Sending multipart form data request...")
        print(f"URL: {API_URL}/properties/properties/{property_id}/")
        print(f"Data fields: {data}")
        print(f"File: test_image.jpg")
        
        response = requests.patch(
            f"{API_URL}/properties/properties/{property_id}/",
            headers=headers,
            data=data,
            files=files
        )
        
        if response.status_code == 200:
            print("✅ FormData image upload successful!")
            result = response.json()
            print(f"Response: {result}")
            if 'image' in result and result['image']:
                print(f"✅ Image URL: {result['image']}")
            else:
                print("⚠️  No image URL in response")
        else:
            print(f"❌ FormData image upload failed: {response.status_code}")
            print(f"Response text: {response.text}")
            
    except Exception as e:
        print(f"❌ FormData image upload error: {e}")
    finally:
        # Clean up test file
        try:
            if os.path.exists(test_image_path):
                os.remove(test_image_path)
                print(f"Cleaned up test image: {test_image_path}")
        except:
            pass
    
    # Test 3: Simulate React Native FormData format
    print("\n=== Test 3: React Native FormData simulation ===")
    try:
        # Recreate test image
        with open(test_image_path, 'wb') as f:
            f.write(minimal_jpeg)
        
        # This simulates what React Native FormData sends
        # Note: In actual React Native, the format might be slightly different
        boundary = "----formdata-react-native-123456789"
        
        # Construct multipart body manually to simulate React Native
        body_parts = []
        
        # Add text fields
        body_parts.append(f'--{boundary}')
        body_parts.append('Content-Disposition: form-data; name="name"')
        body_parts.append('')
        body_parts.append('React Native Test Property')
        
        body_parts.append(f'--{boundary}')
        body_parts.append('Content-Disposition: form-data; name="description"')
        body_parts.append('')
        body_parts.append('Updated via React Native FormData simulation')
        
        # Add image file
        body_parts.append(f'--{boundary}')
        body_parts.append('Content-Disposition: form-data; name="image"; filename="test_image.jpg"')
        body_parts.append('Content-Type: image/jpeg')
        body_parts.append('')
        
        # Read image data
        with open(test_image_path, 'rb') as f:
            image_data = f.read()
        
        # Construct the body
        text_body = '\r\n'.join(body_parts) + '\r\n'
        end_boundary = f'\r\n--{boundary}--\r\n'
        
        body = text_body.encode('utf-8') + image_data + end_boundary.encode('utf-8')
        
        headers_with_content_type = headers.copy()
        headers_with_content_type['Content-Type'] = f'multipart/form-data; boundary={boundary}'
        
        print("Sending React Native style multipart request...")
        
        response = requests.patch(
            f"{API_URL}/properties/properties/{property_id}/",
            headers=headers_with_content_type,
            data=body
        )
        
        if response.status_code == 200:
            print("✅ React Native FormData simulation successful!")
            result = response.json()
            print(f"Response: {result}")
        else:
            print(f"❌ React Native FormData simulation failed: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ React Native FormData simulation error: {e}")
    finally:
        # Clean up
        try:
            if os.path.exists(test_image_path):
                os.remove(test_image_path)
        except:
            pass
    
    return True

def main():
    print("Testing React Native FormData image upload fixes...")
    print(f"Backend URL: {BASE_URL}")
    
    # Get auth token
    token = get_auth_token()
    if not token:
        print("❌ Failed to get authentication token")
        return
    
    print(f"✅ Authentication successful")
    
    # Test image upload
    test_property_image_upload(token)
    
    print("\n=== Test Summary ===")
    print("If Test 1 (text-only) works but Tests 2-3 (FormData) fail,")
    print("the issue is with multipart form data handling.")
    print("If all tests work, the React Native FormData implementation should work.")

if __name__ == "__main__":
    main()
