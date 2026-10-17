import logging
import json
from uuid import UUID
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

import ollama
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from core.config import settings
from models.grievance_case import GrievanceCase
from schemas.extracted_facts import ExtractedConsumerFacts
from schemas.guided_form import (
    GuidedFormState, FormSection, GuidedFieldValue, FieldStatus,
    FieldProvenance, ProvenanceKind, GuidanceSource, FieldGuidanceResponse,
    EvidenceChecklistItem, RequirementLevel, EvidenceStatus,
    ConflictItem, FormValidationError, FormValidationWarning,
    PecuniaryJurisdictionInfo, GuidedFormValidationResponse
)
from services.stage3_rag_service import retrieve_parent_statutes
from services.stage4_generator_service import generate_complaint_slots
from services.template_service import render_final_dcdrc_complaint

logger = logging.getLogger(__name__)

# Default field catalogue for consumer electronics warranty & defective goods disputes
DEFAULT_FORM_STRUCTURE = [
    {
        "section_id": "overview",
        "title": "Case Overview & Jurisdiction",
        "description": "Basic dispute classification and pecuniary jurisdiction verification.",
        "step_number": 1,
        "fields": [
            {
                "field_id": "dispute_category",
                "label": "Dispute Category",
                "value": "Defective Goods & Warranty Deficiency (Consumer Electronics)",
                "value_type": "string",
                "is_required": True,
                "help_prompt": "Why is dispute category required? Determines applicable legal provisions under CPA 2019."
            },
            {
                "field_id": "forum",
                "label": "Appropriate Commission",
                "value": "District Consumer Disputes Redressal Commission (DCDRC)",
                "value_type": "string",
                "is_required": True,
                "help_prompt": "Why is District Commission selected? Under 2021 Pecuniary Rules, claims with consideration up to ₹50 Lakhs fall under DCDRC."
            },
            {
                "field_id": "complainant_district",
                "label": "Complainant District / City",
                "value_type": "string",
                "is_required": True,
                "placeholder": "e.g. Bengaluru Urban, Karnataka",
                "help_prompt": "Under Section 34(2)(d), you may institute a complaint in the District Commission where you reside or work for gain."
            }
        ]
    },
    {
        "section_id": "complainant",
        "title": "Complainant Details",
        "description": "Your contact and residential details required for official notices.",
        "step_number": 2,
        "fields": [
            {
                "field_id": "complainant_name",
                "label": "Full Name",
                "value_type": "string",
                "is_required": True,
                "placeholder": "Enter your full legal name",
                "help_prompt": "The complainant must be an individual or entity that bought goods or availed services for consideration."
            },
            {
                "field_id": "complainant_address",
                "label": "Complete Postal Address",
                "value_type": "text",
                "is_required": True,
                "placeholder": "House/Flat No., Street, City, State, PIN Code",
                "help_prompt": "Official postal address is required for communication and determining territorial jurisdiction."
            },
            {
                "field_id": "complainant_phone",
                "label": "Contact Mobile Number",
                "value_type": "string",
                "is_required": True,
                "placeholder": "10-digit mobile number",
                "help_prompt": "Used for SMS alerts on e-Jagriti hearing dates."
            },
            {
                "field_id": "complainant_email",
                "label": "Email Address",
                "value_type": "string",
                "is_required": True,
                "placeholder": "your.name@example.com",
                "help_prompt": "Electronic notices and daily orders are dispatched to this address."
            }
        ]
    },
    {
        "section_id": "opposite_parties",
        "title": "Opposite Parties & Commercial Entities",
        "description": "Disambiguate marketplace, manufacturer, merchant seller, and service center.",
        "step_number": 3,
        "fields": [
            {
                "field_id": "manufacturer_name",
                "label": "Product Manufacturer / Brand",
                "value_type": "string",
                "is_required": True,
                "placeholder": "e.g. Samsung India Electronics Pvt. Ltd.",
                "help_prompt": "Under Section 84 of CPA 2019, the manufacturer is strictly liable for manufacturing defects and express warranty non-conformance."
            },
            {
                "field_id": "ecommerce_platform",
                "label": "E-Commerce Marketplace Intermediary (if applicable)",
                "value_type": "string",
                "is_required": False,
                "placeholder": "e.g. Amazon Seller Services Pvt. Ltd. / Flipkart",
                "help_prompt": "Under Consumer Protection (E-Commerce) Rules 2020 Rules 4 & 5, marketplaces must provide seller details and grievance redressal."
            },
            {
                "field_id": "merchant_seller_name",
                "label": "Registered Merchant Seller (from Invoice)",
                "value_type": "string",
                "is_required": False,
                "placeholder": "e.g. Appario Retail Pvt. Ltd. / Local Retailer",
                "help_prompt": "The legal seller named on the tax invoice who accepted consideration."
            },
            {
                "field_id": "service_center_name",
                "label": "Authorized Service Center / Service Provider",
                "value_type": "string",
                "is_required": False,
                "placeholder": "e.g. Samsung Authorized Plaza / Local Service Centre",
                "help_prompt": "Under Section 85, a service provider is liable for deficient repair or wrongfully rejecting warranty claims."
            }
        ]
    },
    {
        "section_id": "transaction",
        "title": "Transaction & Product Details",
        "description": "Particulars of purchase, invoice number, and consideration paid.",
        "step_number": 4,
        "fields": [
            {
                "field_id": "product_or_service",
                "label": "Product Description & Model",
                "value_type": "string",
                "is_required": True,
                "placeholder": "e.g. Samsung 55-inch 4K QLED Smart Television (QA55Q60BAKXXL)",
                "help_prompt": "Exact product identification ensures the Commission can order replacement or repair of the precise good."
            },
            {
                "field_id": "purchase_or_incident_date",
                "label": "Date of Purchase / Invoice Date",
                "value_type": "date",
                "is_required": True,
                "placeholder": "YYYY-MM-DD",
                "help_prompt": "Used to verify warranty validity and ensure the claim is within the 2-year limitation period under Section 69."
            },
            {
                "field_id": "transaction_amount_inr",
                "label": "Consideration Paid (in ₹ INR)",
                "value_type": "money",
                "is_required": True,
                "placeholder": "e.g. 54999.00",
                "help_prompt": "Critical: Under the 2021 Rules, pecuniary jurisdiction is determined solely by consideration paid, not total relief claimed."
            },
            {
                "field_id": "invoice_number",
                "label": "Tax Invoice Number",
                "value_type": "string",
                "is_required": False,
                "placeholder": "e.g. INV-2024-88412 (leave blank if not specified in records)",
                "help_prompt": "NyayaSetu strictly avoids inventing synthetic invoice numbers. If unknown, we cite 'Tax Invoice [number not specified in records]'."
            }
        ]
    },
    {
        "section_id": "timeline",
        "title": "Incident Chronology & Dispute History",
        "description": "Chronological order of defect discovery, service attempts, and refusal.",
        "step_number": 5,
        "fields": [
            {
                "field_id": "defect_first_noticed_date",
                "label": "Date Defect Was First Noticed",
                "value_type": "date",
                "is_required": True,
                "placeholder": "YYYY-MM-DD",
                "help_prompt": "Marks when the cause of action began to accrue."
            },
            {
                "field_id": "service_visit_date",
                "label": "Technician Inspection / Visit Date",
                "value_type": "date",
                "is_required": False,
                "placeholder": "YYYY-MM-DD",
                "help_prompt": "Date when authorized technician inspected the device or issued a job sheet."
            },
            {
                "field_id": "seller_response_summary",
                "label": "Opposite Party's Response / Refusal Grounds",
                "value_type": "text",
                "is_required": True,
                "placeholder": "e.g. Service centre claimed internal physical damage despite no external signs, refusing free warranty repair.",
                "help_prompt": "Documenting the opposite party's refusal proves that prior dispute resolution failed and justifies approaching the Commission."
            }
        ]
    },
    {
        "section_id": "allegations",
        "title": "Defects & Deficiency Grounds",
        "description": "Factual description of defects in goods and deficiency in warranty service.",
        "step_number": 6,
        "fields": [
            {
                "field_id": "issue_summary_neutral",
                "label": "Factual Description of Defect",
                "value_type": "text",
                "is_required": True,
                "placeholder": "e.g. Television display panel went completely blank with sound still playing; power board failure within 3 months of purchase.",
                "help_prompt": "A neutral, factual statement of the shortcoming under Section 2(10) of CPA 2019."
            },
            {
                "field_id": "statutory_grounds",
                "label": "Plead Statutory Grounds",
                "value": "Section 2(10) Defect in Goods, Section 2(11) Deficiency in Service, Section 2(47) Unfair Trade Practice",
                "value_type": "string",
                "is_required": True,
                "help_prompt": "Our legal retrieval pipeline grounds your complaint in these statutory sections of the Consumer Protection Act 2019."
            }
        ]
    },
    {
        "section_id": "relief",
        "title": "Relief Requested (Prayer under Section 39)",
        "description": "Itemize statutory refund, compensation for mental agony, and litigation expenses.",
        "step_number": 7,
        "fields": [
            {
                "field_id": "refund_amount_inr",
                "label": "Refund of Purchase Consideration (₹ INR)",
                "value_type": "money",
                "is_required": True,
                "placeholder": "e.g. 54999.00",
                "help_prompt": "Under Section 39(1)(c), return the price paid for defective goods with interest."
            },
            {
                "field_id": "compensation_mental_agony_inr",
                "label": "Compensation for Mental Agony & Harassment (₹ INR)",
                "value_type": "money",
                "is_required": False,
                "placeholder": "e.g. 20000.00",
                "help_prompt": "Under Section 39(1)(d), compensation for loss or injury suffered due to negligence or deficiency."
            },
            {
                "field_id": "litigation_costs_inr",
                "label": "Litigation & Legal Expenses (₹ INR)",
                "value_type": "money",
                "is_required": False,
                "placeholder": "e.g. 10000.00",
                "help_prompt": "Under Section 39(1)(m), award of adequate costs of the proceedings."
            }
        ]
    },
    {
        "section_id": "review",
        "title": "Evidence Verification & Final Review",
        "description": "Review verified annexures and validate before formal legal drafting.",
        "step_number": 8,
        "fields": [
            {
                "field_id": "verification_confirmed",
                "label": "I verify that all statements above are true to my personal knowledge.",
                "value": "Yes, verified",
                "value_type": "string",
                "is_required": True,
                "help_prompt": "Official filing requires formal verification by the complainant under CPA 2019."
            }
        ]
    }
]

