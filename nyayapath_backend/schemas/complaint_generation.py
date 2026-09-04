from typing import List, Optional
from pydantic import BaseModel, Field

class OppositePartyItem(BaseModel):
    party_title: str = Field(description="Title and legal entity name (e.g. 'Opposite Party No. 1: Amazon Seller Services Private Limited')")
    party_role: str = Field(description="Legal/commercial role (e.g. 'E-Commerce Marketplace Entity / Platform', 'Product Manufacturer', 'Merchant Seller as per Purchase Invoice', 'Authorized Service Provider')")
    address_or_note: str = Field(default="[Address as per purchase invoice / records]", description="Address or legal status reservation note")

class LegalGroundItem(BaseModel):
    section_title: str
    cpa_section_ref: str
    applicability_justification: str

class StructuredLegalSlots(BaseModel):
    opposite_parties: List[OppositePartyItem] = Field(
        default_factory=list,
        description="Structured list of all relevant Opposite Parties (E-Commerce Marketplace, Manufacturer, Merchant Seller, Service Center)"
    )
    statement_of_facts_narrative: List[str] = Field(
        description="Numbered formal legal paragraphs"
    )
    legal_grounds: List[LegalGroundItem] = Field(
        description="Section title, cpa_section_ref, applicability_justification structured hierarchically (Defect in Goods Sec 2(10), Deficiency in Service Sec 2(11), Unfair Trade Practice Sec 2(47), E-Commerce Rules 2020, etc.)"
    )
    prayer_items: List[str] = Field(
        description="Itemized reliefs under Section 39 (refund, compensation, costs)"
    )
    annexure_descriptions: List[str] = Field(
        description="List of annexures"
    )
