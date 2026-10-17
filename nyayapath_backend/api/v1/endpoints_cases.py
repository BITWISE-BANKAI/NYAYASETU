from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID, uuid4
from api.dependencies import get_db_session
from schemas.api_responses import ApiResponse, CaseProgress
from models.grievance_case import GrievanceCase
from services.stage2_fact_service import extract_facts
from services.stage3_rag_service import retrieve_parent_statutes
from services.stage4_generator_service import generate_complaint_slots
from services.template_service import render_final_dcdrc_complaint
from pydantic import BaseModel

router = APIRouter()

from core.database import AsyncSessionLocal

class SubmitCaseRequest(BaseModel):
    intake_text: str


async def process_case_pipeline(case_id: UUID, text: str):
    """
    Background task to run the pipeline (Stage 1 -> 4).
    Uses its own dedicated session to prevent request-scoped closure errors.
    """
    async with AsyncSessionLocal() as db:
        try:
            case = await db.get(GrievanceCase, case_id)
            if not case:
                return
                
            # Stage 2: Extract facts if not already extracted
            if not case.extracted_facts:
                case.status = 'stage2_extraction'
                await db.commit()
                facts = await extract_facts(text, {})
                case.extracted_facts = facts.model_dump()
                case.evidence_strength_score = facts.evidence_strength_score
            else:
                from schemas.extracted_facts import ExtractedConsumerFacts
                facts = ExtractedConsumerFacts(**case.extracted_facts)
            
            # Ensure guided form state is synchronized with facts
            if not case.guided_form_state:
                from services.guided_form_service import _build_initial_state_from_facts
                state = _build_initial_state_from_facts(case_id, case.extracted_facts, text)
                case.guided_form_state = state.model_dump(mode="json")
                await db.commit()
            
            case.status = 'stage3_rag'
            await db.commit()
            
            # Stage 3
            # Use the neutral summary or raw text for the query
            query_text = facts.issue_summary_neutral or text
            retrieved = await retrieve_parent_statutes(db, query_text)
            
            case.status = 'stage4_generation'
            await db.commit()
            
            # Stage 4
            slots = await generate_complaint_slots(facts, retrieved)
            rendered_complaint = render_final_dcdrc_complaint(facts, slots)
            
            case.rendered_complaint = rendered_complaint
            case.status = 'complete'
            await db.commit()
            
        except Exception as e:
            await db.rollback()
            try:
                case = await db.get(GrievanceCase, case_id)
                if case:
                    case.status = 'error'
                    await db.commit()
            except Exception:
                pass
            print(f"Pipeline error for case {case_id}: {e}")

@router.post("/submit", response_model=ApiResponse[UUID])
async def submit_case(request: SubmitCaseRequest, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db_session)):
    case_id = uuid4()
    
    new_case = GrievanceCase(id=case_id, status="intake", raw_intake_text=request.intake_text)
    db.add(new_case)
    await db.commit()
    
    # Extract facts immediately so guided form and dashboard are populated from the first render
    try:
        from services.guided_form_service import _build_initial_state_from_facts
        facts = await extract_facts(request.intake_text, {})
        new_case.extracted_facts = facts.model_dump()
        new_case.evidence_strength_score = facts.evidence_strength_score
        new_case.status = "stage2_extraction"
        state = _build_initial_state_from_facts(case_id, new_case.extracted_facts, request.intake_text)
        new_case.guided_form_state = state.model_dump(mode="json")
        await db.commit()
    except Exception as e:
        print(f"Fact extraction during submit error: {e}")
        
    background_tasks.add_task(process_case_pipeline, case_id, request.intake_text)
    
    return ApiResponse(success=True, data=case_id)

from services.guided_form_service import DEMO_CASE_UUIDS

def parse_case_id(case_id_str: str) -> UUID:
    if case_id_str in DEMO_CASE_UUIDS:
        return DEMO_CASE_UUIDS[case_id_str]
    try:
        return UUID(case_id_str)
    except Exception:
        raise HTTPException(status_code=404, detail=f"Invalid case identifier: {case_id_str}")

