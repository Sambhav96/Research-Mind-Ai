import asyncio
from app.services.documents import process_document_background
from uuid import UUID

async def main():
    doc_id = UUID("66ff6e23-597e-46d7-9990-88acbd2d4ac0")
    print(f"Processing doc {doc_id}...")
    await process_document_background(doc_id)
    print("Done processing")

if __name__ == "__main__":
    asyncio.run(main())
