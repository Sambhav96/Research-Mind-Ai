import asyncio
from sqlalchemy import select
from app.db.session import transactional_session
from app.models.ai_log import AILog

async def main():
    try:
        async with transactional_session() as session:
            stmt = select(AILog)
            result = await session.execute(stmt)
            logs = result.scalars().all()
            print(f"Found {len(logs)} logs.")
            for log in logs:
                print(log.id, log.created_at, log.provider, log.model)
                # simulate schema mapping
                data = {
                    "id": str(log.id),
                    "prompt": log.prompt,
                    "timestamp": log.created_at.isoformat(),
                    "model": log.model,
                    "provider": log.provider,
                    "status": log.status,
                }
                print("Mapped successfully:", data["id"])
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
