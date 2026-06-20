import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.append(os.path.abspath('.'))
from sqlalchemy import text, func
from app.db.session import transactional_session
from app.api.analytics import get_analytics
from app.models.user import User

async def verify_all():
    async with transactional_session() as session:
        # Step 1: Database
        print("STEP 1: Verify Database")
        count_res = await session.execute(text("SELECT COUNT(*) FROM study_sessions;"))
        print(f"Total sessions in DB: {count_res.scalar()}")
        
        print("\nLast 20 Sessions:")
        sessions_res = await session.execute(text("SELECT feature_used, duration_seconds, started_at, ended_at FROM study_sessions ORDER BY created_at DESC LIMIT 20;"))
        for r in sessions_res.fetchall():
            print(r)

        # Step 2: Analytics API
        print("\nSTEP 2: Verify Analytics API")
        user_res = await session.execute(text("SELECT * FROM users ORDER BY created_at DESC LIMIT 1;"))
        user_row = user_res.fetchone()
        
        if not user_row:
            print("No users found.")
            return

        user = User(id=user_row.id, email=user_row.email)
        print(f"Targeting User: {user.email} (ID: {user.id})")
        
        analytics = await get_analytics(user=user, session=session)
        print("\n--- GET /analytics Payload ---")
        print(analytics.model_dump_json(indent=2))

if __name__ == "__main__":
    asyncio.run(verify_all())
