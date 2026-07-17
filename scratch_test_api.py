import requests
import json

base_url = "http://localhost:8000"
# Register a test user
register_data = {
    "username": "testuser_social",
    "email": "test_social@example.com",
    "password": "password123"
}
requests.post(f"{base_url}/users/register", json=register_data)

# Login
login_data = {
    "username": "testuser_social",
    "password": "password123"
}
response = requests.post(f"{base_url}/auth/login", data=login_data)
token = response.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# Create another user
register_data_2 = {
    "username": "testuser_social2",
    "email": "test_social2@example.com",
    "password": "password123"
}
requests.post(f"{base_url}/users/register", json=register_data_2)

# Login 2
login_data_2 = {
    "username": "testuser_social2",
    "password": "password123"
}
response2 = requests.post(f"{base_url}/auth/login", data=login_data_2)
token2 = response2.json()["access_token"]
headers2 = {"Authorization": f"Bearer {token2}"}

# Get User 2 ID
user2_dashboard = requests.get(f"{base_url}/users/me/dashboard", headers=headers2).json()
# wait, dashboard doesn't have ID!
search = requests.get(f"{base_url}/social/users/search?q=testuser_social2", headers=headers).json()
user2_id = search[0]["id"]

# User 1 follows User 2
requests.post(f"{base_url}/social/users/{user2_id}/follow", headers=headers)
# User 2 follows User 1
search1 = requests.get(f"{base_url}/social/users/search?q=testuser_social", headers=headers2).json()
user1_id = search1[0]["id"]
requests.post(f"{base_url}/social/users/{user1_id}/follow", headers=headers2)

# User 1 fetches followers
followers = requests.get(f"{base_url}/social/users/me/followers", headers=headers)
print("Followers:", followers.json())
