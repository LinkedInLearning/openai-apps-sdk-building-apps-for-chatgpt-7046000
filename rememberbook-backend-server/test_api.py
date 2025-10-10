#!/usr/bin/env python3
"""
Simple test script to demonstrate the Remember Book API functionality.
Make sure the server is running (python app.py) before running this script.
"""

import requests
import json
import time

# Default port now 5055 (5000 can conflict with macOS AirPlay). Allow override.
import os
BASE_URL = os.environ.get("REMEMBERBOOK_BASE_URL", f"http://localhost:{os.environ.get('PORT', '5055')}")

def test_api():
    print("Testing Remember Book API...")
    print("=" * 50)
    
    # Test 1: Get API info
    print("1. Getting API info...")
    response = requests.get(f"{BASE_URL}/")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()
    
    # Test 2: Get all ideas (should include sample data)
    print("2. Getting all (non-archived) ideas...")
    response = requests.get(f"{BASE_URL}/ideas")
    print(f"Status: {response.status_code}")
    ideas = response.json()
    print(f"Found {len(ideas)} ideas:")
    for idea in ideas:
        print(f"  - {idea['title']} (Urgency: {idea['urgency']})")
    print()
    
    # Test 3: Create a new idea
    print("3. Creating a new idea...")
    new_idea = {
        "title": "Build a React frontend",
        "description": "Create a simple React app to interact with this API",
        "urgency": 4
    }
    response = requests.post(f"{BASE_URL}/ideas", json=new_idea)
    print(f"Status: {response.status_code}")
    created_idea = response.json()
    idea_id = created_idea['id']
    print(f"Created idea with ID: {idea_id}")
    print(f"Response: {json.dumps(created_idea, indent=2)}")
    print()
    
    # Test 4: Get the specific idea
    print("4. Getting the specific idea...")
    response = requests.get(f"{BASE_URL}/ideas/{idea_id}")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()
    
    # Test 5: Update the idea (add notes)
    print("5. Updating the idea (adding notes)...")
    update_data = {
        "notes": "Start with Create React App and add components for idea management"
    }
    response = requests.put(f"{BASE_URL}/ideas/{idea_id}", json=update_data)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()
    
    # Test 6: Get all ideas again to see the update
    print("6. Getting all ideas again (verify note append)...")
    response = requests.get(f"{BASE_URL}/ideas")
    print(f"Status: {response.status_code}")
    ideas = response.json()
    print(f"Now have {len(ideas)} ideas:")
    for idea in ideas:
        notes_preview = idea['notes'][:50] + "..." if len(idea['notes']) > 50 else idea['notes']
        print(f"  - {idea['title']} (Urgency: {idea['urgency']}) Notes: {notes_preview}")
    print()
    
    # Test 7: Delete the created idea
    print("7. Deleting the created idea...")
    response = requests.delete(f"{BASE_URL}/ideas/{idea_id}")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()
    
    # Test 8: Verify deletion
    print("8. Verifying deletion...")
    response = requests.get(f"{BASE_URL}/ideas")
    ideas = response.json()
    print(f"Back to {len(ideas)} ideas")
    print()
    
    print("API testing completed!")
    print("=" * 50)
    print("\nTo explore the API interactively, visit:")
    print(f"  {BASE_URL}/apidocs")

if __name__ == "__main__":
    try:
        test_api()
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to the server.")
        print("Make sure the server is running with: python app.py")
    except Exception as e:
        print(f"Error: {e}")