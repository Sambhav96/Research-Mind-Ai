import asyncio
from app.db.session import get_session_factory
from sqlalchemy import select

async def test():
    factory = get_session_factory()
    async with factory() as session:
        try:
            from app.models.admin_request import AdminRequest
            query = select(AdminRequest).order_by(AdminRequest.created_at.desc())
            result = await session.execute(query)
            requests = result.scalars().all()
            print("Found requests:", len(requests))
            for r in requests:
                print("Status type:", type(r.status))
                print("Status value:", r.status.value)
                print("Created at:", r.created_at.isoformat())
        except Exception as e:
            print("Error:", e)
            import traceback
            traceback.print_exc()

asyncio.run(test())
