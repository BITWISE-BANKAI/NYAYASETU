import asyncio
from core.database import AsyncSessionLocal
from models.grievance_case import GrievanceCase

async def check():
    async with AsyncSessionLocal() as db:
        from sqlalchemy import text
        res = await db.execute(text("SELECT count(*) FROM legal_statutes"))
        print(f"Statutes count: {res.scalar()}")
        res2 = await db.execute(text("SELECT count(*) FROM grievance_cases"))
        print(f"Cases count: {res2.scalar()}")

if __name__ == "__main__":
    asyncio.run(check())