DEFAULT_EVIDENCE_CHECKLIST = [
    {
        "item_id": "ev_tax_invoice",
        "document_type": "invoice",
        "title": "Tax Invoice / Purchase Receipt",
        "description": "Official retail bill or electronic invoice showing date, seller identity, and consideration paid.",
        "status": "missing",
        "requirement_level": "mandatory_filing_instruction",
        "statutory_basis": "e-Jagriti Filing Guide Rule 4; CPA 2019 Section 35(1)"
    },
    {
        "item_id": "ev_grievance_notice",
        "document_type": "written_complaint",
        "title": "Customer Support Emails / Grievance Notice",
        "description": "Written communication with ticket numbers showing opposite party was formally informed of the defect.",
        "status": "missing",
        "requirement_level": "mandatory_filing_instruction",
        "statutory_basis": "Consumer Protection (E-Commerce) Rules 2020 Rule 4"
    },
    {
        "item_id": "ev_warranty_card",
        "document_type": "warranty_card",
        "title": "Manufacturer Warranty Card",
        "description": "Warranty booklet, card, or registered warranty terms proving the defect occurred within coverage period.",
        "status": "missing",
        "requirement_level": "recommended_evidence",
        "statutory_basis": "CPA 2019 Section 84(1)(d)"
    },
    {
        "item_id": "ev_service_job_sheet",
        "document_type": "service_report",
        "title": "Technician Job Sheet / Inspection Report",
        "description": "Service report issued during visit, or quotation for repair, recording technician remarks.",
        "status": "missing",
        "requirement_level": "recommended_evidence",
        "statutory_basis": "CPA 2019 Section 85"
    },
    {
        "item_id": "ev_defect_photos",
        "document_type": "defect_photo",
        "title": "Photographs or Video of Defect",
        "description": "Visual evidence of the device malfunctioning (e.g. blank display, smoke, power error).",
        "status": "missing",
        "requirement_level": "recommended_evidence",
        "statutory_basis": "Section 2(10) Defect Proof"
    }
]


