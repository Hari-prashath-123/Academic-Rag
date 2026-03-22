import requests
import io

# Step 1: Login as staff1
login_response = requests.post(
    'http://127.0.0.1:8000/api/auth/login',
    json={'email': 'staff1@gmail.com', 'password': '123'},
    timeout=10
)

print("Login Response Status:", login_response.status_code)
if login_response.status_code != 200:
    print("Login failed:", login_response.text)
    exit(1)

token = login_response.json().get('access_token')
print(f"Token: {token[:50]}...")

# Step 2: Get courses
courses_response = requests.get(
    'http://127.0.0.1:8000/api/course-materials/courses',
    headers={'Authorization': f'Bearer {token}'},
    timeout=10
)
print("\nCourses Response Status:", courses_response.status_code)
print("Courses:", courses_response.json())

if courses_response.status_code != 200:
    print("Failed to get courses")
    exit(1)

courses = courses_response.json().get('courses', [])
if not courses:
    print("No courses available - need to create one first")
    exit(1)

course_id = courses[0]['id']
print(f"Using course ID: {course_id}")

# Step 3: Try to upload a test file
test_file = io.BytesIO(b"Test file content")
files = {
    'file': ('test.txt', test_file, 'text/plain')
}
data = {
    'course_id': course_id,
    'title': 'Test Material',
    'material_type': 'notes'
}

upload_response = requests.post(
    'http://127.0.0.1:8000/api/course-materials/upload',
    headers={'Authorization': f'Bearer {token}'},
    files=files,
    data=data,
    timeout=10
)

print("\nUpload Response Status:", upload_response.status_code)
print("Upload Response:", upload_response.text)

if upload_response.status_code == 201:
    print("\n✓ SUCCESS: File uploaded successfully!")
else:
    print("\n✗ FAILED: Upload failed")
