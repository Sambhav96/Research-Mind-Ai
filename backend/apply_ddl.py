import asyncio
from sqlalchemy import text
from app.db.session import get_session_factory

async def main():
    async with get_session_factory()() as session:
        print("Creating user_metadata table...")
        await session.execute(text("""
            CREATE TABLE IF NOT EXISTS user_metadata (
                user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                plan VARCHAR(32) NOT NULL DEFAULT 'free',
                research_score INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """))
        await session.commit()
        print("Done!")

if __name__ == "__main__":
    asyncio.run(main())