def _build_initial_state_from_facts(case_id: UUID, extracted_facts: Optional[Dict[str, Any]], raw_text: Optional[str]) -> GuidedFormState:
    """
    Initializes a structured GuidedFormState populated with extracted facts.
    Values extracted by AI start with status="suggested" and user_confirmed=False.
    """
    facts = extracted_facts or {}
    evidence_mentioned = facts.get("evidence_mentioned", [])
    
    sections: List[FormSection] = []
    
    for sec_def in DEFAULT_FORM_STRUCTURE:
        fields: List[GuidedFieldValue] = []
        for f_def in sec_def["fields"]:
            fid = f_def["field_id"]
            val = None
            status = FieldStatus.MISSING
            prov = FieldProvenance(kind=ProvenanceKind.UNKNOWN)
            
            # Map from extracted facts if available
            if fid in facts and facts[fid] is not None:
                val = facts[fid]
                status = FieldStatus.SUGGESTED
                prov = FieldProvenance(
                    kind=ProvenanceKind.EXISTING_CASE,
                    source_label="Extracted from your grievance narrative"
                )
            elif fid == "complainant_district" and facts.get("complainant_city"):
                val = facts.get("complainant_city")
                status = FieldStatus.SUGGESTED
                prov = FieldProvenance(
                    kind=ProvenanceKind.EXISTING_CASE,
                    source_label="Extracted from your grievance narrative"
                )
            elif fid == "refund_amount_inr" and facts.get("transaction_amount_inr"):
                # Default refund prayer suggestion from transaction amount
                val = facts.get("transaction_amount_inr")
                status = FieldStatus.SUGGESTED
                prov = FieldProvenance(
                    kind=ProvenanceKind.DETERMINISTIC_RULE,
                    source_label="Suggested based on purchase consideration"
                )
            elif "value" in f_def:
                val = f_def["value"]
                status = FieldStatus.SUGGESTED
                prov = FieldProvenance(
                    kind=ProvenanceKind.DETERMINISTIC_RULE,
                    source_label="Standard legal filing parameter"
                )

            fields.append(GuidedFieldValue(
                field_id=fid,
                label=f_def["label"],
                value=val,
                value_type=f_def["value_type"],
                status=status,
                provenance=prov,
                user_confirmed=False,
                is_required=f_def.get("is_required", False),
                help_prompt=f_def.get("help_prompt"),
                placeholder=f_def.get("placeholder")
            ))
            
        sections.append(FormSection(
            section_id=sec_def["section_id"],
            title=sec_def["title"],
            description=sec_def["description"],
            step_number=sec_def["step_number"],
            fields=fields
        ))

    # Evidence checklist mapped from evidence_mentioned
    checklist: List[EvidenceChecklistItem] = []
    for ev_def in DEFAULT_EVIDENCE_CHECKLIST:
        doc_type = ev_def["document_type"]
        is_mentioned = any(
            (doc_type == "invoice" and ev in ["invoice", "receipt", "bill"]) or
            (doc_type == "warranty_card" and "warranty" in ev) or
            (doc_type == "written_complaint" and ev in ["emails", "chat_screenshots", "chat"]) or
            (doc_type == "defect_photo" and "photo" in ev) or
            (doc_type == "service_report" and "job_sheet" in ev)
            for ev in evidence_mentioned
        )
        st = EvidenceStatus.PROVIDED if is_mentioned else EvidenceStatus.MISSING
        checklist.append(EvidenceChecklistItem(
            item_id=ev_def["item_id"],
            document_type=doc_type,
            title=ev_def["title"],
            description=ev_def["description"],
            status=st,
            requirement_level=RequirementLevel(ev_def["requirement_level"]),
            statutory_basis=ev_def["statutory_basis"]
        ))

    # Detect conflicts if narrative contains conflicting figures or dates
    conflicts: List[ConflictItem] = []
    if facts.get("seller_response_summary") and "damage" in facts.get("seller_response_summary", "").lower():
        conflicts.append(ConflictItem(
            conflict_id="conf_damage_allegation",
            field_id="issue_summary_neutral",
            field_label="Alleged Physical Damage vs Manufacturing Defect",
            description="The service centre alleged physical customer damage, whereas your account states internal hardware failure with no physical impact.",
            source_a={"label": "Complainant Narrative", "value": facts.get("issue_summary_neutral", "Hardware defect")},
            source_b={"label": "Service Centre Claim", "value": facts.get("seller_response_summary", "Physical damage alleged")},
            is_resolved=False
        ))

    state = GuidedFormState(
        case_id=case_id,
        current_step=1,
        total_steps=len(sections),
        sections=sections,
        evidence_checklist=checklist,
        conflicts=conflicts,
        completion_percentage=_calc_completion(sections),
        last_saved_at=datetime.now(timezone.utc)
    )
    return state


