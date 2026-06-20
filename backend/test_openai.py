import asyncio
from openai import AsyncOpenAI
import os
from app.core.config import get_settings

async def main():
    settings = get_settings()
    client = AsyncOpenAI(api_key=settings.openai_api_key)
    response = await client.embeddings.create(
        model=settings.embedding_model,
        input=["Hello world"]
    )
    e = response.data[0]
    print("type(e):", type(e))
    print("hasattr:", hasattr(e, "embedding"))
    
    if hasattr(e, "embedding"):
        print("Length of embedding:", len(e.embedding))
    else:
        print("Attributes:", dir(e))

asyncio.run(main())
