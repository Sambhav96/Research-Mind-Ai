import asyncio
import httpx
from datetime import datetime

async def test_upload_and_poll():
    # Login
    async with httpx.AsyncClient(base_url="http://127.0.0.1:8000") as client:
        # Create a tiny pdf to upload
        with open("tiny.pdf", "wb") as f:
            f.write(b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF")

        login_res = await client.post("/auth/login", data={"username": "testuser", "password": "password123"})
        
        token = ""
        if login_res.status_code == 200:
            token = login_res.json()["access_token"]
        else:
            # Register
            reg_res = await client.post("/auth/register", json={"username": "testuser", "email": "test@test.com", "password": "password123"})
            login_res = await client.post("/auth/login", data={"username": "testuser", "password": "password123"})
            token = login_res.json()["access_token"]

        headers = {"Authorization": f"Bearer {token}"}
        
        # Upload
        print("Uploading...")
        with open("tiny.pdf", "rb") as f:
            files = {"file": ("tiny.pdf", f, "application/pdf")}
            data = {"title": "Background Test"}
            upload_res = await client.post("/documents/upload", files=files, data=data, headers=headers)
        
        if upload_res.status_code != 201:
            print(f"Failed to upload: {upload_res.text}")
            return
            
        doc_id = upload_res.json()["document"]["id"]
        print(f"Uploaded! Document ID: {doc_id}")
        print(f"Initial status: {upload_res.json()['document']['status']}")
        
        # Poll
        import time
        start_time = time.time()
        while time.time() - start_time < 30:
            doc_res = await client.get(f"/documents/{doc_id}", headers=headers)
            doc = doc_res.json()
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Status: {doc.get('status')} | Progress: {doc.get('processing_progress')}%")
            if doc.get("status") in ("ready", "failed"):
                break
            await asyncio.sleep(1)

if __name__ == "__main__":
    asyncio.run(test_upload_and_poll())
