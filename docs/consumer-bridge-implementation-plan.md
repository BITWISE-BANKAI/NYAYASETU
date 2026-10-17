# NyayaSetu Consumer Bridge: Implementation Plan

**Date:** 17 October 2026  
**Document version:** 1.0.0  
**Status:** Approved for Implementation  
**Base Repository:** NyayaSetu (FastAPI + React 18 + PostgreSQL/pgvector + Ollama)  

---

## 1. Audit Findings & Baseline Verification

### 1.1 Repository Structure
- **Backend (`nyaysetu_backend/`)**:
  - Framework: FastAPI + Uvicorn
  - Database: SQLAlchemy Async (`core/database.py`), PostgreSQL with `pgvector`
  - Models: `GrievanceCase` (`models/grievance_case.py`), `LegalStatute` (`models/legal_statute.py`)
  - Pipeline Services:
    - `stage1_ocr_service.py` (OCR parsing)
    - `stage2_fact_service.py` (Qwen2.5 3B structured extraction via Instructor)
    - `stage3_rag_service.py` (pgvector cosine retrieval + optional InLegalBERT rerank)
    - `stage4_generator_service.py` (Local drafter LLM + P0 consistency gate)
    - `template_service.py` (Jinja2 DCDRC petition template renderer)
  - Endpoints: `api/v1/endpoints_cases.py`, `api/v1/endpoints_statutes.py`
  - Test Suite: `tests/test_golden_set.py` (Passes: 3 passed in 3.92s)

- **Frontend (`nyaysetu_frontend/`)**:
  - Framework: React 18 / 19, Vite, React Router DOM 7
  - Styling: Vanilla CSS with design tokens (`index.css`), Manrope typography, Soft Neumorphism (`#EEF1F6` base, dual shadows)
  - Existing Pages: `Landing.jsx`, `Intake.jsx`, `EvidenceUpload.jsx`, `Dashboard.jsx`
  - Existing UI primitives: `NeuCard`, `NeuButton`, `NeuInput`, `NeuTextArea`

- **Database & Local Models**:
  - PostgreSQL 16 + pgvector running via Docker container `nyaysetu-db` on port 5432
  - Ollama running locally at `http://localhost:11434` with:
    - `qwen2.5:3B-instruct` (Fact extraction)
    - `nyaysetu-drafter:latest` / `qwen2.5:7b-instruct` (Legal drafting)
    - `qwen3-embedding:0.6b` (Statute embeddings)

### 1.2 Stitch MCP Inspection
- Connected Stitch MCP server discovered and queried.
- Existing Project: `projects/8703302765528619586` ("NyayaSetu Consumer Rights Navigator").
- Existing Screens:
  - `projects/8703302765528619586/screens/2c9920132464435d9cbeaacd9a456d95` (Landing)
  - `projects/8703302765528619586/screens/74ae348f050c4bdabf772de257c4a4c3` (Tell Us What Happened)
  - `projects/8703302765528619586/screens/1871b5bfdcc545f5865ae8f68463e52a` (Evidence Upload)
  - `projects/8703302765528619586/screens/8136810ffd23486c9ea89b46b586824b` (Case Facts)
  - `projects/8703302765528619586/screens/6556175dd46e4e679cba38c312b293c7` (Evidence Strength)
  - `projects/8703302765528619586/screens/edee364d84d3420bb34671f7d33159fb` (Review Complaint)
- Newly Generated Stitch Screen for Consumer Bridge:
  - Screen ID: `75f0499587c940c6b6e903a47bef68fc` ("NyayaSetu | Guided Complaint Wizard")
  - Design tokens verified: `#EEF1F6` base, `#2A2E37` ink, `#3F6FE0` understand, `#C87F1C` prepare, `#1F8A5C` act, `#C0433A` danger, Manrope font.

---

## 2. Architectural Design Decisions

1. **Additive Schema & Persistence**:
   - Add a `guided_form_state` JSON column to `GrievanceCase` (in `models/grievance_case.py` and via DB alter if needed) to store section progress, field answers, user confirmations, provenance metadata, and conflict resolutions.
   - Reuse existing `GrievanceCase` record and `case_id`.

2. **Field Provenance Model**:
   - Every field tracks: `field_id`, `value`, `status` (`confirmed`, `suggested`, `missing`, `conflict`, `unknown`, `not_applicable`), `provenance` (`user_input`, `uploaded_document`, `existing_case`, `deterministic_rule`, `unknown`), source references, and `user_confirmed: bool`.

