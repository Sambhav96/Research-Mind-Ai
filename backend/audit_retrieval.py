import asyncio
import json
import time
from sqlalchemy import text
from app.db.session import transactional_session
from app.services.rag import RAGService
from app.repositories.user import UserRepository

async def main():
    async with transactional_session() as session:
        doc_id = "66ff6e23-597e-46d7-9990-88acbd2d4ac0"
        
        doc_res = await session.execute(text(f"SELECT owner_id FROM documents WHERE id='{doc_id}'"))
        owner_id = str(doc_res.fetchone()[0])
        
        rag_svc = RAGService(session)
        
        queries = [
            "Summarize this paper",
            "What are the key contributions?",
            "What is the methodology?",
            "What are the limitations?",
            "Give me the conclusion",
            "Generate study notes"
        ]
        
        results = []
        for i, q in enumerate(queries):
            if i > 0:
                print("Waiting 20 seconds to avoid 429 rate limits...")
                time.sleep(20)
                
            print(f"Testing Query: {q}")
            t0 = time.time()
            
            try:
                # Retrieval
                chunks, citations, sources = await rag_svc.retrieve(
                    query=q,
                    owner_id=owner_id,
                    document_ids=[doc_id]
                )
                
                # Generation
                context = rag_svc.build_context(chunks)
                messages = rag_svc.build_prompt(q, context, [])
                answer = await rag_svc.generate_answer(messages)
                
                dur = time.time() - t0
                
                retrieved_pages = [s.page for s in sources]
                scores = [round(s.relevance_score, 3) for s in sources]
                
                results.append({
                    "query": q,
                    "retrieved_pages": retrieved_pages,
                    "scores": scores,
                    "answer": answer,
                    "latency_s": round(dur, 2)
                })
                print(f"-> Latency: {round(dur, 2)}s, Chunks: {len(chunks)}")
            except Exception as e:
                print(f"Error on query '{q}': {e}")
        
        with open("retrieval_benchmark.json", "w") as f:
            json.dump(results, f, indent=2)
            
        print("Retrieval benchmark saved.")

if __name__ == "__main__":
    asyncio.run(main())
