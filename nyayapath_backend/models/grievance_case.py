import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, JSON, DateTime
from sqlalchemy.dialects.postgresql import UUID
from core.database import Base

class GrievanceCase(Base):
    __tablename__ = "grievance_cases"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    status = Column(String(50), nullable=False)
    raw_intake_text = Column(Text, nullable=True)
    extracted_facts = Column(JSON, nullable=True)
    retrieved_statutes = Column(JSON, nullable=True)
    structured_slots = Column(JSON, nullable=True)
    rendered_complaint = Column(Text, nullable=True)
    evidence_strength_score = Column(Integer, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
