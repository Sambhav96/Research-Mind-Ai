import asyncio
from fastapi.testclient import TestClient
from app.main import app
from app.services.auth import AuthService
from app.db.session import get_session_factory
from app.schemas.auth import LoginRequest
import json

import httpx

async def test_quiz_generation():
    doc_id = "6c09bb58-04e0-4197-9801-796a096f3f38"
    
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        
        # login via test client
        login_res = await client.post("/auth/login", json={"username": "testuser", "email": "test@test.com", "password": "password123"})
        if login_res.status_code != 200:
            print(f"Failed to login: {login_res.text}")
            return
            
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        print("Generating quiz...")
        res = await client.post(
            "/quiz/generate", 
            json={"document_ids": [doc_id], "num_questions": 10}, 
            headers=headers,
            timeout=120.0,
        )
        
        if res.status_code != 200:
            print(f"Failed to generate quiz: {res.text}")
            return
            
        data = res.json()
        questions = data.get("questions", [])
        print(f"Generated {len(questions)} questions.")
        
        with open("quiz_validation.json", "w") as f:
            json.dump(questions, f, indent=2)
            
        print("Saved to quiz_validation.json")

if __name__ == "__main__":
    asyncio.run(test_quiz_generation())
