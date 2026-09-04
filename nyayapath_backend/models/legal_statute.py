import uuid
from sqlalchemy import Column, String, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from pgvector.sqlalchemy import Vector
from core.database import Base

class LegalStatute(Base):
    __tablename__ = "legal_statutes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_title = Column(String, nullable=False)
    chunk_text = Column(Text, nullable=False)
    # Dimension is dynamic to support qwen3-embedding:0.6b or others
    embedding = Column(Vector())
    # Metadata includes hierarchy_path, chunk_type, parent_id, is_current, jurisdiction, effective_date, document_type
    metadata_col = Column(JSON, nullable=False)
