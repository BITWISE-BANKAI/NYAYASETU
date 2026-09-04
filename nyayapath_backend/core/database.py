from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from core.config import settings

engine = create_async_engine(settings.database_url, echo=False)
AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()

async def init_db():
    """
    Initialize the database, creating the pgvector extension if it doesn't exist.
    """
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        # We don't create tables here to allow migrations tool like alembic,
        # but for this script we could conditionally create tables or use init_db.sql.
        
async def get_db():
    """
    Dependency to get the database session.
    """
    async with AsyncSessionLocal() as session:
        yield session

# Need text import for the raw sql above
from sqlalchemy import text
