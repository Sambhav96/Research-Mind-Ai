import asyncio
from datetime import datetime, timedelta
from sqlalchemy import select, func, cast, Date
from app.db.session import get_session_factory
from app.models.document import Document
from app.models.chat_session import ChatSession

async def main():
    session_factory = get_session_factory()
    async with session_factory() as session:
        # Test 1: Recent Documents
        docs_stmt = select(Document).where(Document.is_deleted.is_(False)).order_by(Document.created_at.desc()).limit(5)
        docs = (await session.execute(docs_stmt)).scalars().all()
        for d in docs:
            print(f"Doc: {d.title} at {d.created_at}")

        # Test 2: Chart Data (Uploads per day over last 7 days)
        now = datetime.now()
        week_start = now - timedelta(days=7)
        chart_stmt = select(
            cast(Document.created_at, Date).label("day"),
            func.count(Document.id).label("count")
        ).where(
            Document.is_deleted.is_(False),
            Document.created_at >= week_start
        ).group_by(
            cast(Document.created_at, Date)
        ).order_by("day")
        chart = (await session.execute(chart_stmt)).all()
        for r in chart:
            print(f"Chart: {r.day} -> {r.count}")

        # Test 3: Total pages
        pages_stmt = select(func.sum(Document.page_count)).where(Document.is_deleted.is_(False))
        pages = (await session.execute(pages_stmt)).scalar()
        print(f"Total pages: {pages}")

if __name__ == "__main__":
    asyncio.run(main())