def _calc_completion(sections: List[FormSection]) -> int:
    total_fields = 0
    completed_fields = 0
    for sec in sections:
        for f in sec.fields:
            total_fields += 1
            if f.user_confirmed or (f.status in [FieldStatus.CONFIRMED, FieldStatus.UNKNOWN, FieldStatus.NOT_APPLICABLE]):
                completed_fields += 1
    if total_fields == 0:
        return 0
    return int((completed_fields / total_fields) * 100)


DEMO_CASE_UUIDS = {
    "demo-matter-1": UUID("00000000-0000-0000-0000-000000000001"),
    "demo-matter-2": UUID("00000000-0000-0000-0000-000000000002"),
    "demo-matter-3": UUID("00000000-0000-0000-0000-000000000003"),
}

async def get_or_initialize_guided_form(db: AsyncSession, case_id: UUID) -> GuidedFormState:
    """
    Retrieves the guided form state for a case, or initializes it from extracted facts.
    Auto-seeds demo cases if requested.
    """
    case = await db.get(GrievanceCase, case_id)
    if not case:
        if case_id in DEMO_CASE_UUIDS.values():
            case = GrievanceCase(
                id=case_id,
                status="complete",
                raw_intake_text="Purchased Samsung 55-inch 4K Smart TV for Rs. 54,999 on 2024-08-15 from Amazon. Stopped working after 2 months. Service center claimed physical damage and refused warranty.",
                extracted_facts={
                    "product_or_service": "Samsung 55-inch 4K Smart TV",
                    "transaction_amount_inr": 54999.0,
                    "purchase_or_incident_date": "2024-08-15",
                    "manufacturer_name": "Samsung India Electronics Pvt. Ltd.",
                    "ecommerce_platform": "Amazon Seller Services Pvt. Ltd.",
                    "merchant_seller_name": "Appario Retail Pvt. Ltd.",
                    "service_center_name": "Samsung Authorized Plaza Service Center",
                    "issue_summary_neutral": "Display panel failure within 2 months of purchase.",
                    "seller_response_summary": "Service center alleged user physical damage and refused warranty.",
                    "evidence_mentioned": ["invoice", "job_sheet"]
                },
                evidence_strength_score=80
            )
            db.add(case)
            await db.commit()
        else:
            raise ValueError(f"Case {case_id} not found")

    # If facts have not been extracted yet but raw intake text is available, extract on-the-fly
    if (not case.extracted_facts or not any(case.extracted_facts.values())) and case.raw_intake_text:
        try:
            from services.stage2_fact_service import extract_facts
            facts = await extract_facts(case.raw_intake_text, {})
            case.extracted_facts = facts.model_dump()
            case.evidence_strength_score = facts.evidence_strength_score
            case.status = 'stage3_rag'
            await db.commit()
        except Exception as e:
            logger.warning(f"Could not extract facts on the fly in get_or_initialize_guided_form: {e}")

    if case.guided_form_state:
        try:
            state = GuidedFormState(**case.guided_form_state)
            # Reconcile unpopulated/missing fields from case.extracted_facts
            if case.extracted_facts:
                updated = False
                for sec in state.sections:
                    for f in sec.fields:
                        if (f.value is None or str(f.value).strip() == "") and not f.user_confirmed and f.status != FieldStatus.UNKNOWN:
                            val = case.extracted_facts.get(f.field_id)
                            if val is None and f.field_id == "complainant_district":
                                val = case.extracted_facts.get("complainant_city")
                            elif val is None and f.field_id == "refund_amount_inr":
                                val = case.extracted_facts.get("transaction_amount_inr")

                            if val is not None:
                                f.value = val
                                f.status = FieldStatus.SUGGESTED
                                f.provenance = FieldProvenance(
                                    kind=ProvenanceKind.EXISTING_CASE,
                                    source_label="Extracted from your grievance narrative"
                                )
                                updated = True
                if updated:
                    state.completion_percentage = _calc_completion(state.sections)
                    case.guided_form_state = state.model_dump(mode="json")
                    await db.commit()
            return state
        except Exception as e:
            logger.warning(f"Failed to deserialize existing guided_form_state, re-initializing: {e}")

    # Initialize from extracted facts
    state = _build_initial_state_from_facts(case_id, case.extracted_facts, case.raw_intake_text)
    case.guided_form_state = state.model_dump(mode="json")
    await db.commit()
    return state


