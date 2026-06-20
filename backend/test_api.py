import asyncio
import sys
from app.db.session import SessionLocal
from app.api.admin_management import list_admin_requests

async def test():
    async with SessionLocal() as session:
        try:
            requests = await list_admin_requests(None, session)
            print("Requests:", requests)
        except Exception as e:
            print("Error list_admin_requests:", e)

asyncio.run(test())
