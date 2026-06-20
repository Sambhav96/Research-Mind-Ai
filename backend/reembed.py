"""
Re-embed all document chunks using the real OpenAI API.
Needed to replace old mock embeddings (flat [0.1, 0.1...] vectors)
with real embeddings so semantic search works properly.
"""
import asyncio
import sys

async def reembed():
    from app.db.session import get_session_factory
    from app.services.embedding import EmbeddingService
    from app.repositories.chunk import ChunkRepository
    from sqlalchemy import text

    async with get_session_factory()() as session:
        # Fetch all chunks
        result = await session.execute(text("SELECT id, document_id, chunk_index, content FROM chunks ORDER BY document_id, chunk_index"))
        rows = result.fetchall()
        print(f"Total chunks to re-embed: {len(rows)}")

        if not rows:
            print("No chunks found.")
            return

        emb_svc = EmbeddingService(session)

        # Process in batches of 50
        batch_size = 50
        for i in range(0, len(rows), batch_size):
            batch = rows[i:i + batch_size]
            texts = [r[3] for r in batch]  # content
            print(f"  Batch {i//batch_size + 1}: embedding {len(texts)} chunks...")
            
            result = await emb_svc.embed_batch(texts)
            
            updates = []
            for j, row in enumerate(batch):
                if j < len(result.embeddings) and result.embeddings[j]:
                    updates.append({
                        "document_id": row[1],  # document_id uuid
                        "chunk_index": row[2],  # chunk_index
                        "embedding": result.embeddings[j],
                    })
            
            if updates:
                count = await emb_svc.store_embeddings(updates)
                await session.commit()
                print(f"    Updated {count} embeddings")
            
            failed = result.failed_count
            if failed:
                print(f"    WARNING: {failed} chunks failed embedding")

        print("\nRe-embedding complete.")
        
        # Verify
        r2 = await session.execute(text("SELECT COUNT(*) FROM chunks WHERE embedding IS NOT NULL"))
        emb_count = r2.scalar()
        r3 = await session.execute(text("SELECT COUNT(*) FROM chunks"))
        total = r3.scalar()
        print(f"Chunks with embeddings: {emb_count}/{total}")

asyncio.run(reembed())
