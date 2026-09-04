import asyncio
from sqlalchemy import select
from core.database import AsyncSessionLocal
from models.grievance_case import GrievanceCase
from api.v1.endpoints_cases import process_case_pipeline

async def test():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(GrievanceCase).order_by(GrievanceCase.created_at.desc()).limit(1))
        case = res.scalar_one_or_none()
        if case:
            print('testing case', case.id)
            try:
                await process_case_pipeline(case.id, case.raw_intake_text, db)
            except Exception as e:
                import traceback
                traceback.print_exc()
            
            case = await db.get(GrievanceCase, case.id)
            print('status:', case.status)

if __name__ == "__main__":
    asyncio.run(test())
