from __future__ import annotations
from typing import List, Optional, Any
from pydantic import BaseModel, Field
from datetime import datetime, timezone

class AssistantSource(BaseModel):
    title: str = Field(..., description="Official title of the retrieved legal enactment or portal guideline")
    citation_label: str = Field(..., description="Section, Rule, or chapter heading citation")
    url: str = Field(..., description="Official verified URL to the statute or e-Jagriti documentation")
    passage_id: str = Field(..., description="Database chunk_id or corpus passage identifier")
    supporting_excerpt: str = Field(..., description="Short grounded excerpt extracted directly from the source")
    published_or_effective_date: Optional[str] = Field(None, description="Statutory gazette or guideline effective date")
    similarity_score: Optional[float] = Field(None, description="Cosine or hybrid retrieval relevance score")

class AssistantChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="User question or input prompt")
    field_id: Optional[str] = Field(None, description="Canonical identifier of the active wizard field")
    step_number: Optional[int] = Field(None, description="Current wizard step (1 to 8)")
    session_id: Optional[str] = Field(None, description="Optional client session identifier")

class AssistantChatResponse(BaseModel):
    answer: str = Field(..., description="Plain-language, empathetic guidance answer strictly grounded in retrieved law")
    sources: List[AssistantSource] = Field(default_factory=list, description="Verified sources retrieved by backend")
    suggested_field_value: Optional[Any] = Field(None, description="Proposed field value based on case facts")
    suggested_value_provenance: Optional[str] = Field(None, description="Provenance rationale for the suggested value")
    needs_user_confirmation: bool = Field(False, description="True if a suggestion was made requiring user review")
    needs_clarification: bool = Field(False, description="True if required facts are missing or conflicting")
    related_field_id: Optional[str] = Field(None, description="Field ID this guidance or suggestion pertains to")
    insufficient_evidence: bool = Field(False, description="True if indexed sources do not establish an answer")

class AssistantChatMessage(BaseModel):
    message_id: str
    role: str  # "user" | "assistant"
    content: str
    field_id: Optional[str] = None
    step_number: Optional[int] = None
    sources: List[AssistantSource] = Field(default_factory=list)
    suggested_field_value: Optional[Any] = None
    suggested_value_provenance: Optional[str] = None
    needs_user_confirmation: bool = False
    needs_clarification: bool = False
    related_field_id: Optional[str] = None
    insufficient_evidence: bool = False
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AssistantHistoryResponse(BaseModel):
    case_id: str
    messages: List[AssistantChatMessage] = Field(default_factory=list)
