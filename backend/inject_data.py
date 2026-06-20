import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.append(os.path.abspath('.'))
from sqlalchemy import text, insert
from app.db.session import transactional_session
from app.models.study_session import StudySession

async def inject_data():
    async with transactional_session() as session:
        # Get first user
        res = await session.execute(text("SELECT id FROM users LIMIT 1;"))
        user_id = res.scalar()
        if not user_id:
            print("No users found!")
            return

        print(f"Injecting data for user: {user_id}")
        
        now = datetime.now(timezone.utc)
        sessions = [
            {"user_id": user_id, "feature_used": "chat", "started_at": now - timedelta(days=2), "duration_seconds": 3600}, # 1 hr
            {"user_id": user_id, "feature_used": "document_reading", "started_at": now - timedelta(days=1), "duration_seconds": 7200}, # 2 hr
            {"user_id": user_id, "feature_used": "flashcards", "started_at": now, "duration_seconds": 1800}, # 30 min
            {"user_id": user_id, "feature_used": "quiz", "started_at": now, "duration_seconds": 900}, # 15 min
            {"user_id": user_id, "feature_used": "notes", "started_at": now - timedelta(days=3), "duration_seconds": 1200}, # 20 min
            {"user_id": user_id, "feature_used": "search", "started_at": now - timedelta(days=4), "duration_seconds": 600}, # 10 min
        ]
        
        for s in sessions:
            stmt = insert(StudySession).values(**s)
            await session.execute(stmt)
            
        print("Data injected successfully.")
        
        # Verify
        res = await session.execute(text("SELECT feature_used, duration_seconds FROM study_sessions ORDER BY created_at DESC LIMIT 5;"))
        print(res.fetchall())

if __name__ == "__main__":
    asyncio.run(inject_data())
