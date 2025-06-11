#!/usr/bin/env python
"""
Test script for validating multi-tenant security in RBAC implementation.
This script verifies that roles are properly restricted to organizations.
"""
import os
import sys
import json
import requests

API_URL = 'http://localhost:8000/api'
ACCESS_TOKEN = None

def setup():
    """Set up test data - create organizations, users, and roles"""
    print("Setting up test data...")
    
    # Login with superuser
    global ACCESS_TOKEN
    response = requests.post(f"{API_URL}/users/login/", json={
        "username": "admin",
        "password": "adminpassword"
    })
    
    if response.status_code == 200:
        ACCESS_TOKEN = response.json().get('token')
        print(f"Logged in as admin. Token: {ACCESS_TOKEN[:10]}...")
    else:
        print(f"Failed to log in: {response.text}")
        sys.exit(1)
    
    # Create two test organizations
    org1 = create_organization("TestOrg1")
    org2 = create_organization("TestOrg2")
    
    # Create users for each org
    user1 = create_user("user1", "password123", org1['id'])
    user2 = create_user("user2", "password123", org2['id'])
    
    # Create roles in each org
    role1 = create_role("Admin Role", "admin-role", org1['id'])
    role2 = create_role("Admin Role", "admin-role", org2['id'])  # Same slug, different org
    
    return {
        'org1': org1,
        'org2': org2,
        'user1': user1,
        'user2': user2,
        'role1': role1,
        'role2': role2
    }

def create_organization(name):
    """Create a test organization"""
    headers = {'Authorization': f'Token {ACCESS_TOKEN}'}
    response = requests.post(f"{API_URL}/organizations/", 
        json={"name": name, "slug": name.lower()},
        headers=headers
    )
    
    if response.status_code in (201, 200):
        print(f"Created organization: {name}")
        return response.json()
    else:
        print(f"Failed to create organization: {response.text}")
        return None

def create_user(username, password, org_id):
    """Create a test user in the specified organization"""
    headers = {'Authorization': f'Token {ACCESS_TOKEN}'}
    response = requests.post(f"{API_URL}/users/", 
        json={
            "username": username,
            "password": password,
            "email": f"{username}@example.com",
            "organization": org_id
        },
        headers=headers
    )
    
    if response.status_code in (201, 200):
        print(f"Created user: {username}")
        return response.json()
    else:
        print(f"Failed to create user: {response.text}")
        return None

def create_role(name, slug, org_id):
    """Create a test role in the specified organization"""
    headers = {'Authorization': f'Token {ACCESS_TOKEN}'}
    response = requests.post(f"{API_URL}/organizations/roles/", 
        json={
            "name": name,
            "slug": slug,
            "role_type": "admin",
            "organization": org_id,
            "can_manage_users": True
        },
        headers=headers
    )
    
    if response.status_code in (201, 200):
        print(f"Created role: {name} in org {org_id}")
        return response.json()
    else:
        print(f"Failed to create role: {response.text}")
        return None

def test_roles_isolation():
    """Test that users can only see and manage roles from their own organization"""
    test_data = setup()
    
    # Login as user1
    response = requests.post(f"{API_URL}/users/login/", json={
        "username": "user1",
        "password": "password123"
    })
    
    if response.status_code == 200:
        user1_token = response.json().get('token')
        print(f"Logged in as user1")
    else:
        print(f"Failed to log in as user1: {response.text}")
        return False
    
    # User1 should only see roles from org1
    headers = {'Authorization': f'Token {user1_token}'}
    response = requests.get(f"{API_URL}/organizations/roles/", headers=headers)
    
    if response.status_code == 200:
        roles = response.json()
        print(f"User1 sees {len(roles)} roles")
        
        # Verify all roles belong to org1
        for role in roles:
            if role['organization'] != test_data['org1']['id']:
                print(f"ERROR: User1 can see role from another organization: {role}")
                return False
        
        print("✅ User1 can only see roles from their organization")
    else:
        print(f"Failed to get roles: {response.text}")
        return False
    
    # Try to create a role in org2 (should fail)
    response = requests.post(f"{API_URL}/organizations/roles/", 
        json={
            "name": "Unauthorized Role",
            "slug": "unauthorized-role",
            "role_type": "admin",
            "organization": test_data['org2']['id'],
            "can_manage_users": True
        },
        headers=headers
    )
    
    if response.status_code >= 400:
        print("✅ User1 cannot create a role in organization 2")
    else:
        print(f"FAIL: User1 was able to create a role in another organization")
        return False
    
    # Try to update a role from org2 (should fail)
    response = requests.put(f"{API_URL}/organizations/roles/{test_data['role2']['id']}/", 
        json={
            "name": "Updated Role",
        },
        headers=headers
    )
    
    if response.status_code >= 400:
        print("✅ User1 cannot update a role from organization 2")
    else:
        print(f"FAIL: User1 was able to update a role from another organization")
        return False
    
    return True

if __name__ == "__main__":
    try:
        if test_roles_isolation():
            print("\nSUCCESS: Multi-tenant security is working correctly")
        else:
            print("\nFAIL: Multi-tenant security check failed")
    except Exception as e:
        print(f"Error during testing: {e}")
