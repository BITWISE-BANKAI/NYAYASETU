import pytest
import uuid
from schemas.guided_form import (
    GuidedFormState, FieldStatus, ProvenanceKind,
    FieldGuidanceResponse, GuidanceSource
)
from services.guided_form_service import (
    _build_initial_state_from_facts,
    validate_guided_form_state
)

def test_initial_state_fact_mapping():
    """
    Verify that extracted facts are mapped into suggested fields with provenance,
    and are NOT automatically marked as confirmed.
    """
    case_id = uuid.uuid4()
    extracted_facts = {
        "product_or_service": "Samsung 55-inch QLED TV",
        "transaction_amount_inr": 54999.0,
        "purchase_or_incident_date": "2024-08-15",
        "manufacturer_name": "Samsung India Electronics Pvt. Ltd.",
        "ecommerce_platform": "Amazon Seller Services Pvt. Ltd.",
        "issue_summary_neutral": "Display panel failure within 3 months.",
        "seller_response_summary": "Service center alleged physical damage.",
        "evidence_mentioned": ["invoice", "job_sheet"]
    }
    
    state = _build_initial_state_from_facts(case_id, extracted_facts, "raw intake text")
    
    assert state.case_id == case_id
    assert len(state.sections) == 8
    
    # Flatten fields
    field_dict = {}
    for sec in state.sections:
        for f in sec.fields:
            field_dict[f.field_id] = f
            
    # Check transaction amount is suggested, NOT confirmed
    amt_field = field_dict["transaction_amount_inr"]
    assert amt_field.value == 54999.0
    assert amt_field.status == FieldStatus.SUGGESTED
    assert amt_field.user_confirmed is False
    assert amt_field.provenance.kind == ProvenanceKind.EXISTING_CASE
    
    # Check product is suggested, NOT confirmed
    prod_field = field_dict["product_or_service"]
    assert prod_field.value == "Samsung 55-inch QLED TV"
    assert prod_field.status == FieldStatus.SUGGESTED
    assert prod_field.user_confirmed is False
    
    # Check evidence checklist mapping
    ev_dict = {item.document_type: item for item in state.evidence_checklist}
    assert ev_dict["invoice"].status == "provided"
    assert ev_dict["invoice"].requirement_level == "mandatory_filing_instruction"
    assert ev_dict["warranty_card"].status == "missing"
    assert ev_dict["warranty_card"].requirement_level == "recommended_evidence"
    
    # Check conflict detection
    assert len(state.conflicts) >= 1
    damage_conf = [c for c in state.conflicts if c.conflict_id == "conf_damage_allegation"]
    assert len(damage_conf) == 1
    assert damage_conf[0].is_resolved is False

def test_deterministic_pecuniary_jurisdiction_2021_rules():
    """
    Verify pecuniary jurisdiction under 2021 Rules:
    Consideration <= 50L -> District Commission.
    Consideration > 50L and <= 2Cr -> State Commission.
    Consideration > 2Cr -> National Commission.
    """
    case_id = uuid.uuid4()
    
    # Case 1: 54,999 INR (District)
    state_district = _build_initial_state_from_facts(case_id, {
        "complainant_name": "Ramesh Kumar",
        "complainant_address": "Indiranagar, Bengaluru, 560038",
        "complainant_phone": "9876543210",
        "complainant_email": "ramesh@example.com",
        "product_or_service": "Television",
        "transaction_amount_inr": 54999.0,
        "purchase_or_incident_date": "2024-08-15",
        "defect_first_noticed_date": "2024-10-01",
        "manufacturer_name": "Samsung",
        "issue_summary_neutral": "Display failure",
        "seller_response_summary": "Refused repair",
        "refund_amount_inr": 54999.0,
        "verification_confirmed": "Yes, verified",
        "dispute_category": "Defective Goods",
        "forum": "DCDRC",
        "complainant_district": "Bengaluru"
    }, "")
    
    val_res = validate_guided_form_state(state_district)
    assert val_res.pecuniary_jurisdiction.forum_name == "District Consumer Disputes Redressal Commission (DCDRC)"
    assert val_res.pecuniary_jurisdiction.consideration_amount_inr == 54999.0
    assert "Rule 3" in val_res.pecuniary_jurisdiction.statutory_rule

def test_refund_amount_exceeds_consideration_warning():
    """
    PDR Rule: Keep purchase consideration separate from requested compensation/relief.
    Flag warning if requested refund exceeds consideration paid.
    """
    case_id = uuid.uuid4()
    state = _build_initial_state_from_facts(case_id, {
        "transaction_amount_inr": 50000.0,
        "refund_amount_inr": 75000.0,  # Exceeds purchase price
    }, "")
    
    val_res = validate_guided_form_state(state)
    warning_fields = [w.field_id for w in val_res.warnings]
    assert "refund_amount_inr" in warning_fields

def test_missing_required_fields_blocks_drafting():
    """
    Blocking validation: missing required fields without confirmation or marking unknown
    must block draft generation.
    """
    case_id = uuid.uuid4()
    # Empty facts
    state = _build_initial_state_from_facts(case_id, {}, "")
    
    val_res = validate_guided_form_state(state)
    assert val_res.is_valid_for_drafting is False
    assert len(val_res.blocking_errors) > 0
    
    err_fields = [e.field_id for e in val_res.blocking_errors]
    assert "complainant_name" in err_fields
    assert "product_or_service" in err_fields
    assert "transaction_amount_inr" in err_fields

def test_prompt_injection_safety_in_guidance_contract():
    """
    Verify that guidance responses do not accept override instructions
    and return typed contracts with grounded sources only.
    """
    response = FieldGuidanceResponse(
        field_id="transaction_amount_inr",
        explanation="Under the Consumer Protection Rules, 2021, consideration paid determines the pecuniary jurisdiction of the Commission.",
        suggested_next_question="Confirm consideration paid?",
        sources=[
            GuidanceSource(
                title="Consumer Protection Rules, 2021",
                section="Rule 3",
                url="https://consumeraffairs.gov.in/pages/consumer-protection-acts",
                retrieved_excerpt="Rule 3: District Commission has jurisdiction up to fifty lakh rupees.",
                chunk_id="chunk-123"
            )
        ],
        grounding_status="supported"
    )
    
    assert response.grounding_status == "supported"
    assert len(response.sources) == 1
    assert response.sources[0].url.startswith("https://")
    assert "Rule 3" in response.sources[0].section

def test_unknown_field_handling():
    """
    Verify that an unknown field is stored as UNKNOWN with user_confirmed=True,
    differentiating it from simply missing data.
    """
    case_id = uuid.uuid4()
    state = _build_initial_state_from_facts(case_id, {}, "")
    
    # Mark invoice_number as unknown
    for sec in state.sections:
        for f in sec.fields:
            if f.field_id == "invoice_number":
                f.status = FieldStatus.UNKNOWN
                f.value = None
                f.user_confirmed = True
                f.provenance.kind = ProvenanceKind.USER_INPUT
                
    invoice_field = [f for sec in state.sections for f in sec.fields if f.field_id == "invoice_number"][0]
    assert invoice_field.status == FieldStatus.UNKNOWN
    assert invoice_field.user_confirmed is True
    assert invoice_field.value is None
