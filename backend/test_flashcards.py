import asyncio
import uuid
from sqlalchemy import select
from app.db.session import get_session_factory
from app.repositories.chunk import ChunkRepository
from app.core.config import get_settings
import httpx

async def main():
    doc_id = uuid.UUID('6c09bb58-04e0-4197-9801-796a096f3f38')
    session_factory = get_session_factory()
    
    async with session_factory() as session:
        chunk_repo = ChunkRepository(session)
        chunks = await chunk_repo.get_by_document_id(doc_id)
        
        if not chunks:
            print("No chunks found.")
            return

        all_chunks = chunks
        max_chunks = 15
        if len(all_chunks) > max_chunks:
            step = len(all_chunks) / max_chunks
            sampled_chunks = [all_chunks[int(i * step)] for i in range(max_chunks)]
        else:
            sampled_chunks = all_chunks

        context_text = "\n\n".join([f"Excerpt {i+1}:\n{c.content}" for i, c in enumerate(sampled_chunks)])
        
        num_cards = 20
        prompt = (
            f"Generate {num_cards} flashcards based on the following document excerpts. "
            "Ensure the flashcards cover the most important concepts, terminology, and theories. "
            "Return ONLY a JSON array (no markdown, no explanation) where each item has fields: "
            "id (unique string), front (concept, string), back (explanation, string), source_document (string), page_reference (string), topic (string).\n\n"
            "Document Excerpts:\n"
            f"{context_text}"
        )
        print("--- PROMPT ---")
        print(prompt[:1000] + "...\n[PROMPT TRUNCATED]")
        
        settings = get_settings()
        ai_provider = getattr(settings, "ai_provider", "openai")
        print(f"--- AI PROVIDER: {ai_provider} ---")
        
        try:
            if ai_provider == "gemini":
                async with httpx.AsyncClient() as http_client:
                    gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.gemini_api_key}"
                    gemini_payload = {
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {"temperature": 0.2}
                    }
                    print("Sending request to Gemini...")
                    res = await http_client.post(gemini_url, json=gemini_payload, timeout=60.0)
                    print(f"Status Code: {res.status_code}")
                    if res.status_code != 200:
                        raise Exception(f"Gemini API error: {res.text}")
                    
                    gemini_data = res.json()
                    answer = gemini_data["candidates"][0]["content"]["parts"][0]["text"]
                    print("--- FINAL FLASHCARDS ---")
                    print(answer)
            else:
                from openai import AsyncOpenAI
                client = AsyncOpenAI(api_key=settings.openai_api_key or "invalid_key")
                model_name = "gpt-3.5-turbo"
                print("Sending request to OpenAI...")
                completion = await client.chat.completions.create(
                    model=model_name,
                    temperature=0.2,
                    messages=[{"role": "user", "content": prompt}],
                )
                answer = completion.choices[0].message.content or ""
                print("--- FINAL FLASHCARDS ---")
                print(answer)
        except Exception as e:
            print(f"LLM Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
