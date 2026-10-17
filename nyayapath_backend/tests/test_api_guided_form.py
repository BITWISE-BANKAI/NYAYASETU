import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from main import app
from core.database import AsyncSessionLocal
from models.grievance_case import GrievanceCase

@pytest.mark.asyncio
async def test_guided_form_api_flow():
    case_id = uuid.uuid4()
    
    # 1. Create a test case in database
    async with AsyncSessionLocal() as session:
        case = GrievanceCase(
            id=case_id,
            status="stage2_extraction",
            raw_intake_text="Purchased Samsung TV for 54999 on 2024-08-15 from Amazon. Stopped working after 2 months. Service center claimed physical damage and refused warranty.",
            extracted_facts={
                "product_or_service": "Samsung TV",
                "transaction_amount_inr": 54999.0,
                "purchase_or_incident_date": "2024-08-15",
                "seller_or_company_name": "Samsung",
                "ecommerce_platform": "Amazon",
                "manufacturer_name": "Samsung",
                "issue_summary_neutral": "Display stopped working.",
                "seller_response_summary": "Service center alleged customer physical damage.",
                "evidence_mentioned": ["invoice"]
            },
            evidence_strength_score=75
        )
        session.add(case)
        await session.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 2. Get guided form state
        res = await client.get(f"/api/v1/cases/{case_id}/guided-form")
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        state = data["data"]
        assert state["case_id"] == str(case_id)
        assert len(state["sections"]) == 8
        assert len(state["conflicts"]) >= 1

        # 3. Patch a field (confirm transaction amount)
        patch_res = await client.patch(
            f"/api/v1/cases/{case_id}/guided-form/fields/transaction_amount_inr",
            json={"value": 54999.0, "user_confirmed": True}
        )
        assert patch_res.status_code == 200
        patch_data = patch_res.json()["data"]
        # Find transaction_amount_inr
        amt_field = None
        for sec in patch_data["sections"]:
            for f in sec["fields"]:
                if f["field_id"] == "transaction_amount_inr":
                    amt_field = f
                    break
        assert amt_field is not None
        assert amt_field["status"] == "confirmed"
        assert amt_field["user_confirmed"] is True

        # 4. Patch a field with mark_unknown
        unk_res = await client.patch(
            f"/api/v1/cases/{case_id}/guided-form/fields/invoice_number",
            json={"mark_unknown": True}
        )
        assert unk_res.status_code == 200

        # 5. Fetch contextual RAG guidance for forum / pecuniary jurisdiction
        guide_res = await client.post(
            f"/api/v1/cases/{case_id}/guided-form/guidance",
            json={"field_id": "forum", "section_id": "overview"}
        )
        assert guide_res.status_code == 200
        guide_data = guide_res.json()["data"]
        assert guide_data["field_id"] == "forum"
        assert guide_data["grounding_status"] == "supported"
        assert len(guide_data["sources"]) > 0
        for src in guide_data["sources"]:
            assert src["url"].startswith("http")
            assert src["title"] != ""

        # 6. Resolve clarification
        conf_id = state["conflicts"][0]["conflict_id"]
        resolve_res = await client.post(
            f"/api/v1/cases/{case_id}/guided-form/clarifications",
            json={
                "conflict_id": conf_id,
                "field_id": "issue_summary_neutral",
                "resolution_choice": "custom_value",
                "resolved_value": "No external damage occurred; display failed during normal usage.",
                "notes": "Verified by consumer"
            }
        )
        assert resolve_res.status_code == 200
        resolve_data = resolve_res.json()["data"]
        resolved_conf = [c for c in resolve_data["conflicts"] if c["conflict_id"] == conf_id][0]
        assert resolved_conf["is_resolved"] is True

        # 7. Get Evidence Checklist
        ev_res = await client.get(f"/api/v1/cases/{case_id}/evidence-checklist")
        assert ev_res.status_code == 200
        ev_items = ev_res.json()["data"]
        assert len(ev_items) >= 4
        # Check requirement level distinction
        req_levels = {item["requirement_level"] for item in ev_items}
        assert "mandatory_filing_instruction" in req_levels
        assert "recommended_evidence" in req_levels

        # 8. Validate form
        val_res = await client.post(f"/api/v1/cases/{case_id}/guided-form/validate")
        assert val_res.status_code == 200
        val_data = val_res.json()["data"]
        assert val_data["pecuniary_jurisdiction"]["forum_name"] == "District Consumer Disputes Redressal Commission (DCDRC)"