@router.get("/{case_id}/status", response_model=ApiResponse[CaseProgress])
async def get_case_status(case_id: str, db: AsyncSession = Depends(get_db_session)):
    uid = parse_case_id(case_id)
    case = await db.get(GrievanceCase, uid)
    if not case:
        if uid in DEMO_CASE_UUIDS.values():
            await get_or_initialize_guided_form(db, uid)
            case = await db.get(GrievanceCase, uid)
        else:
            raise HTTPException(status_code=404, detail="Case not found")
        
    return ApiResponse(
        success=True,
        data=CaseProgress(case_id=uid, current_stage=case.status, status_message=f"Case is in {case.status} stage")
    )

@router.get("/{case_id}/complaint")
async def get_complaint(case_id: str, db: AsyncSession = Depends(get_db_session)):
    uid = parse_case_id(case_id)
    case = await db.get(GrievanceCase, uid)
    if not case:
        if uid in DEMO_CASE_UUIDS.values():
            await get_or_initialize_guided_form(db, uid)
            case = await db.get(GrievanceCase, uid)
        else:
            raise HTTPException(status_code=404, detail="Case not found")
        
    if case.status != "complete":
        raise HTTPException(status_code=400, detail="Complaint generation is not complete")
        
    return ApiResponse(
        success=True, 
        data={
            "case_id": str(case.id),
            "rendered_complaint": case.rendered_complaint,
            "evidence_strength_score": case.evidence_strength_score,
            "missing_mandatory_fields": case.extracted_facts.get("missing_mandatory_fields", []) if case.extracted_facts else [],
            "facts": case.extracted_facts or {},
            "guided_form_state": case.guided_form_state or {}
        }
    )

# ==========================================
# NyayaSetu Consumer Bridge: Guided Form Endpoints
# ==========================================

from schemas.guided_form import (
    GuidedFormState, PatchFieldRequest, FieldGuidanceRequest,
    FieldGuidanceResponse, ResolveConflictRequest, EvidenceChecklistItem,
    GuidedFormValidationResponse
)
from services.guided_form_service import (
    get_or_initialize_guided_form, patch_guided_form_field,
    resolve_conflict_item, get_field_guidance,
    validate_guided_form_state, generate_draft_from_guided_form
)

@router.get("/{case_id}/guided-form", response_model=ApiResponse[GuidedFormState])
async def get_guided_form(case_id: str, db: AsyncSession = Depends(get_db_session)):
    """
    Retrieves the guided form state with section navigation, provenance, and statuses.
    """
    try:
        uid = parse_case_id(case_id)
        state = await get_or_initialize_guided_form(db, uid)
        return ApiResponse(success=True, data=state)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch guided form: {e}")

@router.patch("/{case_id}/guided-form/fields/{field_id}", response_model=ApiResponse[GuidedFormState])
async def patch_field(case_id: str, field_id: str, request: PatchFieldRequest, db: AsyncSession = Depends(get_db_session)):
    """
    Saves/updates an individual form field with value, status, or confirmation.
    """
    try:
        uid = parse_case_id(case_id)
        updated_state = await patch_guided_form_field(
            db=db,
            case_id=uid,
            field_id=field_id,
            value=request.value,
            status=request.status,
            user_confirmed=request.user_confirmed,
            mark_unknown=request.mark_unknown or False
        )
        return ApiResponse(success=True, data=updated_state)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update field: {e}")

@router.post("/{case_id}/guided-form/guidance", response_model=ApiResponse[FieldGuidanceResponse])
async def field_guidance(case_id: str, request: FieldGuidanceRequest, db: AsyncSession = Depends(get_db_session)):
    """
    Context-aware RAG: retrieves official filing and statutory guidance with citations.
    """
    try:
        parse_case_id(case_id)
        guidance = await get_field_guidance(
            db=db,
            field_id=request.field_id,
            section_id=request.section_id,
            user_query=request.user_query,
            current_value=request.current_value
        )
        return ApiResponse(success=True, data=guidance)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve guidance: {e}")

@router.post("/{case_id}/guided-form/clarifications", response_model=ApiResponse[GuidedFormState])
async def resolve_clarification(case_id: str, request: ResolveConflictRequest, db: AsyncSession = Depends(get_db_session)):
    """
    Resolves fact contradictions or clarification follow-ups.
    """
    try:
        uid = parse_case_id(case_id)
        state = await resolve_conflict_item(
            db=db,
            case_id=uid,
            conflict_id=request.conflict_id,
            field_id=request.field_id,
            resolution_choice=request.resolution_choice,
            resolved_value=request.resolved_value,
            notes=request.notes
        )
        return ApiResponse(success=True, data=state)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to resolve clarification: {e}")

