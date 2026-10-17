import json
from schemas.extracted_facts import ExtractedConsumerFacts
from core.config import settings
import instructor
from openai import AsyncOpenAI
class FactExtractionError(Exception):
    pass

def compute_evidence_strength(facts: ExtractedConsumerFacts) -> int:
    """
    Deterministic, rule-based scoring function.
    
    Weights:
    - Base score is 0.
    - Transaction amount present: +15
    - Date present: +15
    - Seller/Company name present: +10
    - Issue summary present: +20
    - Invoice mentioned: +15
    - Payment receipt mentioned: +10
    - Warranty card mentioned: +5
    - Chat screenshots/emails: +10
    
    Missing mandatory fields reduce score or prevent full completion.
    """
    score = 0
    
    if facts.transaction_amount_inr is not None:
        score += 15
    if facts.purchase_or_incident_date is not None:
        score += 15
    if facts.seller_or_company_name is not None:
        score += 10
    if facts.issue_summary_neutral:
        score += 20
        
    for evidence in facts.evidence_mentioned:
        if evidence == "invoice":
            score += 15
        elif evidence == "payment_receipt":
            score += 10
        elif evidence == "warranty_card":
            score += 5
        elif evidence in ["chat_screenshots", "emails"]:
            score += 10
            
    # Cap at 100
    return min(score, 100)

async def extract_facts(raw_text: str, ocr_data: dict) -> ExtractedConsumerFacts:
    """
    Interface for schema-constrained small LLM call.
    Target model: Qwen2.5-3B-Instruct
    Uses guided/constrained decoding to ensure ExtractedConsumerFacts schema.
    """
    try:
        client = instructor.from_openai(
            AsyncOpenAI(
                base_url=f"{settings.ollama_host}/v1",
                api_key="ollama" # required for OpenAI client, ignored by ollama
            ),
            mode=instructor.Mode.JSON
        )
        
        prompt = f"""
        Extract the facts from the following consumer grievance narrative and OCR data.
        
        RULES:
        1. You must strictly output JSON matching the provided schema.
        2. DO NOT invent, guess, or extrapolate any missing facts.
        3. If a legally essential variable (e.g. transaction amount, date, seller name) is missing from the narrative or OCR data, set its value to null.
        4. Any field that you set to null MUST have its exact field name appended to the 'missing_mandatory_fields' array.
        5. 'issue_summary_neutral' must be objective, stripping out any emotional venting.
        6. MULTI-ENTITY IDENTIFICATION & PARTICULARS:
           - manufacturer_name: Extract the brand/manufacturer name (e.g. Acer, Samsung, Apple, LG, HP, Dell, Asus, Lenovo). If the user mentions a branded product (e.g. 'acer nitro laptop', 'samsung galaxy', 'apple macbook'), ALWAYS extract the brand name as manufacturer (e.g. 'Acer').
           - product_or_service: Extract the item and model (e.g. 'Acer Nitro Laptop').
           - purchase_or_incident_date: Extract the purchase or incident date. If a relative timeframe is mentioned (e.g. '1 month ago', '2 weeks ago', 'July 2024'), record this relative timeframe instead of null.
           - invoice_number: Extract the specific invoice/bill ID ONLY if an explicit number is given (e.g. 'INV-88219'). NEVER put monetary transaction amounts or prices (e.g. 90000) as invoice_number. If no invoice number is specified, set to null.
           - ecommerce_platform: If purchased on a marketplace platform (e.g. Amazon, Flipkart), extract platform name.
           - merchant_seller_name: Extract third-party seller/retail merchant if mentioned, or set to null if only platform/brand is known.
           - service_center_name: Extract authorized service center/technician entity if mentioned.
           - seller_or_company_name: Set to the primary company, brand, or marketplace named (e.g. 'Acer').
        7. 'evidence_strength_score' should be 0 (it will be calculated automatically afterwards).
        
        OCR DATA:
        {json.dumps(ocr_data, indent=2)}
        
        USER NARRATIVE:
        {raw_text}
        """
        
        facts = await client.chat.completions.create(
            model=settings.fact_extractor_model,
            response_model=ExtractedConsumerFacts,
            messages=[
                {"role": "system", "content": "You are a precise legal fact extractor. Follow all rules strictly and output valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.0
        )
        
        # Calculate evidence strength score deterministically
        facts.evidence_strength_score = compute_evidence_strength(facts)
        
        return facts
        
    except Exception as e:
        raise FactExtractionError(f"Failed to extract facts: {e}")
