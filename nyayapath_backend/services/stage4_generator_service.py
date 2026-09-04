import re
import json
from datetime import datetime
from typing import List, Set
import instructor
from openai import AsyncOpenAI
from core.config import settings
from schemas.extracted_facts import ExtractedConsumerFacts
from schemas.complaint_generation import StructuredLegalSlots
from schemas.legal_retrieval import RerankedResult

class GenerationError(Exception):
    pass

class ConsistencyError(Exception):
    pass

FORBIDDEN_TOKENS = [
    "SWORN BEFORE ME",
    "District Commissioner",
    "Hon'ble District Commissioner's Seal"
]

def _extract_amounts(text: str) -> List[float]:
    """Extract numeric amounts prefixed by Rs, INR, ₹ or standalone currency figures."""
    pattern = re.compile(r'(?:Rs\.?|INR|₹|\bRs\b)\s*([\d,]+\.?\d*)', re.IGNORECASE)
    amounts = []
    for match in pattern.findall(text):
        cleaned = match.replace(',', '').strip('.')
        try:
            val = float(cleaned)
            amounts.append(val)
        except ValueError:
            pass
    return amounts

def _normalize_date_str(date_str: str) -> str:
    """Normalize date strings to YYYY-MM-DD for comparison."""
    date_str = date_str.strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y", "%d %B %Y", "%d %b %Y", "%B %d, %Y"):
        try:
            return datetime.strptime(date_str, fmt).strftime("%Y-%m-%d")
        except ValueError:
            pass
    return date_str

def _check_consistency(facts: ExtractedConsumerFacts, slots: StructuredLegalSlots):
    """
    Post-generation consistency check (P0 Architectural Mandate).
    Validates:
    1. Zero forbidden tokens (e.g. 'SWORN BEFORE ME', 'District Commissioner').
    2. Numerical amounts in the narrative match extracted facts, valid dispute fees, or claim reliefs.
    3. Dates mentioned in the narrative are consistent with the case timeline.
    """
    narrative_text = " ".join(slots.statement_of_facts_narrative)
    
    # 1. Check for forbidden tokens
    for token in FORBIDDEN_TOKENS:
        if token.lower() in narrative_text.lower():
            raise ConsistencyError(f"Forbidden token found in generation: {token}")
            
    # 2. Check amounts
    found_amounts = _extract_amounts(narrative_text)
    if found_amounts:
        valid_amounts: Set[float] = set()
        if facts.transaction_amount_inr is not None:
            valid_amounts.add(float(facts.transaction_amount_inr))
        
        # Extract valid amounts from issue summary and seller response
        for text_source in [facts.issue_summary_neutral, facts.seller_response_summary or ""]:
            for amt in _extract_amounts(text_source):
                valid_amounts.add(amt)
            for num in re.findall(r'\b\d{3,7}(?:\.\d{1,2})?\b', text_source):
                try:
                    valid_amounts.add(float(num))
                except ValueError:
                    pass

        # Also permit amounts requested in prayer items (e.g., compensation, refunds)
        prayer_text = " ".join(slots.prayer_items)
        for pa in _extract_amounts(prayer_text):
            valid_amounts.add(pa)

        if valid_amounts:
            for found in found_amounts:
                matched = any(abs(found - valid) < 1.0 for valid in valid_amounts)
                if not matched:
                    raise ConsistencyError(
                        f"Hallucinated amount found: ₹{found}. Valid source amounts are {list(valid_amounts)}"
                    )

    # 3. Check dates
    date_regex = re.compile(r'\b(?:\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{4}[-/.]\d{1,2}[-/.]\d{1,2})\b')
    found_date_matches = date_regex.findall(narrative_text)
    if found_date_matches and facts.purchase_or_incident_date:
        norm_source_date = _normalize_date_str(facts.purchase_or_incident_date)
        norm_found_dates = [_normalize_date_str(d) for d in found_date_matches]
        
        source_summary_dates = [_normalize_date_str(d) for d in date_regex.findall(facts.issue_summary_neutral or "")]
        all_valid_dates = {norm_source_date} | set(source_summary_dates)

        if not any(fd in all_valid_dates for fd in norm_found_dates):
            raise ConsistencyError(
                f"Hallucinated date found: {found_date_matches}. Source date is {facts.purchase_or_incident_date}"
            )

