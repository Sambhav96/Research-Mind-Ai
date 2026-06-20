"""
Database backup: copy existing chunks embeddings into backup table.
Creates: chunks_embedding_backup_1536
Preserves: all chunk IDs, document_ids, and 1536-dim vectors.
"""
from dotenv import load_dotenv; load_dotenv()
from app.db.session import get_session_factory
from sqlalchemy import text
import asyncio

async def backup():
    async with get_session_factory()() as s:
        # Create backup table
        await s.execute(text("""
            CREATE TABLE IF NOT EXISTS chunks_embedding_backup_1536 AS
            SELECT id, document_id, chunk_index, embedding
            FROM chunks
            WHERE embedding IS NOT NULL
        """))
        await s.commit()

        res = await s.execute(text("SELECT COUNT(*) FROM chunks_embedding_backup_1536"))
        count = res.scalar()
        print(f"Backup complete. Rows backed up: {count}")
        print("Table: chunks_embedding_backup_1536")
        print("ROLLBACK: UPDATE chunks SET embedding = b.embedding FROM chunks_embedding_backup_1536 b WHERE chunks.id = b.id")

asyncio.run(backup())