@router.get("/{case_id}/evidence-checklist", response_model=ApiResponse[List[EvidenceChecklistItem]])
async def get_evidence_checklist(case_id: str, db: AsyncSession = Depends(get_db_session)):
    """
    Returns evidence checklist distinguishing mandatory from recommended documents.
    """
    try:
        uid = parse_case_id(case_id)
        state = await get_or_initialize_guided_form(db, uid)
        return ApiResponse(success=True, data=state.evidence_checklist)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{case_id}/guided-form/validate", response_model=ApiResponse[GuidedFormValidationResponse])
async def validate_form(case_id: str, db: AsyncSession = Depends(get_db_session)):
    """
    Deterministic validation returning blocking errors, warnings, and pecuniary forum.
    """
    try:
        uid = parse_case_id(case_id)
        state = await get_or_initialize_guided_form(db, uid)
        validation = validate_guided_form_state(state)
        return ApiResponse(success=True, data=validation)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{case_id}/guided-form/draft")
async def draft_complaint_from_form(case_id: str, db: AsyncSession = Depends(get_db_session)):
    """
    Triggers the existing legal drafting pipeline using verified guided form fields.
    """
    try:
        uid = parse_case_id(case_id)
        result = await generate_draft_from_guided_form(db, uid)
        return ApiResponse(success=True, data=result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Drafting failed: {e}")


# ==========================================
# Context-Aware Legal RAG Chatbot Endpoints
# ==========================================

from schemas.assistant import (
    AssistantChatRequest, AssistantChatResponse,
    AssistantHistoryResponse, AssistantChatMessage
)
from services.assistant_service import generate_assistant_response

@router.post("/{case_id}/assistant/chat", response_model=ApiResponse[AssistantChatResponse])
async def assistant_chat(
    case_id: str,
    request: AssistantChatRequest,
    db: AsyncSession = Depends(get_db_session)
):
    """
    Context-aware RAG chatbot embedded in the guided wizard.
    Retrieves official legal filing & statutory guidance, validates citations,
    handles domain questions (e.g. relief sought vs purchase price), and isolates by case.
    """
    try:
        uid = parse_case_id(case_id)
        response = await generate_assistant_response(db=db, case_id=uid, request=request)
        return ApiResponse(success=True, data=response)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Assistant chat error: {e}")

@router.get("/{case_id}/assistant/history", response_model=ApiResponse[AssistantHistoryResponse])
async def get_assistant_history(case_id: str, db: AsyncSession = Depends(get_db_session)):
    """
    Retrieves previous assistant chat turns for this case session.
    """
    uid = parse_case_id(case_id)
    case = await db.get(GrievanceCase, uid)
    if not case:
        if uid in DEMO_CASE_UUIDS.values():
            await get_or_initialize_guided_form(db, uid)
            case = await db.get(GrievanceCase, uid)
        else:
            raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
        
    form_dict = case.guided_form_state or {}
    raw_history = form_dict.get("assistant_history", [])
    messages = [AssistantChatMessage(**m) for m in raw_history]
    
    return ApiResponse(
        success=True,
        data=AssistantHistoryResponse(case_id=str(uid), messages=messages)
    )

@router.delete("/{case_id}/assistant/history", response_model=ApiResponse[bool])
async def clear_assistant_history(case_id: str, db: AsyncSession = Depends(get_db_session)):
    """
    Resets the assistant chat history for this case session.
    """
    uid = parse_case_id(case_id)
    case = await db.get(GrievanceCase, uid)
    if not case:
        if uid in DEMO_CASE_UUIDS.values():
            await get_or_initialize_guided_form(db, uid)
            case = await db.get(GrievanceCase, uid)
        else:
            raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
        
    form_dict = case.guided_form_state or {}
    form_dict["assistant_history"] = []
    case.guided_form_state = form_dict
    await db.commit()
    return ApiResponse(success=True, data=True)


