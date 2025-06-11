#!/usr/bin/env python
"""
Simple test script for QR code endpoints
Run this script to test if the QR code endpoints are working correctly
"""
import os
import sys
import requests
import json
from pprint import pprint

# Get the token from environment or prompt
token = os.environ.get('HOME_MANAGER_TOKEN')
if not token:
    token = input("Enter your HomeManager auth token: ")

BASE_URL = "http://localhost:8000/api"

def test_bulk_qr_codes(unit_ids):
    """Test the bulk QR codes endpoint"""
    url = f"{BASE_URL}/properties/qr-codes/bulk/?units={','.join(map(str, unit_ids))}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    print(f"Testing bulk QR codes endpoint: {url}")
    response = requests.get(url, headers=headers)
    
    print(f"Status code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Successfully retrieved {len(data)} QR codes")
        # Just print the first QR code data without the actual base64 for brevity
        if data:
            first_qr = data[0].copy()
            if "qr_base64" in first_qr:
                first_qr["qr_base64"] = f"[Base64 data of length {len(first_qr['qr_base64'])}]"
            pprint(first_qr)
    else:
        print("Failed to retrieve QR codes")
        try:
            print(response.json())
        except:
            print(response.text)

def test_property_qr_codes(property_id):
    """Test the property QR codes endpoint"""
    url = f"{BASE_URL}/properties/{property_id}/qr-codes/"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    print(f"Testing property QR codes endpoint: {url}")
    response = requests.get(url, headers=headers)
    
    print(f"Status code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Successfully retrieved {len(data)} QR codes for property {property_id}")
        # Just print the first QR code data without the actual base64 for brevity
        if data:
            first_qr = data[0].copy()
            if "qr_base64" in first_qr:
                first_qr["qr_base64"] = f"[Base64 data of length {len(first_qr['qr_base64'])}]"
            pprint(first_qr)
    else:
        print("Failed to retrieve property QR codes")
        try:
            print(response.json())
        except:
            print(response.text)

if __name__ == "__main__":
    print("HomeManager QR Code API Test")
    print("===========================")
    
    choice = input("Test which endpoint? (1 for bulk QR codes, 2 for property QR codes): ")
    
    if choice == "1":
        units_input = input("Enter unit IDs separated by commas (e.g., 1,2,3): ")
        unit_ids = [int(id.strip()) for id in units_input.split(",")]
        test_bulk_qr_codes(unit_ids)
    elif choice == "2":
        property_id = input("Enter property ID: ")
        test_property_qr_codes(int(property_id))
    else:
        print("Invalid choice!")
