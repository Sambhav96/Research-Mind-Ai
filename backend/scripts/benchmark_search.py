"""Benchmark script to compare OpenAI vs Gemini search."""

import asyncio
import time
import sys
from pathlib import Path
from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).parent.parent))
load_dotenv()

from openai import AsyncOpenAI
from google import genai
from sqlalchemy import select
from sqlalchemy.sql import literal
from app.db.session import get_session_factory
from app.models.chunk import Chunk
from app.models.document import Document
from app.core.config import get_settings

async def search_openai(session, query: str):
    settings = get_settings()
    client = AsyncOpenAI(api_key=settings.openai_api_key)
    
    start = time.time()
    res = await client.embeddings.create(
        model="text-embedding-3-small",
        input=query
    )
    emb = res.data[0].embedding
    emb_latency = time.time() - start

    start = time.time()
    dist_expr = Chunk.embedding.cosine_distance(literal(emb))
    stmt = (
        select(Chunk, Document.title, (1 - dist_expr).label("score"))
        .join(Document, Chunk.document_id == Document.id)
        .where(Chunk.embedding.isnot(None))
        .order_by(dist_expr)
        .limit(3)
    )
    result = await session.execute(stmt)
    rows = result.all()
    search_latency = time.time() - start
    
    return {
        "emb_latency": emb_latency,
        "search_latency": search_latency,
        "results": [{"title": r.title, "page": r.Chunk.page_number, "score": float(r.score)} for r in rows]
    }

async def search_gemini(session, query: str):
    settings = get_settings()
    client = genai.Client(api_key=settings.gemini_api_key)
    
    start = time.time()
    res = await asyncio.to_thread(
        client.models.embed_content,
        model="models/gemini-embedding-001",
        contents=query
    )
    emb = list(res.embeddings[0].values)
    emb_latency = time.time() - start

    start = time.time()
    dist_expr = Chunk.embedding_v2.cosine_distance(literal(emb))
    stmt = (
        select(Chunk, Document.title, (1 - dist_expr).label("score"))
        .join(Document, Chunk.document_id == Document.id)
        .where(Chunk.embedding_v2.isnot(None))
        .order_by(dist_expr)
        .limit(3)
    )
    result = await session.execute(stmt)
    rows = result.all()
    search_latency = time.time() - start
    
    return {
        "emb_latency": emb_latency,
        "search_latency": search_latency,
        "results": [{"title": r.title, "page": r.Chunk.page_number, "score": float(r.score)} for r in rows]
    }

async def main():
    queries = [
        "transformer architecture",
        "attention mechanism",
        "semantic network",
        "traffic congestion",
        "reinforcement learning"
    ]

    async with get_session_factory()() as session:
        # 1. Verify counts
        r1 = await session.execute(select(Chunk).where(Chunk.embedding.isnot(None)))
        openai_count = len(r1.scalars().all())
        
        r2 = await session.execute(select(Chunk).where(Chunk.embedding_v2.isnot(None)))
        gemini_count = len(r2.scalars().all())

        print(f"Total OpenAI Embeddings: {openai_count}")
        print(f"Total Gemini Embeddings: {gemini_count}")
        print()

        for q in queries:
            print(f"--- Query: '{q}' ---")
            
            # o_res = await search_openai(session, q)
            # print(f"[OpenAI] Emb: {o_res['emb_latency']*1000:.1f}ms | Search: {o_res['search_latency']*1000:.1f}ms")
            # for i, r in enumerate(o_res['results']):
            #     print(f"  {i+1}. {r['title']} (p.{r['page']}) - Score: {r['score']:.4f}")

            g_res = await search_gemini(session, q)
            print(f"[Gemini] Emb: {g_res['emb_latency']*1000:.1f}ms | Search: {g_res['search_latency']*1000:.1f}ms")
            for i, r in enumerate(g_res['results']):
                print(f"  {i+1}. {r['title']} (p.{r['page']}) - Score: {r['score']:.4f}")
            print()

if __name__ == "__main__":
    asyncio.run(main())
