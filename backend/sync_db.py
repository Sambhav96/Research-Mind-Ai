import asyncio
from app.db.base import Base
from app.db.session import engine
from app.models.error_log import ErrorLog

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database synced")

if __name__ == "__main__":
    asyncio.run(init_db())
