import asyncio
import os
import sys

# Add the app directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.db.session import async_session_maker

async def check():
    async with async_session_maker() as session:
        # Check study sessions
        res = await session.execute(text("SELECT * FROM study_sessions ORDER BY created_at DESC LIMIT 20;"))
        print("--- Study Sessions ---")
        rows = res.fetchall()
        for r in rows:
            print(r)
        if not rows:
            print("No study sessions found.")
            
        count = await session.execute(text("SELECT COUNT(*) FROM study_sessions;"))
        print(f"Total sessions: {count.scalar()}")

if __name__ == "__main__":
    asyncio.run(check())
