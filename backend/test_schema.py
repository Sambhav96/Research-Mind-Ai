import asyncio
from sqlalchemy import text
from app.db.session import get_session_factory

async def main():
    async with get_session_factory()() as session:
        result = await session.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='users';"))
        columns = [row[0] for row in result.all()]
        print("Columns in users table:", columns)

if __name__ == "__main__":
    asyncio.run(main())
