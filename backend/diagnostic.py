"""
Full pipeline diagnostic - runs against live backend.
Covers: embedding, chat, quiz, flashcards, workspace, sources.
"""
import requests
import json
import asyncio
import sys

# Force UTF-8 output
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE = "http://localhost:8000"

def login():
    r = requests.post(f"{BASE}/auth/login", json={"email": "test2@example.com", "password": "Password123"})
    assert r.status_code == 200, f"Login failed: {r.text}"
    return r.json()["access_token"]

def hdr(token):
    return {"Authorization": f"Bearer {token}"}

def section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

def check(label, cond, detail=""):
    icon = "[PASS]" if cond else "[FAIL]"
    print(f"  {icon} {label}" + (f": {detail}" if detail else ""))
    return cond

TOKEN = login()
print("Auth: OK")

# PHASE 1: OPENAI / EMBEDDINGS
section("PHASE 1 - OpenAI & Embedding pipeline")

r = requests.post(f"{BASE}/search", json={"query": "test", "limit": 3, "min_similarity": 0.0}, headers=hdr(TOKEN))
emb_ok = r.status_code == 200
check("embed_query via /search -> OpenAI", emb_ok, f"HTTP {r.status_code}")
if emb_ok:
    data = r.json()
    check("Search returns results", len(data.get("results", [])) > 0, f"{len(data.get('results', []))} results")
else:
    print(f"    Error: {r.text[:300]}")

# PHASE 2: DOCUMENT LIST
section("PHASE 2 - Document list")

r = requests.get(f"{BASE}/documents", headers=hdr(TOKEN))
check("GET /documents 200", r.status_code == 200, f"HTTP {r.status_code}")
docs = r.json() if r.status_code == 200 else {}
items = docs.get("items", [])
check("Documents exist in DB", len(items) > 0, f"{len(items)} docs")
ready_docs = [d for d in items if d["status"] == "ready"]
check("At least one doc is ready", len(ready_docs) > 0, f"{len(ready_docs)} ready")
if ready_docs:
    print(f"    Sample doc: {ready_docs[0]['id']} - {ready_docs[0]['title']}")

# PHASE 3: CHAT
section("PHASE 3 - Chat & RAG")

r = requests.post(f"{BASE}/chat", json={"query": "What topics are covered in my documents?"}, headers=hdr(TOKEN))
chat_ok = r.status_code == 200
check("POST /chat 200", chat_ok, f"HTTP {r.status_code}")
if chat_ok:
    data = r.json()
    check("Chat returns answer", bool(data.get("answer")), data.get("answer", "")[:100])
    check("Chat returns citations", len(data.get("citations", [])) > 0, f"{len(data.get('citations', []))} citations")
    check("Chat returns sources", len(data.get("sources", [])) > 0, f"{len(data.get('sources', []))} sources")
else:
    print(f"    Error: {r.text[:500]}")

# PHASE 4: QUIZ
section("PHASE 4 - Quiz generation")

r = requests.post(f"{BASE}/quiz/generate", json={"query": ""}, headers=hdr(TOKEN))
quiz_ok = r.status_code == 200
check("POST /quiz/generate 200", quiz_ok, f"HTTP {r.status_code}")
if quiz_ok:
    data = r.json()
    qs = data.get("questions", [])
    print(f"    questions field type: {type(qs).__name__}")
    check("Quiz returns questions list", isinstance(qs, list), f"type={type(qs).__name__}")
    if isinstance(qs, list):
        check("Questions are parsed dicts", len(qs) > 0 and isinstance(qs[0], dict), f"{len(qs)} questions" if qs else "empty list")
    else:
        print(f"    Raw value: {str(qs)[:300]}")
else:
    print(f"    Error: {r.text[:500]}")

# PHASE 5: FLASHCARDS
section("PHASE 5 - Flashcard generation")

r = requests.post(f"{BASE}/flashcards/generate", json={"query": ""}, headers=hdr(TOKEN))
fc_ok = r.status_code == 200
check("POST /flashcards/generate 200", fc_ok, f"HTTP {r.status_code}")
if fc_ok:
    data = r.json()
    fcs = data.get("flashcards", [])
    print(f"    flashcards field type: {type(fcs).__name__}")
    check("Flashcards returns list", isinstance(fcs, list), f"type={type(fcs).__name__}")
    if isinstance(fcs, list):
        check("Flashcards are parsed dicts", len(fcs) > 0 and isinstance(fcs[0], dict), f"{len(fcs)} cards" if fcs else "empty list")
    else:
        print(f"    Raw value: {str(fcs)[:300]}")
else:
    print(f"    Error: {r.text[:500]}")

# PHASE 6: WORKSPACE
section("PHASE 6 - Workspaces")

r = requests.get(f"{BASE}/workspaces", headers=hdr(TOKEN))
ws_ok = r.status_code == 200
check("GET /workspaces 200", ws_ok, f"HTTP {r.status_code}")
if ws_ok:
    wss = r.json()
    check("Workspaces exist", len(wss) > 0, f"{len(wss)} workspaces")
else:
    print(f"    Error: {r.text[:300]}")

# DB VERIFICATION
section("DB Verification (async)")

async def db_check():
    from app.db.session import get_session_factory
    from sqlalchemy import text
    async with get_session_factory()() as session:
        doc_count = (await session.execute(text("SELECT COUNT(*) FROM documents WHERE is_deleted = false"))).scalar()
        chunk_count = (await session.execute(text("SELECT COUNT(*) FROM chunks"))).scalar()
        emb_count = (await session.execute(text("SELECT COUNT(*) FROM chunks WHERE embedding IS NOT NULL"))).scalar()
        ready_count = (await session.execute(text("SELECT COUNT(*) FROM documents WHERE status = 'ready' AND is_deleted = false"))).scalar()

        print(f"  Documents (non-deleted): {doc_count}")
        print(f"  Documents (ready):       {ready_count}")
        print(f"  Chunks total:            {chunk_count}")
        print(f"  Chunks with embeddings:  {emb_count}")

        check("Docs have chunks", chunk_count >= doc_count, f"{chunk_count} chunks for {doc_count} docs")
        check("All chunks embedded", emb_count == chunk_count, f"{emb_count}/{chunk_count} embedded")

asyncio.run(db_check())

print("\n" + "="*60)
print("  DIAGNOSTIC COMPLETE")
print("="*60)
