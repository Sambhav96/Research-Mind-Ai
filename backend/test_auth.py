import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker
from app.db.session import get_engine
from app.services.admin_auth import AdminAuthService
from app.models.admin import Admin
from app.core.config import get_settings
from sqlalchemy import select

async def main():
    settings = get_settings()
    engine = get_engine()
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        service = AdminAuthService(session, settings)
        result = await session.execute(select(Admin))
        admin = result.scalars().first()
        
        if not admin:
            print("No admin found. Creating one.")
            from app.schemas.admin import AdminRegisterRequest
            req = AdminRegisterRequest(email="admin@example.com", name="Admin", password="Password123", confirm_password="Password123")
            tokens = await service.register(req, None)
            print("Token:", tokens.access_token)
        else:
            print("Found admin:", admin.email)
            tokens = service._generate_tokens(admin)
            print("Token:", tokens.response.access_token)

asyncio.run(main())