3. **Contextual RAG Field Help Engine**:
   - Service: `services/guided_form_service.py`
   - Reuses `stage3_rag_service.py` and database `legal_statutes`.
   - Incorporates e-Jagriti official filing guidelines and CPA 2019 provisions into the legal corpus with official URLs and section headings.
   - Plain-language explanation generated via configured local LLM (`qwen2.5:3B-instruct` or drafter) strictly grounded in retrieved passages; if similarity is insufficient, returns `"insufficient_sources"` state with no fabricated citations.

4. **Guided Form Sections**:
   - Section 1: Overview & Jurisdiction
   - Section 2: Complainant Details
   - Section 3: Opposite Parties (Marketplace, Manufacturer, Merchant Seller, Service Center)
   - Section 4: Transaction & Product
   - Section 5: Incident Timeline & Dispute History
   - Section 6: Alleged Defects & Deficiencies
   - Section 7: Relief Requested (Refund vs Compensation vs Litigation Costs)
   - Section 8: Evidence Checklist & Annexures
   - Section 9: Final Review & Complaint Preview

5. **Deterministic Consistency & Drafting Pipeline Reuse**:
   - Reuses `stage4_generator_service.py` and `template_service.py`.
   - Before generation, validates blocking errors (missing mandatory fields, invalid dates, unconfirmed amounts).
   - Displays real editable preview and download/copy actions.

---

## 3. Files to Add & Modify

### Backend
- Modify `nyaysetu_backend/models/grievance_case.py`: Add `guided_form_state = Column(JSON, nullable=True)`.
- Modify `nyaysetu_backend/services/stage3_rag_service.py`: Make `sentence_transformers` import resilient and ensure metadata URL/section preservation.
- Create `nyaysetu_backend/schemas/guided_form.py`: Pydantic schemas for form state, field provenance, guidance responses, validation errors, and checklist items.
- Create `nyaysetu_backend/services/guided_form_service.py`: Business logic for form state hydration, field patching, conflict resolution, RAG field guidance, evidence checklist generation, and validation.
- Modify `nyaysetu_backend/api/v1/endpoints_cases.py`: Add `/api/v1/cases/{case_id}/guided-form` endpoints.
- Update `nyaysetu_backend/scripts/seed_data.json` & `seed_db.py`: Add official e-Jagriti filing guidelines and CPA 2019 rules.
- Add tests in `nyaysetu_backend/tests/test_guided_form.py`.

### Frontend
- Create `nyaysetu_frontend/src/components/guided_form/`:
  - `FormStepper.jsx`: Section progress and navigation.
  - `FieldWithProvenance.jsx`: Field input with status badge, provenance label, confirm/edit/unknown buttons.
  - `RAGHelpDrawer.jsx`: "Why is this needed?" drawer with plain-language explanation, official citations, and insufficient-source fallback.
  - `EvidenceChecklistSection.jsx`: Evidence cards with required vs helpful distinction.
  - `ConflictResolverModal.jsx`: Targeted clarification modal.
- Create `nyaysetu_frontend/src/pages/GuidedForm.jsx`: The comprehensive guided wizard page.
- Update `nyaysetu_frontend/src/App.jsx`: Register route `case/:caseId/guided-form`.
- Update `nyaysetu_frontend/src/pages/Dashboard.jsx` & `Intake.jsx`: Add direct navigation into the Guided Form.

---

## 4. Implementation Sequence

1. **Backend Foundation**:
   - Update `GrievanceCase` model and database column.
   - Create `schemas/guided_form.py`.
   - Ingest / seed official e-Jagriti & CPA 2019 guidelines into `legal_statutes`.
   - Implement `services/guided_form_service.py` (RAG guidance, state management, validation).
   - Wire endpoints in `api/v1/endpoints_cases.py`.
   - Run backend test suite and verify new endpoints.

2. **Frontend UI Implementation**:
   - Implement components in `components/guided_form/` adhering to Stitch design system tokens.
   - Build `pages/GuidedForm.jsx` with section stepper, field provenance, RAG help drawer, and evidence checklist.
   - Connect frontend to real backend API endpoints.
   - Build and verify frontend (`npm run build`, `npm run lint`).

3. **End-to-End Verification**:
   - Test representative consumer electronics warranty dispute (e.g. ₹54,999 Smart TV defect).
   - Verify fact review, confirmation, field guidance citations, conflict handling, evidence checklist, validation, and draft generation.
   - Ensure existing golden set tests continue to pass.
