import requests
import json

res = requests.post("http://localhost:8000/auth/register", json={"email":"test2@example.com","password":"Password123","name":"Test User"})
if res.status_code == 409:
    res = requests.post("http://localhost:8000/auth/login", json={"email":"test2@example.com","password":"Password123"})
token = res.json()["access_token"]
print("Got token")

with open("test.pdf", "rb") as f:
    files = {'file': ('test.pdf', f.read(), 'application/pdf')}
data = {'title': 'test'}
headers = {'Authorization': f'Bearer {token}'}

upload_res = requests.post("http://localhost:8000/documents/upload", files=files, data=data, headers=headers)
print("Status:", upload_res.status_code)
print("Response:", upload_res.text)