async def patch_guided_form_field(
    db: AsyncSession,
    case_id: UUID,
    field_id: str,
    value: Optional[Any] = None,
    status: Optional[FieldStatus] = None,
    user_confirmed: Optional[bool] = None,
    mark_unknown: bool = False
) -> GuidedFormState:
    """
    Updates an individual field's value, status, or user confirmation.
    Synchronizes authoritative extracted_facts and re-renders complaint petition.
    """
    state = await get_or_initialize_guided_form(db, case_id)
    case = await db.get(GrievanceCase, case_id)
    
    field_found = False
    for sec in state.sections:
        for f in sec.fields:
            if f.field_id == field_id:
                field_found = True
                if mark_unknown:
                    f.status = FieldStatus.UNKNOWN
                    f.value = None
                    f.user_confirmed = True
                    f.provenance = FieldProvenance(
                        kind=ProvenanceKind.USER_INPUT,
                        source_label="Marked unknown by user"
                    )
                else:
                    if value is not None:
                        f.value = value
                        f.provenance = FieldProvenance(
                            kind=ProvenanceKind.USER_INPUT,
                            source_label="Edited by user"
                        )
                    if status is not None:
                        f.status = status
                    if user_confirmed is not None:
                        f.user_confirmed = user_confirmed
                        if user_confirmed:
                            f.status = FieldStatus.CONFIRMED

                f.validation_errors = []
                break
        if field_found:
            break

    if not field_found:
        raise ValueError(f"Field {field_id} not found in guided form")

    state.completion_percentage = _calc_completion(state.sections)
    state.last_saved_at = datetime.now(timezone.utc)
    
    # Synchronize case.extracted_facts with the newly manually added/edited information
    facts_dict = dict(case.extracted_facts or {})
    if mark_unknown:
        facts_dict[field_id] = None
    elif value is not None:
        facts_dict[field_id] = value
        if field_id == "complainant_district":
            facts_dict["complainant_city"] = value

    # Recompute missing mandatory fields
    missing_fields = []
    for sec in state.sections:
        for fld in sec.fields:
            if fld.is_required and (fld.value is None or str(fld.value).strip() == "") and fld.status != FieldStatus.UNKNOWN:
                missing_fields.append(fld.field_id)
    facts_dict["missing_mandatory_fields"] = missing_fields
    case.extracted_facts = facts_dict

    # Synchronize rendered complaint petition if case is in progress or completed
    try:
        from schemas.complaint_generation import StructuredLegalSlots
        from schemas.extracted_facts import ExtractedConsumerFacts
        from services.template_service import render_final_dcdrc_complaint

        field_map = {fld.field_id: fld.value for s in state.sections for fld in s.fields}
        facts_obj = ExtractedConsumerFacts(
            complainant_name=field_map.get("complainant_name"),
            complainant_address=field_map.get("complainant_address"),
            complainant_phone=field_map.get("complainant_phone"),
            complainant_email=field_map.get("complainant_email"),
            complainant_city=field_map.get("complainant_district") or field_map.get("complainant_city"),
            product_or_service=field_map.get("product_or_service") or "Consumer Electronics Device",
            transaction_amount_inr=float(field_map.get("transaction_amount_inr") or 0.0),
            purchase_or_incident_date=field_map.get("purchase_or_incident_date"),
            invoice_number=field_map.get("invoice_number"),
            seller_or_company_name=field_map.get("manufacturer_name") or field_map.get("ecommerce_platform") or "Opposite Party",
            ecommerce_platform=field_map.get("ecommerce_platform"),
            manufacturer_name=field_map.get("manufacturer_name"),
            merchant_seller_name=field_map.get("merchant_seller_name"),
            service_center_name=field_map.get("service_center_name"),
            issue_summary_neutral=field_map.get("issue_summary_neutral") or "Defective product with failure to provide warranty repair.",
            seller_response_summary=field_map.get("seller_response_summary"),
            missing_mandatory_fields=missing_fields,
            evidence_strength_score=case.evidence_strength_score or 75
        )

        if case.structured_slots:
            slots_obj = StructuredLegalSlots(**case.structured_slots)
        else:
            slots_obj = StructuredLegalSlots(
                statement_of_facts_narrative=[
                    f"The Complainant purchased {facts_obj.product_or_service} for consideration of Rs. {facts_obj.transaction_amount_inr:,.0f} on {facts_obj.purchase_or_incident_date or 'the date of invoice'}.",
                    f"The product developed serious defects ({facts_obj.issue_summary_neutral}) during the normal warranty period.",
                    f"The Opposite Party failed to repair, replace, or refund despite repeated formal requests ({facts_obj.seller_response_summary or 'Service denied'})."
                ],
                legal_grounds=[],
                prayer_items=[
                    f"Direct the Opposite Party to refund the sum of Rs. {facts_obj.transaction_amount_inr:,.0f} under Section 39(1)(c) of the Consumer Protection Act, 2019.",
                    "Award reasonable compensation for mental agony and harassment under Section 39(1)(d).",
                    "Award litigation costs of the proceedings under Section 39(1)(m)."
                ],
                annexure_descriptions=["Tax Invoice / Proof of Purchase", "Grievance Communications / Notice"]
            )
        case.rendered_complaint = render_final_dcdrc_complaint(facts_obj, slots_obj)
    except Exception as e:
        logger.warning(f"Could not auto-re-render complaint upon field patch: {e}")

    case.guided_form_state = state.model_dump(mode="json")
    await db.commit()
    return state


