"""Check current DB state for the migration."""
from dotenv import load_dotenv; load_dotenv()
from app.db.session import get_session_factory
from sqlalchemy import text
import asyncio

async def check():
    async with get_session_factory()() as s:
        r1 = await s.execute(text("SELECT COUNT(*) FROM chunks"))
        total = r1.scalar()
        r2 = await s.execute(text("SELECT COUNT(*) FROM chunks WHERE embedding IS NOT NULL"))
        with_emb = r2.scalar()
        try:
            r3 = await s.execute(text("SELECT vector_dims(embedding) FROM chunks WHERE embedding IS NOT NULL LIMIT 1"))
            dims = r3.scalar()
        except Exception:
            dims = "unknown"
        r4 = await s.execute(text("SELECT COUNT(*) FROM documents WHERE status = 'ready'"))
        ready_docs = r4.scalar()
        print(f"Total chunks: {total}")
        print(f"With embeddings: {with_emb}")
        print(f"Current vector dims: {dims}")
        print(f"Ready documents: {ready_docs}")

asyncio.run(check())
