import json
import requests
import sys

def test_api_with_curl():
    """Test the API using a curl-like request to simulate the frontend behavior"""
    # You should replace these with an actual token from a logged-in user
    api_url = "http://localhost:8000/api/users/invite-team-member/"
    
    # Test with various role formats
    test_cases = [
        {
            "name": "String role name (lowercase)",
            "data": {
                "email": "test_user1@example.com",
                "first_name": "Test1",
                "last_name": "User",
                "phone_number": "1234567890",
                "role": "manager"  # String role name
            }
        },
        {
            "name": "String role name (capitalized)",
            "data": {
                "email": "test_user2@example.com",
                "first_name": "Test2", 
                "last_name": "User",
                "phone_number": "1234567890",
                "role": "Manager"  # String role name with capital
            }
        },
        {
            "name": "Full role name",
            "data": {
                "email": "test_user3@example.com",
                "first_name": "Test3",
                "last_name": "User",
                "phone_number": "1234567890",
                "role": "Property Manager"  # Full role name
            }
        },
        {
            "name": "Numeric role ID",
            "data": {
                "email": "test_user4@example.com",
                "first_name": "Test4",
                "last_name": "User",
                "phone_number": "1234567890",
                "role": "2"  # Numeric ID as string for Property Manager
            }
        }
    ]
    
    # Add your actual token here from the browser
    token = input("Enter your JWT token from the browser: ")
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    for test in test_cases:
        print(f"\n\nTesting: {test['name']}")
        print(f"Sending data: {json.dumps(test['data'], indent=2)}")
        
        try:
            response = requests.post(
                api_url,
                headers=headers,
                data=json.dumps(test['data'])
            )
            
            print(f"Response status: {response.status_code}")
            print(f"Response body: {response.text}")
            
            if response.status_code >= 200 and response.status_code < 300:
                print("✅ SUCCESS: Role format was accepted!")
            else:
                print("❌ FAILURE: Role format was rejected")
                
        except Exception as e:
            print(f"Error during request: {e}")

if __name__ == "__main__":
    test_api_with_curl()
