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
        print("--- Study Sessions (chat feature) ---")
        res1 = await conn.execute(text("SELECT count(*) FROM study_sessions WHERE feature_used = 'chat';"))
        print(res1.scalar())

        print("--- Chat Sessions ---")
        res2 = await conn.execute(text("SELECT count(*) FROM chat_sessions;"))
        print(res2.scalar())

        print("--- Chat Messages ---")
        res3 = await conn.execute(text("SELECT count(*) FROM chat_messages;"))
        print(res3.scalar())

asyncio.run(main())
