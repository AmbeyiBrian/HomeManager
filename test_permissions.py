import requests
import json
import os
import sys

# Configuration
API_BASE_URL = "http://localhost:8000"  # Change this if your server is running on a different URL/port

def login_user(username, password):
    """Login and get authentication token"""
    try:
        login_url = f"{API_BASE_URL}/api/users/token/"
        response = requests.post(login_url, json={
            "username": username,
            "password": password
        })
        
        response.raise_for_status()
        token_data = response.json()
        
        print(f"✓ Successfully logged in as {username}")
        return token_data["access"]
    except requests.exceptions.RequestException as e:
        print(f"✗ Login failed: {str(e)}")
        if response and response.text:
            try:
                print(json.dumps(response.json(), indent=4))
            except:
                print(response.text)
        return None

def test_role_permissions(token):
    """Test permissions for the roles endpoint"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Get list of roles
    try:
        response = requests.get(f"{API_BASE_URL}/api/organizations/roles/", headers=headers)
        response.raise_for_status()
        roles = response.json()
        print(f"✓ Successfully retrieved roles list: {len(roles['results'])} roles found")
        print(json.dumps(roles, indent=4))
        return roles
    except requests.exceptions.RequestException as e:
        print(f"✗ Failed to get roles: {str(e)}")
        if hasattr(e, 'response') and e.response and e.response.text:
            try:
                print(json.dumps(e.response.json(), indent=4))
            except:
                print(e.response.text)
        return None

def test_organization_membership(token):
    """Test the organization membership endpoint"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Get list of memberships
    try:
        response = requests.get(f"{API_BASE_URL}/api/organizations/memberships/", headers=headers)
        response.raise_for_status()
        memberships = response.json()
        print(f"✓ Successfully retrieved memberships list: {len(memberships['results'])} memberships found")
        
        # Print detailed membership info
        for m in memberships['results']:
            user_info = f"{m['user']['first_name']} {m['user']['last_name']} ({m['user']['email']})" \
                if isinstance(m['user'], dict) else f"User ID: {m['user']}"
                
            role_info = f"{m['role']['name']} (Type: {m['role']['role_type']})" \
                if isinstance(m['role'], dict) else f"Role ID: {m['role']}"
            
            print(f"Membership: {user_info} - {role_info}")
        
        print(json.dumps(memberships, indent=4))
        return memberships
    except requests.exceptions.RequestException as e:
        print(f"✗ Failed to get memberships: {str(e)}")
        if hasattr(e, 'response') and e.response and e.response.text:
            try:
                print(json.dumps(e.response.json(), indent=4))
            except:
                print(e.response.text)
        return None

def test_organization_detail(token):
    """Test the organization detail endpoint"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Get list of organizations (should only return the user's org)
    try:
        response = requests.get(f"{API_BASE_URL}/api/organizations/organizations/", headers=headers)
        response.raise_for_status()
        orgs = response.json()
        print(f"✓ Successfully retrieved organizations list: {len(orgs['results'])} organizations found")
        
        if len(orgs['results']) > 0:
            org = orgs['results'][0]
            owner_info = f"{org['primary_owner']['first_name']} {org['primary_owner']['last_name']} ({org['primary_owner']['email']})" \
                if isinstance(org['primary_owner'], dict) else f"Owner ID: {org['primary_owner']}"
                
            print(f"Organization: {org['name']} - Owner: {owner_info}")
            print(json.dumps(org, indent=4))
            return org
    except requests.exceptions.RequestException as e:
        print(f"✗ Failed to get organization: {str(e)}")
        if hasattr(e, 'response') and e.response and e.response.text:
            try:
                print(json.dumps(e.response.json(), indent=4))
            except:
                print(e.response.text)
        return None

def main():
    """Main function to run the tests"""
    if len(sys.argv) < 3:
        print("Usage: python test_permissions.py <username> <password>")
        return
    
    username = sys.argv[1]
    password = sys.argv[2]
    
    # Login and get token
    token = login_user(username, password)
    if not token:
        print("Cannot continue without authentication")
        return
        
    print("\n=== Testing Organization Details ===")
    organization = test_organization_detail(token)
    
    print("\n=== Testing Organization Memberships ===")
    memberships = test_organization_membership(token)
    
    print("\n=== Testing Organization Roles ===")
    roles = test_role_permissions(token)

if __name__ == "__main__":
    main()
