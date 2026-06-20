# test_openrouter.py

from openai import AsyncOpenAI
import asyncio
import os

client = AsyncOpenAI(
    api_key=os.getenv("OPENROUTER_API_KEY"),
    base_url="https://openrouter.ai/api/v1"
)

async def main():
    resp = await client.chat.completions.create(
        model="meta-llama/llama-3-8b-instruct",
        messages=[
            {"role":"user","content":"hello"}
        ]
    )

    print(resp.choices[0].message.content)

asyncio.run(main())