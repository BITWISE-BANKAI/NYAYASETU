from typing import Any, Optional, Generic, TypeVar
from pydantic import BaseModel
from uuid import UUID

T = TypeVar('T')

class ApiResponse(BaseModel, Generic[T]):
    success: bool
    data: Optional[T] = None
    error: Optional[str] = None

class CaseProgress(BaseModel):
    case_id: UUID
    current_stage: str # intake, stage1_ocr, stage2_facts, stage3_retrieval, stage4_generation, complete, failed
    status_message: str
