from __future__ import annotations
from enum import Enum
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime

class FieldStatus(str, Enum):
    CONFIRMED = "confirmed"
    SUGGESTED = "suggested"
    MISSING = "missing"
    CONFLICT = "conflict"
    UNKNOWN = "unknown"
    NOT_APPLICABLE = "not_applicable"

class ProvenanceKind(str, Enum):
    USER_INPUT = "user_input"
    UPLOADED_DOCUMENT = "uploaded_document"
    EXISTING_CASE = "existing_case"
    DETERMINISTIC_RULE = "deterministic_rule"
    UNKNOWN = "unknown"

class FieldProvenance(BaseModel):
    kind: ProvenanceKind = ProvenanceKind.UNKNOWN
    source_id: Optional[str] = None
    source_label: Optional[str] = None
    page: Optional[int] = None
    text_span: Optional[str] = None

class GuidedFieldValue(BaseModel):
    field_id: str
    label: str
    value: Optional[Any] = None
    value_type: str = "string"  # string, money, date, entity, text, select
    status: FieldStatus = FieldStatus.MISSING
    provenance: Optional[FieldProvenance] = None
    user_confirmed: bool = False
    is_required: bool = False
    validation_errors: List[str] = Field(default_factory=list)
    help_prompt: Optional[str] = None
    placeholder: Optional[str] = None
    options: Optional[List[str]] = None

class FormSection(BaseModel):
    section_id: str
    title: str
    description: str
    step_number: int
    fields: List[GuidedFieldValue] = Field(default_factory=list)
    is_completed: bool = False

class GuidanceSource(BaseModel):
    title: str
    section: str
    url: str
    published_or_effective_date: Optional[str] = None
    retrieved_excerpt: str
    chunk_id: Optional[str] = None
    similarity_score: Optional[float] = None

class FieldGuidanceRequest(BaseModel):
    field_id: str
    section_id: Optional[str] = None
    user_query: Optional[str] = None
    current_value: Optional[Any] = None

class FieldGuidanceResponse(BaseModel):
    field_id: str
    explanation: str
    suggested_next_question: Optional[str] = None
    sources: List[GuidanceSource] = Field(default_factory=list)
    grounding_status: str  # "supported" | "insufficient_sources"

class ConflictItem(BaseModel):
    conflict_id: str
    field_id: str
    field_label: str
    description: str
    source_a: Dict[str, Any]  # {label: "From Intake Narrative", value: "September 2024"}
    source_b: Dict[str, Any]  # {label: "From Service Job Sheet", value: "October 2024"}
    is_resolved: bool = False
    resolved_value: Optional[Any] = None
    resolution_note: Optional[str] = None

class ResolveConflictRequest(BaseModel):
    conflict_id: str
    field_id: str
    resolution_choice: str  # "use_source_a" | "use_source_b" | "custom_value" | "mark_unknown"
    resolved_value: Optional[Any] = None
    notes: Optional[str] = None

class RequirementLevel(str, Enum):
    MANDATORY_FILING = "mandatory_filing_instruction"
    RECOMMENDED = "recommended_evidence"
    CLARIFICATION_ONLY = "clarification_only"

class EvidenceStatus(str, Enum):
    PROVIDED = "provided"
    MISSING = "missing"
    UNREADABLE = "unreadable"
    NOT_REVIEWED = "not_reviewed"
    NOT_APPLICABLE = "not_applicable"

class EvidenceChecklistItem(BaseModel):
    item_id: str
    document_type: str
    title: str
    description: str
    status: EvidenceStatus = EvidenceStatus.MISSING
    requirement_level: RequirementLevel = RequirementLevel.RECOMMENDED
    statutory_basis: Optional[str] = None
    file_reference: Optional[str] = None

class PatchFieldRequest(BaseModel):
    value: Optional[Any] = None
    status: Optional[FieldStatus] = None
    user_confirmed: Optional[bool] = None
    mark_unknown: Optional[bool] = False

class FormValidationError(BaseModel):
    field_id: str
    section_id: str
    message: str

class FormValidationWarning(BaseModel):
    field_id: str
    section_id: str
    message: str

class PecuniaryJurisdictionInfo(BaseModel):
    consideration_amount_inr: float
    forum_name: str
    statutory_rule: str
    claim_amount_inr: Optional[float] = None
    is_split_clean: bool = True

class GuidedFormValidationResponse(BaseModel):
    is_valid_for_drafting: bool
    blocking_errors: List[FormValidationError] = Field(default_factory=list)
    warnings: List[FormValidationWarning] = Field(default_factory=list)
    pecuniary_jurisdiction: Optional[PecuniaryJurisdictionInfo] = None

class GuidedFormState(BaseModel):
    case_id: UUID
    current_step: int = 1
    total_steps: int = 8
    sections: List[FormSection] = Field(default_factory=list)
    evidence_checklist: List[EvidenceChecklistItem] = Field(default_factory=list)
    conflicts: List[ConflictItem] = Field(default_factory=list)
    completion_percentage: int = 0
    is_ready_for_draft: bool = False
    last_saved_at: Optional[datetime] = None
