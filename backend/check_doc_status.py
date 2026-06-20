import asyncio
from sqlalchemy import text
from app.db.session import transactional_session

async def main():
    async with transactional_session() as s:
        res = await s.execute(text("SELECT status, processing_progress FROM documents WHERE id='66ff6e23-597e-46d7-9990-88acbd2d4ac0'"))
        print(res.fetchone())

if __name__ == "__main__":
    asyncio.run(main())


