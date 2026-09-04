from typing import List, Optional
from pydantic import BaseModel
from uuid import UUID

class RetrievalQuery(BaseModel):
    query_text: str
    top_k: int = 20
    rerank_top_k: int = 3

class RetrievedChunk(BaseModel):
    chunk_id: UUID
    chunk_text: str
    similarity_score: float
    hierarchy_path: str
    chunk_type: str
    parent_id: Optional[UUID]

class RerankedResult(BaseModel):
    chunk_id: UUID
    chunk_text: str
    similarity_score: float
    hierarchy_path: str
    chunk_type: str
    parent_id: Optional[UUID]
    cross_encoder_score: float = 0.0
