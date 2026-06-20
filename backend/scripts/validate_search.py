"""Validation script for Gemini Search and RAG pipeline."""

import asyncio
import time
import sys
from pathlib import Path
from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).parent.parent))
load_dotenv()

from app.db.session import get_session_factory
from app.services.vector_search import VectorService
from app.services.embedding import EmbeddingService
from app.services.rag import RAGService
from app.core.config import get_settings


async def main():
    settings = get_settings()
    print(f"Validating with {settings.embedding_model} and {settings.gemini_model}")

    queries = [
        "transformer architecture",
        "attention mechanism",
        "knowledge representation",
        "IoT traffic management"
    ]

    async with get_session_factory()() as session:
        vector_svc = VectorService(session)
        embed_svc = EmbeddingService(session)
        rag_svc = RAGService(session)
        
        print("\n--- Phase 1: Search Validation ---")
        for q in queries:
            start = time.time()
            emb = await embed_svc.embed_query(q)
            emb_time = time.time() - start
            
            start = time.time()
            res = await vector_svc.search(emb, limit=3)
            search_time = time.time() - start
            
            print(f"Query: '{q}'")
            print(f"  Embedding time: {emb_time*1000:.1f}ms")
            print(f"  Search time:    {search_time*1000:.1f}ms")
            print(f"  Results found:  {len(res.results)}")
            for idx, r in enumerate(res.results):
                print(f"    {idx+1}. [{r.score:.4f}] {r.document_title} (p.{r.page})")
            print()

        print("\n--- Phase 2: RAG Validation ---")
        rag_query = "Summarize the key contributions regarding attention mechanisms."
        print(f"Query: '{rag_query}'")
        
        start = time.time()
        chunks, citations, sources = await rag_svc.retrieve(rag_query)
        context = rag_svc.build_context(chunks)
        messages = rag_svc.build_prompt(rag_query, context)
        answer = await rag_svc.generate_answer(messages, stream=False)
        total_time = time.time() - start
        
        print(f"  Total RAG time: {total_time:.2f}s")
        print(f"  Sources cited:  {len(citations)}")
        print(f"\n  Answer:\n  {answer}")

if __name__ == "__main__":
    asyncio.run(main())
