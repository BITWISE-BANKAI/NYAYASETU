from core.database import get_db
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

# Dependency injection for database
async def get_db_session(session: AsyncSession = Depends(get_db)):
    yield session
