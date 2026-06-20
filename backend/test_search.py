import requests
import json

def test_search():
    login_res = requests.post("http://localhost:8000/auth/login", json={"email":"test2@example.com","password":"Password123"})
    if login_res.status_code != 200:
        print("Login failed", login_res.text)
        return
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    with open("test.pdf", "rb") as f:
        files = {"file": ("unique_search.pdf", f.read(), "application/pdf")}
    data = {"title": "Unique Search Test"}
    upload_res = requests.post("http://localhost:8000/documents/upload", files=files, data=data, headers=headers)
    if upload_res.status_code != 201:
        print("Upload failed", upload_res.text)
        return
    doc_id = upload_res.json()["document"]["id"]
    print("Uploaded document:", doc_id)

    import asyncio
    from app.db.session import get_session_factory
    from sqlalchemy import text

    async def get_chunk_text():
        async with get_session_factory()() as session:
            res = await session.execute(text(f"SELECT content FROM chunks WHERE document_id = '{doc_id}' LIMIT 1"))
            return res.scalar()
    
    chunk_text = asyncio.run(get_chunk_text())
    print("Searching for exact chunk text:", chunk_text)

    search_res = requests.post("http://localhost:8000/search", json={"query": chunk_text, "limit": 5, "min_similarity": 0.5}, headers=headers)
    print("Search Status:", search_res.status_code)
    print("Search Response:", json.dumps(search_res.json(), indent=2))

if __name__ == "__main__":
    test_search()
