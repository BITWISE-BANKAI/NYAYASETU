from typing import Optional, List, Literal
from pydantic import BaseModel, Field

class ExtractedConsumerFacts(BaseModel):
    product_or_service: Optional[str] = Field(default=None, description="Item / model / brand involved.")
    transaction_amount_inr: Optional[float] = Field(default=None, description="Normalized numeric INR value (e.g. '45 hazaar' -> 45000).")
    purchase_or_incident_date: Optional[str] = Field(default=None, description="ISO date or relative timeframe if exact date is missing.")
    seller_or_company_name: Optional[str] = Field(default=None, description="Primary merchant / manufacturer / platform name.")
    
    # Multi-party entity breakdown
    ecommerce_platform: Optional[str] = Field(default=None, description="Marketplace platform if bought online (e.g. Amazon, Flipkart).")
    manufacturer_name: Optional[str] = Field(default=None, description="Manufacturer/brand of product (e.g. Samsung, Apple).")
    merchant_seller_name: Optional[str] = Field(default=None, description="Direct registered merchant seller or '[Seller as per invoice]'.")
    service_center_name: Optional[str] = Field(default=None, description="Authorized service center or technician entity involved.")
    
    issue_summary_neutral: str = Field(default="", description="Objective defect/deficiency description, emotional content stripped.")
    seller_response_summary: Optional[str] = Field(default=None, description="Objective summary of the seller's refusal / delay / denial.")
    evidence_mentioned: List[Literal[
        "invoice", "warranty_card", "job_sheet",
        "chat_screenshots", "emails", "photos_or_video", "payment_receipt"
    ]] = Field(default_factory=list, description="Enumerated list of mentioned evidence types.")
    missing_mandatory_fields: List[str] = Field(
        default_factory=list,
        description="Legally essential variables absent from the narrative. Never inferred — explicit nulls only."
    )
    evidence_strength_score: int = Field(
        default=0,
        description="0–100, computed deterministically, not by the LLM."
    )
