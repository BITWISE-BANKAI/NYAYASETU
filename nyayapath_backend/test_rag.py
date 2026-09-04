import asyncio
from core.database import AsyncSessionLocal
from services.stage3_rag_service import retrieve_parent_statutes
import logging

logging.basicConfig(level=logging.DEBUG)

async def test():
    async with AsyncSessionLocal() as db:
        print("Starting retrieval...")
        res = await retrieve_parent_statutes(db, "defective laptop")
        print(f"Results: {res}")

if __name__ == "__main__":
    asyncio.run(test())
