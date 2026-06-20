import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv("backend/.env")
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_async_engine(DATABASE_URL)

async def main():
    async with engine.connect() as conn:
        print('--- User Sessions ---')
        res = await conn.execute(text("SELECT id, duration_seconds FROM study_sessions WHERE user_id='01eaaac2-0213-47b1-984f-0b1d30d45f99';"))
        for row in res.fetchall():
            print(f"{row[0]} | {row[1]}")

asyncio.run(main())
