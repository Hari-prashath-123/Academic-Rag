import requests

# Login
login_response = requests.post(
    'http://127.0.0.1:8000/api/auth/login',
    json={'email': 'staff1@gmail.com', 'password': '123'},
    timeout=10
)

token = login_response.json().get('access_token')

# Try to list existing materials
response = requests.get(
    'http://127.0.0.1:8000/api/course-materials/',
    headers={'Authorization': f'Bearer {token}'},
    timeout=10
)

print(f"List materials status: {response.status_code}")
print(f"Response: {response.text[:500]}")
