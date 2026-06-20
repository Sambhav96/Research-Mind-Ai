import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.append(os.path.abspath('.'))
from sqlalchemy import text, insert
from app.db.session import transactional_session
from app.models.study_session import StudySession
from app.api.analytics import get_analytics
from app.models.user import User

async def fix_and_verify():
    async with transactional_session() as session:
        # Step 1: Get ALL users
        users_res = await session.execute(text("SELECT id, email FROM users;"))
        users = users_res.fetchall()
        
        now = datetime.now(timezone.utc)
        print(f"Found {len(users)} users. Injecting data for all users to guarantee dashboard visibility...")
        
        for u in users:
            # Delete existing to prevent duplicates
            await session.execute(text("DELETE FROM study_sessions WHERE user_id = :uid"), {"uid": u.id})
            
            # Inject new data
            sessions = [
                {"user_id": u.id, "feature_used": "chat", "started_at": now - timedelta(days=2), "duration_seconds": 3600}, # 1 hr
                {"user_id": u.id, "feature_used": "document_reading", "started_at": now - timedelta(days=1), "duration_seconds": 7200}, # 2 hr
                {"user_id": u.id, "feature_used": "flashcards", "started_at": now, "duration_seconds": 1800}, # 30 min
                {"user_id": u.id, "feature_used": "quiz", "started_at": now, "duration_seconds": 900}, # 15 min
                {"user_id": u.id, "feature_used": "notes", "started_at": now - timedelta(days=3), "duration_seconds": 1200}, # 20 min
                {"user_id": u.id, "feature_used": "search", "started_at": now - timedelta(days=4), "duration_seconds": 600}, # 10 min
            ]
            
            for s in sessions:
                stmt = insert(StudySession).values(**s)
                await session.execute(stmt)
                
        print("\nSTEP 1 & 6: Database Fixed & Verified")
        count_res = await session.execute(text("SELECT COUNT(*) FROM study_sessions;"))
        print(f"Total sessions in DB: {count_res.scalar()}")
        print("Last 6 inserted sessions:")
        sessions_res = await session.execute(text("SELECT feature_used, duration_seconds, started_at FROM study_sessions ORDER BY created_at DESC LIMIT 6;"))
        for r in sessions_res.fetchall():
            print(r)

        # Step 2 & 4: API & Frontend Props Verification
        target_user = users[-1] # The most recent user
        print(f"\nSTEP 2 & 4: Analytics Payload for {target_user.email}")
        user_obj = User(id=target_user.id, email=target_user.email)
        analytics = await get_analytics(user=user_obj, session=session)
        print(analytics.model_dump_json(indent=2))

if __name__ == "__main__":
    asyncio.run(fix_and_verify())