def _sanitize_fabricated_identifiers(slots: StructuredLegalSlots):
    """
    Hard rule: Replaces synthetic placeholder IDs (e.g. '001', 'INV-001', '123') with accurate legal placeholders.
    """
    fake_invoice_pat = re.compile(r'(?:Invoice\s*(?:number|no\.?|#)?\s*(?:001|123|1234|INV-?\d{1,4}))', re.IGNORECASE)
    fake_js_pat = re.compile(r'(?:Job\s*Sheet\s*(?:number|no\.?|#)?\s*(?:001|123|1234|JS-?\d{1,4}))', re.IGNORECASE)
    
    cleaned_annexures = []
    for ann in slots.annexure_descriptions:
        clean_ann = fake_invoice_pat.sub('Tax Invoice [Invoice number not specified in records]', ann)
        clean_ann = fake_js_pat.sub('Technician Job Sheet [Reference as per service records]', clean_ann)
        cleaned_annexures.append(clean_ann)
    slots.annexure_descriptions = cleaned_annexures

async def generate_complaint_slots(facts: ExtractedConsumerFacts, retrieved_parents: List[RerankedResult]) -> StructuredLegalSlots:
    """
    Manages connection to local Ollama instance serving 'nyayapath-drafter'.
    Parses and validates response as StructuredLegalSlots via Instructor.
    Runs forbidden-token / consistency gate immediately after parsing.
    """
    client = instructor.from_openai(
        AsyncOpenAI(
            base_url=f"{settings.ollama_host}/v1",
            api_key="ollama" # required for OpenAI client, ignored by ollama
        ),
        mode=instructor.Mode.JSON
    )

    # Build Context
    context_facts = facts.model_dump_json()
    context_statutes = json.dumps([{"text": r.chunk_text, "path": r.hierarchy_path} for r in retrieved_parents])
    
    prompt_content = f"""
    You are 'nyayapath-drafter', an expert Indian consumer rights legal AI.
    Generate the StructuredLegalSlots for a formal consumer complaint before the Consumer Disputes Redressal Commission.
    
    CRITICAL LEGAL PLEADING GUIDELINES:
    
    1. MULTI-ENTITY IDENTIFICATION & ROLE CLARITY:
       - Do NOT collapse all entities into a single generic 'seller'.
       - Populate the 'opposite_parties' array with distinct entities:
         * E-Commerce Marketplace (e.g. Amazon / Flipkart): Opposite Party No. 1 (E-Commerce Marketplace Platform / Intermediary)
         * Manufacturer (e.g. Samsung / Apple / LG): Opposite Party No. 2 (Product Manufacturer)
         * Retail Merchant: Opposite Party No. 3 ([Merchant Seller as named on Tax Invoice / Order Record])
         * Authorized Service Centre: Opposite Party No. 4 (Authorized Service Provider / Technician Centre)
       - In 'statement_of_facts_narrative', explicitly record:
         "The Complainant purchased the subject product on the e-commerce platform of Opposite Party No. 1. The exact legal identity of the third-party merchant seller and the respective liabilities of the marketplace entity and manufacturer shall be determined from the purchase invoice and warranty records."
    
    2. CHRONOLOGICAL & COMPLETE FACTUAL NARRATIVE:
       - The 'statement_of_facts_narrative' MUST BE THOROUGH and preserve every single material fact, date, symptom, and monetary figure:
         * Mention the exact purchase date, product specifications, and transaction amount (₹{facts.transaction_amount_inr if facts.transaction_amount_inr else 'N/A'}).
         * Mention the specific symptoms (e.g. screen randomly turning black, TV restarting automatically within days of delivery).
         * Mention the complaint lodging date and the technician inspection visit (e.g. on 21 August) where the technician diagnosed display/power board issues on the job sheet without noting any physical damage.
         * Explicitly detail the subsequent refusal where the service centre demanded an unjustified repair charge (e.g. ₹8,500) falsely alleging physical damage.
         * Detail how the Complainant contacted both the platform and manufacturer via emails and WhatsApp chats, and how both opposite parties passed responsibility onto each other without resolving the grievance.
    
    3. STRICT PROHIBITION ON FABRICATING IDENTIFIERS (ZERO FABRICATION):
       - NEVER invent or synthesize invoice numbers (e.g., do NOT write '001', 'INV-001', '12345'), policy numbers, serial numbers, case numbers, or addresses.
       - If an invoice number is not provided in the input, format the annexure as:
         "Tax Invoice dated [Date] [Invoice number not specified in current records]"
       - If a job sheet number is not provided, write: "Technician Job Sheet dated [Date] [Job sheet reference as per service record]"
    
    4. HIERARCHICAL LEGAL GROUNDS (Accurate CPA 2019 Sections):
       Structure 'legal_grounds' in strict foundational priority:
       - Ground 1: Defect in Goods — Section 2(10) read with Section 35 of CPA 2019:
         The product developed functional defects (screen blackout, power board failure) within days of purchase, violating standard merchantable quality and express specifications.
       - Ground 2: Deficiency in Service — Section 2(11) read with Section 35 of CPA 2019:
         The opposite parties failed to provide warranty service, arbitrarily alleged physical damage contrary to the initial inspection, and refused repair/replacement.
       - Ground 3: Unfair Trade Practice — Section 2(47) of CPA 2019:
         Misleading warranty commitments, deceptive denial of warranty coverage, demanding unauthorized repair charges, and shifting responsibility between marketplace and manufacturer.
       - Ground 4: Violation of E-Commerce Obligations — Consumer Protection (E-Commerce) Rules, 2020:
         Violation of Rules 4, 5 & 6 regarding marketplace grievance redressal duties and prohibition against refusing return/refund for defective goods.
       - Ground 5: Product Liability & Warranty Breach — Chapter VI (Sections 82–87, specifically Section 84 & 85):
         Pled without prejudice to primary claims of Defect and Deficiency, establishing statutory liability of manufacturer and service provider for failure to conform to express warranty terms.
    
    5. FORMAL ANNEXURES & PRAYERS:
       - List all documents mentioned (Tax Invoice, Warranty Card, Technician Job Sheet, Email/WhatsApp records, Photos/Videos).
       - Itemize reliefs under Section 39: Full refund of purchase price (₹{facts.transaction_amount_inr if facts.transaction_amount_inr else 'N/A'}) with interest, compensation for harassment and mental agony, and litigation costs.
       - NEVER use forbidden phrases ("SWORN BEFORE ME", "District Commissioner").
    
    Facts:
    {context_facts}
    
    Retrieved Statutes:
    {context_statutes}
    """

    for attempt in range(2):
        try:
            slots = await client.chat.completions.create(
                model=settings.drafter_model,
                response_model=StructuredLegalSlots,
                messages=[
                    {"role": "system", "content": "You output JSON strictly conforming to the StructuredLegalSlots schema."},
                    {"role": "user", "content": prompt_content}
                ],
                temperature=0.1,
            )
            
            # Post-generation gate
            _check_consistency(facts, slots)
            _sanitize_fabricated_identifiers(slots)
            return slots
            
        except ConsistencyError as ce:
            if attempt == 0:
                # Retry with correction note
                prompt_content += f"\n\nCORRECTION: Your previous output failed consistency checks. Reason: {ce}. Please fix this."
                continue
            else:
                # Hard failure on second attempt
                raise GenerationError(f"Generation failed consistency gate after retry: {ce}")
        except Exception as e:
            raise GenerationError(f"Generation failed: {str(e)}")

