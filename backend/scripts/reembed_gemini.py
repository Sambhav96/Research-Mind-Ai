"""Re-embed all chunks with Gemini 3072-dim embeddings.

Reads chunks that do not have embedding_v2 populated, generates embeddings using Gemini,
and writes them back to embedding_v2.
"""

from __future__ import annotations

import asyncio
import logging
import sys
from pathlib import Path

from dotenv import load_dotenv

# Ensure we're running from backend root
sys.path.insert(0, str(Path(__file__).parent.parent))
load_dotenv()

from app.db.session import get_session_factory
from app.models.chunk import Chunk
from app.services.ai.gemini_provider import GeminiEmbeddingProvider
from app.core.config import get_settings
from sqlalchemy import select

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("reembed")


async def main() -> None:
    settings = get_settings()
    provider = GeminiEmbeddingProvider(api_key=settings.gemini_api_key)
    logger.info(f"Using Gemini model for {provider.dimensions}-dim embeddings")

    async with get_session_factory()() as session:
        # Get all chunks that need re-embedding
        # Find chunks where embedding_v2 IS NULL
        result = await session.execute(
            select(Chunk).where(Chunk.embedding_v2.is_(None)).order_by(Chunk.id)
        )
        chunks = result.scalars().all()

        total = len(chunks)
        if total == 0:
            logger.info("No chunks need re-embedding. Exiting.")
            return

        logger.info(f"Found {total} chunks requiring re-embedding")

        # Process in batches of 10 to match provider limits
        batch_size = 10
        success_count = 0
        fail_count = 0

        for i in range(0, total, batch_size):
            batch = chunks[i : i + batch_size]
            texts = [c.content for c in batch]

            logger.info(f"Embedding batch {i//batch_size + 1}/{(total+batch_size-1)//batch_size} (size {len(texts)})...")
            try:
                emb_result = await provider.embed_texts(texts)
                
                # Update DB
                for chunk, emb in zip(batch, emb_result.embeddings):
                    if emb:
                        chunk.embedding_v2 = emb
                        success_count += 1
                    else:
                        fail_count += 1

                await session.commit()
            except Exception as e:
                logger.error(f"Batch failed: {e}")
                await session.rollback()
                fail_count += len(batch)
                
            logger.info(f"Progress: {success_count} success, {fail_count} failed out of {total}")

        logger.info(f"Done. Successfully re-embedded {success_count} chunks. Failed: {fail_count}")


if __name__ == "__main__":
    asyncio.run(main())
