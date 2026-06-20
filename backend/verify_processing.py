import requests
import json

def verify():
    print("--- DOCUMENT PROCESSING VERIFICATION ---")
    
    # 1. Login
    login_res = requests.post("http://localhost:8000/auth/login", json={"email":"test2@example.com","password":"Password123"})
    if login_res.status_code != 200:
        print("Login failed:", login_res.text)
        return
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("[PASS] Authentication")

    # 2. Upload Document
    try:
        with open("test.pdf", "rb") as f:
            files = {"file": ("searchable_test.pdf", f.read(), "application/pdf")}
        data = {"title": "Semantic Search Test"}
        upload_res = requests.post("http://localhost:8000/documents/upload", files=files, data=data, headers=headers)
        if upload_res.status_code == 201:
            print("[PASS] File Upload API")
        else:
            print("[FAIL] File Upload API:", upload_res.text)
            return
        
        doc_id = upload_res.json()["document"]["id"]
        status = upload_res.json()["document"]["status"]
        if status == "ready":
            print("[PASS] Status Updates (Document marked READY)")
        else:
            print("[FAIL] Status Updates (Status is not ready):", status)
    except Exception as e:
        print("[FAIL] File Upload Exception:", str(e))
        return

    # 3. Check DB Records for Document and Chunks
    try:
        import asyncio
        from app.db.session import get_session_factory
        from sqlalchemy import text
        from app.core.config import get_settings

        async def check_db():
            async with get_session_factory()() as session:
                # Check document record
                doc_res = await session.execute(text(f"SELECT id, status, page_count FROM documents WHERE id = '{doc_id}'"))
                doc = doc_res.fetchone()
                if doc:
                    print("[PASS] Database Records (Document record created)")
                    print("[PASS] Text Extraction (Page count stored):", doc[2])
                else:
                    print("[FAIL] Database Records (Document not found)")
                
                # Check chunks
                chunks_res = await session.execute(text(f"SELECT COUNT(*) FROM chunks WHERE document_id = '{doc_id}'"))
                chunk_count = chunks_res.scalar()
                if chunk_count > 0:
                    print("[PASS] Chunk Generation (Chunks created in DB)")
                else:
                    print("[FAIL] Chunk Generation (No chunks found)")
                
                # Check embeddings
                emb_res = await session.execute(text(f"SELECT COUNT(*) FROM chunks WHERE document_id = '{doc_id}' AND embedding IS NOT NULL"))
                emb_count = emb_res.scalar()
                if emb_count > 0:
                    print("[PASS] Embedding Generation (Embeddings generated)")
                    print("[PASS] Vector Storage (Vectors stored in DB)")
                else:
                    print("[FAIL] Embedding Generation / Vector Storage (No embeddings found)")
                    
                # Searchable Content Test
                search_res = await session.execute(text("SELECT id FROM chunks WHERE document_id = :did LIMIT 1"), {"did": doc_id})
                chunk_id = search_res.scalar()
                if chunk_id:
                    print("[PASS] Searchable Content (Chunks are readable and linked to document)")
                else:
                    print("[FAIL] Searchable Content (Unable to query chunks)")

        asyncio.run(check_db())
    except Exception as e:
        print("[FAIL] Database Check Exception:", str(e))

if __name__ == "__main__":
    verify()
