import asyncio
import sys
import os

sys.path.append(os.path.abspath('.'))
from sqlalchemy import text
from app.db.session import transactional_session

async def main():
    async with transactional_session() as session:
        user_id = '01eaaac2-0213-47b1-984f-0b1d30d45f99'
        res = await session.execute(text(f"SELECT id, user_id, feature_used, duration_seconds, started_at, ended_at, created_at FROM study_sessions WHERE user_id = '{user_id}' ORDER BY created_at DESC;"))
        rows = res.fetchall()
        print(f"Rows for {user_id}: {len(rows)}")
        for r in rows:
            print(r)

asyncio.run(main())
