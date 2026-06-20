import asyncio
import httpx
import uuid

from app.main import create_app

async def main():
    print("=============================================")
    print("   END-TO-END VALIDATION SCRIPT (LIVE API)   ")
    print("=============================================\n")
    
    app = create_app()
    base_url = 'http://test'
    
    from app.services.auth import AuthService
    from app.db.session import get_session_factory
    from sqlalchemy import select
    from app.models.user import User
    from app.core.config import get_settings

    async with get_session_factory()() as session:
        user_res = await session.execute(select(User).where(User.email == 'ss0563@srmist.edu.in'))
        user = user_res.scalars().first()
        auth_svc = AuthService(session=session, settings=get_settings())
        token_bundle = auth_svc._generate_tokens(user)
        token = token_bundle.response.access_token
    
    headers = {'Authorization': f'Bearer {token}'}
    print("[OK] Authentication successful (super bypass)\\n")

    from httpx import ASGITransport
    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url=base_url) as client:

        # 2. Reader Validation
        print("[2] READER VALIDATION")
        doc_id = "66ff6e23-597e-46d7-9990-88acbd2d4ac0"
        print(f"Target Document ID: {doc_id} (Knowledge_Representation.pdf)")
        res_doc = await client.get(f'{base_url}/documents/{doc_id}', headers=headers)
        if res_doc.status_code == 200:
            doc_data = res_doc.json()
            print(f"[OK] Document found: {doc_data.get('title')}")
            print(f"[OK] Document Status: {doc_data.get('status')}")
            print(f"[OK] Upload path accessible: {bool(doc_data.get('file_path'))}")
        else:
            print(f"[FAIL] Failed to get document: {res_doc.status_code}")
        print()

        # 3. Search Validation
        print("[3] SEARCH VALIDATION")
        query = "transformer architecture"
        print(f"Query: '{query}'")
        res_search = await client.post(f'{base_url}/search', json={
            'query': query,
            'limit': 5
        }, headers=headers, timeout=10.0)
        
        print(f"Status: {res_search.status_code}")
        if res_search.status_code == 200:
            print(f"[OK] Search Response: {res_search.json()}")
        else:
            print(f"[FAIL] API Error Response: {res_search.text}")
        print()

        # 4. Chat Validation
        print("[4] CHAT VALIDATION")
        chat_query = "summarize this paper"
        print(f"Query: '{chat_query}' on doc: {doc_id}")
        res_chat = await client.post(f'{base_url}/chat', json={
            'query': chat_query,
            'document_ids': [doc_id]
        }, headers=headers, timeout=30.0)
        
        print(f"Status: {res_chat.status_code}")
        if res_chat.status_code == 200:
            chat_data = res_chat.json()
            print(f"[OK] Chat Response: {chat_data.get('answer')[:100]}...")
            print(f"[OK] Sources used: {len(chat_data.get('sources', []))}")
        else:
            print(f"[FAIL] API Error Response: {res_chat.text}")
        print()

if __name__ == "__main__":
    asyncio.run(main())
