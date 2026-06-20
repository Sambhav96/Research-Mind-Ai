import asyncio
from app.db.session import get_session_factory
from app.models.admin_request import AdminRequest, AdminRequestStatus
import uuid

async def test():
    factory = get_session_factory()
    async with factory() as session:
        try:
            req = AdminRequest(
                id=str(uuid.uuid4()),
                name="Test",
                email="test@example.com",
                password_hash="mock",
                status=AdminRequestStatus.PENDING
            )
            session.add(req)
            await session.commit()
            print("Added request")
        except Exception as e:
            print("Error:", e)

asyncio.run(test())
