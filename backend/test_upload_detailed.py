import requests
import json

# Step 1: Login as staff1
login_response = requests.post(
    'http://127.0.0.1:8000/api/auth/login',
    json={'email': 'staff1@gmail.com', 'password': '123'},
    timeout=10
)

print("=== LOGIN ===")
print("Status:", login_response.status_code)

if login_response.status_code != 200:
    print("Error:", login_response.text)
    exit(1)

token = login_response.json().get('access_token')

# Step 2: Get courses  
courses_response = requests.get(
    'http://127.0.0.1:8000/api/course-materials/courses',
    headers={'Authorization': f'Bearer {token}'},
    timeout=10
)

print("\n=== GET COURSES ===")
print("Status:", courses_response.status_code)
print("Response:", json.dumps(courses_response.json(), indent=2))

if courses_response.status_code != 200:
    print("Failed to get courses")
    exit(1)

courses = courses_response.json().get('courses', [])
if not courses:
    print("No courses available")
    exit(1)

course_id = courses[0]['id']

# Step 3: Try to upload a test file
import io

test_file = io.BytesIO(b"Test file content")
files = {
    'file': ('test.txt', test_file, 'text/plain')
}
data = {
    'course_id': course_id,
    'title': 'Test Material',
    'material_type': 'notes'
}

print("\n=== UPLOAD ===")
print(f"Course ID: {course_id}")
print(f"File: test.txt")
print(f"Material Type: notes")

upload_response = requests.post(
    'http://127.0.0.1:8000/api/course-materials/upload',
    headers={'Authorization': f'Bearer {token}'},
    files=files,
    data=data,
    timeout=10
)

print(f"\nStatus: {upload_response.status_code}")
print(f"Response Text: {upload_response.text}")

if upload_response.status_code == 201:
    print("\n✓ SUCCESS")
    print(json.dumps(upload_response.json(), indent=2))
else:
    print("\n✗ FAILED")
    try:
        print(json.dumps(upload_response.json(), indent=2))
    except:
        print(upload_response.text)
