import asyncio
import os
import sys

sys.path.append(os.path.abspath('.'))
from sqlalchemy import text
from app.db.session import transactional_session
from app.api.quiz import generate_quiz, QuizGenerateRequest
from app.models.user import User

async def main():
    async with transactional_session() as session:
        # Get user for Paper1.pdf
        doc_id = 'c2d4e8e1-bc43-46ac-a73b-af7c1be6c6c6'
        res = await session.execute(text(f"SELECT owner_id FROM documents WHERE id = '{doc_id}'"))
        owner_id = res.scalar()
        
        user = User(id=owner_id)
        request = QuizGenerateRequest(document_id=doc_id, num_questions=3)
        
        print(f"Generating quiz for Paper1.pdf (User {owner_id})...")
        try:
            result = await generate_quiz(body=request, user=user, session=session)
            print("\n===============================")
            print("QUIZ GENERATED SUCCESSFULLY:")
            print("===============================\n")
            import json
            print(json.dumps(result, indent=2))
        except Exception as e:
            print("QUIZ GENERATION FAILED:", e)

if __name__ == "__main__":
    asyncio.run(main())
