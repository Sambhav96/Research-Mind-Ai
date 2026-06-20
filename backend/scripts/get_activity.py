import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import os
from dotenv import load_dotenv

load_dotenv("backend/.env")
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_async_engine(DATABASE_URL)

async def main():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT DATE(started_at), SUM(duration_seconds) FROM study_sessions WHERE user_id='01eaaac2-0213-47b1-984f-0b1d30d45f99' GROUP BY DATE(started_at);"))
        for row in res.fetchall():
            print(row)

asyncio.run(main())
