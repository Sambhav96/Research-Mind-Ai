import asyncio
from app.db.session import get_session_factory
from app.services.admin_stats import AdminStatsService

async def main():
    async with get_session_factory()() as session:
        service = AdminStatsService(session)
        try:
            stats = await service.get_overview_stats()
            print("Success!", stats.users.total)
        except Exception as e:
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
