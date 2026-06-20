import asyncio
from sqlalchemy import text
from app.db.session import transactional_session

async def main():
    async with transactional_session() as session:
        res = await session.execute(text("SELECT document_id, COUNT(*) as c FROM chunks GROUP BY document_id"))
        print("Chunks:", res.fetchall())

        res2 = await session.execute(text("SELECT id, title, file_path FROM documents"))
        print("Documents:", res2.fetchall())

if __name__ == "__main__":
    asyncio.run(main())
