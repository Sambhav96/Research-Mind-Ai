import asyncio
import json
from uuid import UUID
from app.db.session import transactional_session
from app.repositories.chunk import ChunkRepository
from app.core.config import get_settings
from app.services.ai.gemini_provider import GeminiGenerationProvider
from app.api.quiz import _parse_json_list
from app.api.flashcards import _parse_json_list as parse_flashcards

async def main():
    async with transactional_session() as session:
        # Use IOT Case Study which has chunks
        doc_id = UUID("6c09bb58-04e0-4197-9801-796a096f3f38")
        chunk_repo = ChunkRepository(session)
        chunks = await chunk_repo.get_by_document_id(doc_id)
        
        if not chunks:
            print("No chunks found!")
            return
            
        print(f"Found {len(chunks)} chunks.")
        
        max_chunks = 2 # VERY FEW CHUNKS TO REDUCE TOKEN USAGE
        if len(chunks) > max_chunks:
            step = len(chunks) / max_chunks
            sampled_chunks = [chunks[int(i * step)] for i in range(max_chunks)]
        else:
            sampled_chunks = chunks
            
        context_text = "\n\n---\n\n".join([f"Excerpt from Page {c.page_number}:\n{c.content}" for c in sampled_chunks])
        
        settings = get_settings()
        gen = GeminiGenerationProvider(
            api_key=settings.gemini_api_key,
            model=settings.gemini_model,
            temperature=0.2,
            max_tokens=settings.gemini_max_tokens,
        )
        
        # QUIZ
        print("Validating Quiz...")
        prompt = f"""You are an expert educational assessment creator.

Context material from the document:
{context_text}

Task:
Generate exactly 2 multiple-choice questions based STRICTLY on the context above.
Focus on: core concepts, terminology, definitions, key theories, and methodologies.

Return a JSON array. Each item must have:
- "id": unique string (e.g. "q1", "q2")
- "question": the question text (string)
- "options": array of exactly 4 strings (the answer choices)
- "correct": integer 0-3 (index of the correct option)
- "explanation": why the correct answer is correct (string)
- "topic": the concept being tested (string)

Return ONLY the JSON array with no markdown or explanation."""

        result = await gen.generate(prompt, response_json=True)
        questions = _parse_json_list(result.text)
        with open("quiz_validation_audit.json", "w") as f:
            json.dump(questions, f, indent=2)
        print("Quiz validation saved.")
        
        # FLASHCARDS
        print("Validating Flashcards...")
        prompt2 = f"""You are an expert educational study aide creator.

Context material from the document:
{context_text}

Task:
Generate exactly 2 flashcards based STRICTLY on the context above.

Return a JSON array. Each item must have:
- "id": unique string (e.g. "f1", "f2")
- "front": the term, concept, or question (string)
- "back": the definition, explanation, or answer (string)

Return ONLY the JSON array with no markdown or explanation."""

        result2 = await gen.generate(prompt2, response_json=True)
        cards = parse_flashcards(result2.text)
        with open("flashcard_validation_audit.json", "w") as f:
            json.dump(cards, f, indent=2)
        print("Flashcard validation saved.")

if __name__ == "__main__":
    asyncio.run(main())
