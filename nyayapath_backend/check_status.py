import asyncio
from core.database import AsyncSessionLocal
from models.grievance_case import GrievanceCase

async def check():
    async with AsyncSessionLocal() as db:
        case = await db.get(GrievanceCase, 'c819314c-652b-4a93-9ca8-a7c14d685cc2')
        if case:
            print(f"Status of the case: {case.status}")
        else:
            print("Case not found.")

if __name__ == "__main__":
    asyncio.run(check())
