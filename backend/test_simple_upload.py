import requests
import io
import json

# Login
login = requests.post(
    'http://127.0.0.1:8000/api/auth/login',
    json={'email': 'staff1@gmail.com', 'password': '123'},
    timeout=10
).json()

token = login['access_token']

# Get course ID
courses = requests.get(
    'http://127.0.0.1:8000/api/course-materials/courses',
    headers={'Authorization': f'Bearer {token}'},
    timeout=10
).json()

course_id = courses['courses'][0]['id']

# Upload
files = {'file': ('test.txt', io.BytesIO(b"test"), 'text/plain')}
data = {
    'course_id': course_id,
    'title': 'Test',
    'material_type': 'notes'
}

response = requests.post(
    'http://127.0.0.1:8000/api/course-materials/upload',
    headers={'Authorization': f'Bearer {token}'},
    files=files,
    data=data,
    timeout=10
)

print(f"Status: {response.status_code}")
try:
    print(f"JSON: {json.dumps(response.json(), indent=2)}")
except:
    print(f"Text: {response.text}")