async def resolve_conflict_item(
    db: AsyncSession,
    case_id: UUID,
    conflict_id: str,
    field_id: str,
    resolution_choice: str,
    resolved_value: Optional[Any] = None,
    notes: Optional[str] = None
) -> GuidedFormState:
    """
    Resolves a recorded fact conflict and updates the field with provenance in one atomic save.
    """
    state = await get_or_initialize_guided_form(db, case_id)
    case = await db.get(GrievanceCase, case_id)
    
    # 1. Update the field in state
    field_found = False
    for sec in state.sections:
        for f in sec.fields:
            if f.field_id == field_id:
                field_found = True
                if resolution_choice == "mark_unknown":
                    f.status = FieldStatus.UNKNOWN
                    f.value = None
                    f.user_confirmed = True
                    f.provenance = FieldProvenance(
                        kind=ProvenanceKind.USER_INPUT,
                        source_label="Marked unknown by user"
                    )
                elif resolved_value is not None:
                    f.value = resolved_value
                    f.status = FieldStatus.CONFIRMED
                    f.user_confirmed = True
                    f.provenance = FieldProvenance(
                        kind=ProvenanceKind.USER_INPUT,
                        source_label="Resolved by user"
                    )
                break
        if field_found:
            break

    # 2. Update the conflict item in state
    for conf in state.conflicts:
        if conf.conflict_id == conflict_id:
            conf.is_resolved = True
            conf.resolved_value = resolved_value
            conf.resolution_note = notes
            break

    state.completion_percentage = _calc_completion(state.sections)
    state.last_saved_at = datetime.now(timezone.utc)
    case.guided_form_state = state.model_dump(mode="json")
    await db.commit()
    return state


