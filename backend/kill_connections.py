import asyncio
from sqlalchemy import text
from app.db.session import get_session_factory

async def main():
    async with get_session_factory()() as session:
        # Get the database name from the current connection
        db_name = await session.scalar(text("SELECT current_database();"))
        
        print(f"Terminating connections to {db_name}...")
        
        await session.execute(text(f"""
            SELECT pg_terminate_backend(pid) 
            FROM pg_stat_activity 
            WHERE datname = '{db_name}' 
            AND pid <> pg_backend_pid();
        """))
        await session.commit()
        print("Done.")

if __name__ == "__main__":
    asyncio.run(main())
