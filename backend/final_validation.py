"""
Final end-to-end validation after all fixes.
Tests: search, chat, quiz, flashcards.
"""
import requests
import asyncio
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE = "http://localhost:8000"

def login():
    r = requests.post(f"{BASE}/auth/login", json={"email": "test2@example.com", "password": "Password123"})
    return r.json()["access_token"]

def hdr(token):
    return {"Authorization": f"Bearer {token}"}

def check(label, cond, detail=""):
    icon = "[PASS]" if cond else "[FAIL]"
    print(f"  {icon} {label}" + (f": {detail}" if detail else ""))
    return cond

print("="*60)
print("  FINAL E2E VALIDATION")
print("="*60)

TOKEN = login()
print("Auth: OK")

# 1. Search
r = requests.post(f"{BASE}/search", json={"query": "Test PDF", "limit": 5, "min_similarity": 0.0}, headers=hdr(TOKEN))
check("Search API (200)", r.status_code == 200, f"HTTP {r.status_code}")
if r.status_code == 200:
    results = r.json().get("results", [])
    check("Search returns results", len(results) > 0, f"{len(results)} results")
    if results:
        print(f"    Sample result: doc_id={results[0]['document_id']}, score={results[0]['score']:.4f}")
        print(f"    Content: {results[0]['content'][:80]}")
    else:
        print(f"    DEBUG /search response: {r.text}")

# 2. Chat
print("\n--- CHAT ---")
r = requests.post(f"{BASE}/chat", json={"query": "Summarize the content of my documents."}, headers=hdr(TOKEN))
check("Chat API (200)", r.status_code == 200, f"HTTP {r.status_code}")
if r.status_code == 200:
    data = r.json()
    check("Chat has answer", bool(data.get("answer")), data.get("answer", "")[:120])
    check("Chat has sources", len(data.get("sources", [])) > 0, f"{len(data.get('sources', []))} sources")
    check("Chat has citations", len(data.get("citations", [])) > 0, f"{len(data.get('citations', []))} citations")
else:
    print(f"    Error: {r.text[:500]}")

# 3. Quiz
print("\n--- QUIZ ---")
r = requests.post(f"{BASE}/quiz/generate", json={}, headers=hdr(TOKEN))
check("Quiz generate (200)", r.status_code == 200, f"HTTP {r.status_code}")
if r.status_code == 200:
    data = r.json()
    qs = data.get("questions", [])
    check("Quiz returns list", isinstance(qs, list), f"type={type(qs).__name__}")
    check("Quiz has items", len(qs) > 0, f"{len(qs)} questions")
    if qs and isinstance(qs[0], dict):
        check("Quiz item has question field", "question" in qs[0], str(list(qs[0].keys()))[:80])
else:
    print(f"    Error: {r.text[:400]}")

# 4. Flashcards
print("\n--- FLASHCARDS ---")
r = requests.post(f"{BASE}/flashcards/generate", json={}, headers=hdr(TOKEN))
check("Flashcards generate (200)", r.status_code == 200, f"HTTP {r.status_code}")
if r.status_code == 200:
    data = r.json()
    fcs = data.get("flashcards", [])
    check("Flashcards returns list", isinstance(fcs, list), f"type={type(fcs).__name__}")
    check("Flashcards has items", len(fcs) > 0, f"{len(fcs)} flashcards")
    if fcs and isinstance(fcs[0], dict):
        check("Flashcard has front/back", "front" in fcs[0] and "back" in fcs[0], str(list(fcs[0].keys()))[:80])
else:
    print(f"    Error: {r.text[:400]}")

# 5. DB state
print("\n--- DATABASE ---")
async def db():
    from app.db.session import get_session_factory
    from sqlalchemy import text
    async with get_session_factory()() as session:
        doc_count = (await session.execute(text("SELECT COUNT(*) FROM documents WHERE is_deleted = false"))).scalar()
        ready = (await session.execute(text("SELECT COUNT(*) FROM documents WHERE status='ready' AND is_deleted=false"))).scalar()
        chunks = (await session.execute(text("SELECT COUNT(*) FROM chunks"))).scalar()
        emb = (await session.execute(text("SELECT COUNT(*) FROM chunks WHERE embedding IS NOT NULL"))).scalar()
        print(f"  Documents: {doc_count} total, {ready} ready")
        print(f"  Chunks: {chunks} total, {emb} with embeddings")
        check("All chunks embedded", emb == chunks, f"{emb}/{chunks}")

asyncio.run(db())

print("\n" + "="*60)
print("  VALIDATION COMPLETE")
print("="*60)
