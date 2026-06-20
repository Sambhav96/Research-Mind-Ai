import asyncio
import httpx
import json
from app.main import app

async def main():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/auth/login", json={"username": "testuser", "email": "test@test.com", "password": "password123"})
        token = res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        res = await client.get("/documents", headers=headers)
        print(json.dumps(res.json(), indent=2))

if __name__ == "__main__":
    asyncio.run(main())