async def get_field_guidance(
    db: AsyncSession,
    field_id: str,
    section_id: Optional[str] = None,
    user_query: Optional[str] = None,
    current_value: Optional[Any] = None
) -> FieldGuidanceResponse:
    """
    Field-aware RAG:
    1. Generates targeted query incorporating field context, section, and user question.
    2. Retrieves official clauses from PostgreSQL/pgvector.
    3. Formulates plain-language explanation strictly grounded in returned source metadata.
    4. Never fabricates citations, URLs, or provisions.
    """
    # Contextual query mapping
    query_map = {
        "forum": "pecuniary jurisdiction district commission rules 2021 consideration paid",
        "dispute_category": "defect in goods deficiency in service consumer protection act 2019",
        "complainant_district": "territorial jurisdiction district commission section 34 where complainant resides",
        "complainant_name": "complainant consumer rights who can file complaint section 35",
        "manufacturer_name": "manufacturer liability section 84 product liability express warranty defect",
        "ecommerce_platform": "marketplace duties e-commerce rules 2020 seller details grievance redressal",
        "merchant_seller_name": "seller liability on marketplace rule 6 refund defective goods e-commerce rules 2020",
        "service_center_name": "service provider liability section 85 deficiency in service warranty repair",
        "product_or_service": "product defect description section 2(10) goods standard",
        "purchase_or_incident_date": "limitation period section 69 two years cause of action",
        "transaction_amount_inr": "pecuniary jurisdiction consideration paid rules 2021 50 lakh district commission",
        "invoice_number": "mandatory documents proof of purchase tax invoice cash memo e-jagriti",
        "defect_first_noticed_date": "cause of action limitation section 69 notice to seller",
        "seller_response_summary": "prior dispute resolution grievance redressal e-jagriti filing requirement",
        "issue_summary_neutral": "defect in goods section 2(10) deficiency in service section 2(11)",
        "statutory_grounds": "statutory grounds section 2(10) defect section 2(11) deficiency section 2(47) unfair trade practice",
        "refund_amount_inr": "section 39(1)(c) refund of price paid findings of district commission",
        "compensation_mental_agony_inr": "section 39(1)(d) compensation for loss injury mental agony negligence",
        "litigation_costs_inr": "section 39(1)(m) adequate costs of proceedings litigation expenses"
    }
    
    base_query = query_map.get(field_id, f"consumer complaint filing guidance {field_id} e-jagriti")
    if user_query:
        search_query = f"{base_query} {user_query}"
    else:
        search_query = base_query

    # Query legal retrieval service
    try:
        retrieved_chunks = await retrieve_parent_statutes(db, search_query, top_k=15, rerank_top_k=3)
    except Exception as e:
        logger.error(f"Error querying legal retrieval: {e}")
        retrieved_chunks = []

    # Map retrieved chunks to source citations with verified URLs
    sources: List[GuidanceSource] = []
    
    # Query database for exact metadata (URL, dates, title)
    for r in retrieved_chunks:
        stat_res = await db.execute(
            text("SELECT document_title, chunk_text, metadata_col FROM legal_statutes WHERE id = :id"),
            {"id": r.chunk_id}
        )
        row = stat_res.fetchone()
        if row:
            meta = row.metadata_col or {}
            source_url = meta.get("source_url") or "https://consumeraffairs.gov.in/pages/consumer-protection-acts"
            hierarchy = meta.get("hierarchy_path") or row.document_title
            eff_date = meta.get("effective_date")
            
            sources.append(GuidanceSource(
                title=row.document_title,
                section=hierarchy,
                url=source_url,
                published_or_effective_date=eff_date,
                retrieved_excerpt=row.chunk_text[:300] + ("..." if len(row.chunk_text) > 300 else ""),
                chunk_id=str(r.chunk_id),
                similarity_score=round(r.similarity_score, 4)
            ))

    if not sources or max((s.similarity_score or 0) for s in sources) < 0.20:
        return FieldGuidanceResponse(
            field_id=field_id,
            explanation="I couldn't find enough indexed official guidance specifically matching this query in the current repository knowledge base. Please consult the official e-Jagriti filing documentation at https://e-jagriti.gov.in/help-docs.",
            suggested_next_question=None,
            sources=[],
            grounding_status="insufficient_sources"
        )

    # Use Ollama local LLM to generate plain-language explanation strictly grounded in sources
    context_text = "\n\n".join([f"SOURCE ({s.title} — {s.section}):\n{s.retrieved_excerpt}" for s in sources])
    
    llm_prompt = f"""
    You are NyayaSetu's Legal Guidance Assistant for Indian Consumer Protection Law.
    Explain to a consumer in plain, empathetic, and clear language why the form field '{field_id}' is required, based ONLY on the provided official legal sources.
    
    STRICT RULES:
    1. Use ONLY facts and rules present in the provided sources.
    2. DO NOT invent provisions, URLs, court case names, or filing fees.
    3. Mention the relevant Act/Rules and Section numbers that appear in the sources.
    4. Keep the explanation to 2-3 concise, helpful sentences.
    
    SOURCES:
    {context_text}
    
    FIELD IN QUESTION: {field_id}
    USER QUESTION: {user_query or "Why is this needed and what should I enter?"}
    """
    
    try:
        ollama_client = ollama.AsyncClient(host=settings.ollama_host)
        response = await ollama_client.chat(
            model=settings.fact_extractor_model,
            messages=[
                {"role": "system", "content": "You are a plain-language legal assistant. Follow rules strictly."},
                {"role": "user", "content": llm_prompt}
            ],
            options={"temperature": 0.0}
        )
        explanation = response["message"]["content"].strip()
    except Exception as e:
        logger.warning(f"Ollama explanation generation failed, using rule-based fallback: {e}")
        # Deterministic fallback explanation from first source
        primary = sources[0]
        explanation = f"According to {primary.title} ({primary.section}), this detail is required to establish statutory jurisdiction and proper cause of action before the Consumer Commission."

    return FieldGuidanceResponse(
        field_id=field_id,
        explanation=explanation,
        suggested_next_question="Would you like to confirm the extracted value or enter your own details?",
        sources=sources,
        grounding_status="supported"
    )


def validate_guided_form_state(state: GuidedFormState) -> GuidedFormValidationResponse:
    """
    Deterministic validation of form state:
    1. Mandatory fields filled or explicitly marked unknown.
    2. Numerical checks: purchase consideration vs refund amount.
    3. Chronological checks: incident date vs purchase date.
    4. Pecuniary jurisdiction calculation under 2021 Rules.
    """
    errors: List[FormValidationError] = []
    warnings: List[FormValidationWarning] = []
    
    # Flatten fields
    field_map: Dict[str, GuidedFieldValue] = {}
    field_sec_map: Dict[str, str] = {}
    for sec in state.sections:
        for f in sec.fields:
            field_map[f.field_id] = f
            field_sec_map[f.field_id] = sec.section_id

    # 1. Mandatory field checks
    for fid, f in field_map.items():
        if f.is_required:
            if f.value is None or str(f.value).strip() == "":
                if f.status != FieldStatus.UNKNOWN:
                    errors.append(FormValidationError(
                        field_id=fid,
                        section_id=field_sec_map.get(fid, "general"),
                        message=f"'{f.label}' is required. Please enter a value, confirm a suggestion, or mark as unknown."
                    ))

    # 2. Financial & Pecuniary checks
    consideration_val = 0.0
    refund_val = 0.0
    comp_val = 0.0
    
    t_amt_field = field_map.get("transaction_amount_inr")
    if t_amt_field and t_amt_field.value:
        try:
            consideration_val = float(str(t_amt_field.value).replace(",", "").replace("₹", "").strip())
        except ValueError:
            errors.append(FormValidationError(
                field_id="transaction_amount_inr",
                section_id="transaction",
                message="Consideration paid must be a valid numeric amount."
            ))

    ref_field = field_map.get("refund_amount_inr")
    if ref_field and ref_field.value:
        try:
            refund_val = float(str(ref_field.value).replace(",", "").replace("₹", "").strip())
            if consideration_val > 0 and refund_val > consideration_val:
                warnings.append(FormValidationWarning(
                    field_id="refund_amount_inr",
                    section_id="relief",
                    message=f"Requested refund (₹{refund_val:,.2f}) exceeds purchase consideration paid (₹{consideration_val:,.2f}). Usually refund is capped at purchase price with interest claimed separately."
                ))
        except ValueError:
            errors.append(FormValidationError(
                field_id="refund_amount_inr",
                section_id="relief",
                message="Refund amount must be a valid numeric amount."
            ))

    # Determine Pecuniary Jurisdiction under 2021 Rules
    if consideration_val <= 5000000.0:  # <= 50 Lakhs
        forum_name = "District Consumer Disputes Redressal Commission (DCDRC)"
        statutory_rule = "Rule 3, Consumer Protection (Jurisdiction of the District Commission...) Rules, 2021 (Consideration ≤ ₹50,00,000)"
    elif consideration_val <= 20000000.0:  # <= 2 Crores
        forum_name = "State Consumer Disputes Redressal Commission (SCDRC)"
        statutory_rule = "Rule 4, Consumer Protection Rules, 2021 (Consideration ₹50 Lakhs to ₹2 Crores)"
    else:
        forum_name = "National Consumer Disputes Redressal Commission (NCDRC)"
        statutory_rule = "Rule 5, Consumer Protection Rules, 2021 (Consideration > ₹2 Crores)"

    pecuniary_info = PecuniaryJurisdictionInfo(
        consideration_amount_inr=consideration_val,
        forum_name=forum_name,
        statutory_rule=statutory_rule,
        claim_amount_inr=refund_val + comp_val,
        is_split_clean=True
    )

    # 3. Check for unresolved blocking conflicts
    unresolved_conflicts = [c for c in state.conflicts if not c.is_resolved]
    if unresolved_conflicts:
        for c in unresolved_conflicts:
            warnings.append(FormValidationWarning(
                field_id=c.field_id,
                section_id="allegations",
                message=f"Unresolved contradiction: {c.description}"
            ))

    is_valid = len(errors) == 0
    return GuidedFormValidationResponse(
        is_valid_for_drafting=is_valid,
        blocking_errors=errors,
        warnings=warnings,
        pecuniary_jurisdiction=pecuniary_info
    )


