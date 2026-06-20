import asyncio
import urllib.request
import json
from app.db.session import get_session_factory
from app.services.auth import AuthService
from app.models.admin import Admin
from app.core.config import get_settings
from datetime import timedelta

async def test():
    factory = get_session_factory()
    async with factory() as session:
        # Find super admin
        from sqlalchemy import select
        result = await session.execute(select(Admin).filter(Admin.role == "SUPER_ADMIN"))
        admin = result.scalars().first()
        if not admin:
            print("No super admin found!")
            return
            
        settings = get_settings()
        auth_service = AuthService(session, settings)
        
        access_token = auth_service._encode_token(admin.id, "access", timedelta(hours=1))
        
        print("Got token")
        
        endpoints = [
            "/admin/management/admins",
            "/admin/management/requests",
            "/admin/management/logs"
        ]
        
        for endpoint in endpoints:
            url = f"http://localhost:8000{endpoint}"
            try:
                req = urllib.request.Request(url, headers={"Authorization": f"Bearer {access_token}"})
                res = urllib.request.urlopen(req)
                print(f"{endpoint}: {res.status}")
                print(res.read().decode()[:100])
            except urllib.error.HTTPError as e:
                print(f"{endpoint} Failed: {e.code}")
                print(e.read().decode())
            except Exception as e:
                print(f"{endpoint} Error: {e}")

asyncio.run(test())
