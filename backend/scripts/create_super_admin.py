"""Create a super admin utility script."""

import asyncio
import getpass
import sys
from pathlib import Path

# Add the parent directory to sys.path to import app modules
sys.path.append(str(Path(__file__).resolve().parent.parent))

from app.core.config import get_settings
from app.db.session import async_session_maker
from app.models.admin import Admin, AdminRole
from app.services.admin_auth import AdminAuthService


async def main():
    settings = get_settings()
    
    print("=== Create Super Admin ===")
    name = input("Enter full name: ").strip()
    email = input("Enter email: ").strip().lower()
    
    if not name or not email:
        print("Name and email are required.")
        return
        
    password = getpass.getpass("Enter password (min 8 chars): ")
    if len(password) < 8:
        print("Password must be at least 8 characters.")
        return
        
    confirm_password = getpass.getpass("Confirm password: ")
    if password != confirm_password:
        print("Passwords do not match.")
        return

    async with async_session_maker() as session:
        auth_service = AdminAuthService(session, settings)
        
        # Check if email exists
        existing = await auth_service.get_admin_by_email(email)
        if existing:
            print(f"Error: An admin with email {email} already exists.")
            return
            
        password_hash = auth_service._hash_password(password)
        admin = Admin(
            email=email,
            password_hash=password_hash,
            name=name,
            role=AdminRole.SUPER_ADMIN
        )
        
        session.add(admin)
        await session.commit()
        
        print(f"\nSuccess! Super admin created for {email}.")
        print("You can now login at /admin/login.")

if __name__ == "__main__":
    asyncio.run(main())