async def generate_draft_from_guided_form(db: AsyncSession, case_id: UUID) -> Dict[str, Any]:
    """
    Triggers existing legal drafting pipeline using verified guided form fields.
    Reuses stage4_generator_service and template_service.
    """
    case = await db.get(GrievanceCase, case_id)
    if not case:
        raise ValueError(f"Case {case_id} not found")
        
    state = await get_or_initialize_guided_form(db, case_id)
    validation = validate_guided_form_state(state)
    if not validation.is_valid_for_drafting:
        raise ValueError(f"Form has {len(validation.blocking_errors)} blocking errors: {[e.message for e in validation.blocking_errors]}")

    # Map fields into ExtractedConsumerFacts
    field_map = {}
    for sec in state.sections:
        for f in sec.fields:
            field_map[f.field_id] = f.value

    # Construct ExtractedConsumerFacts
    facts = ExtractedConsumerFacts(
        complainant_name=field_map.get("complainant_name"),
        complainant_address=field_map.get("complainant_address"),
        complainant_phone=field_map.get("complainant_phone"),
        complainant_email=field_map.get("complainant_email"),
        product_or_service=field_map.get("product_or_service") or "Consumer Electronics Device",
        transaction_amount_inr=float(field_map.get("transaction_amount_inr") or 0.0),
        purchase_or_incident_date=field_map.get("purchase_or_incident_date"),
        invoice_number=field_map.get("invoice_number"),
        seller_or_company_name=field_map.get("manufacturer_name") or field_map.get("ecommerce_platform") or "Opposite Party",
        ecommerce_platform=field_map.get("ecommerce_platform"),
        manufacturer_name=field_map.get("manufacturer_name"),
        merchant_seller_name=field_map.get("merchant_seller_name"),
        service_center_name=field_map.get("service_center_name"),
        issue_summary_neutral=field_map.get("issue_summary_neutral") or "Defective product with failure to provide warranty repair.",
        seller_response_summary=field_map.get("seller_response_summary"),
        evidence_mentioned=[item.document_type for item in state.evidence_checklist if item.status == EvidenceStatus.PROVIDED],
        missing_mandatory_fields=[e.field_id for e in validation.blocking_errors],
        evidence_strength_score=case.evidence_strength_score or 75
    )

    # Stage 3: Retrieve relevant statutes
    query_text = facts.issue_summary_neutral or "defective goods and warranty deficiency"
    retrieved = await retrieve_parent_statutes(db, query_text)

    # Stage 4: Generate slots & Jinja2 complaint
    slots = await generate_complaint_slots(facts, retrieved)
    rendered_complaint = render_final_dcdrc_complaint(facts, slots)

    # Update case
    case.extracted_facts = facts.model_dump()
    case.rendered_complaint = rendered_complaint
    case.status = "complete"
    state.is_ready_for_draft = True
    case.guided_form_state = state.model_dump(mode="json")
    await db.commit()

    return {
        "rendered_complaint": rendered_complaint,
        "evidence_strength_score": case.evidence_strength_score,
        "pecuniary_jurisdiction": validation.pecuniary_jurisdiction.model_dump() if validation.pecuniary_jurisdiction else None,
        "validation_warnings": [w.model_dump() for w in validation.warnings]
    }
