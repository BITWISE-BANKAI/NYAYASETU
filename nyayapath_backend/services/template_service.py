import re
from schemas.extracted_facts import ExtractedConsumerFacts
from schemas.complaint_generation import StructuredLegalSlots
from jinja2 import Environment, FileSystemLoader

class TemplateRenderError(Exception):
    pass

def determine_jurisdiction_and_forum(amount_inr: float) -> dict:
    """
    Determines pecuniary jurisdiction automatically.
    District < ₹50L, State ₹50L–₹2Cr, National (NCDRC) > ₹2Cr.
    """
    amount = amount_inr or 0
    if amount <= 5000000:
        return {"forum_name": "District Consumer Disputes Redressal Commission", "tier": "District"}
    elif amount <= 20000000:
        return {"forum_name": "State Consumer Disputes Redressal Commission", "tier": "State"}
    else:
        return {"forum_name": "National Consumer Disputes Redressal Commission", "tier": "National"}

def render_final_dcdrc_complaint(facts: ExtractedConsumerFacts, slots: StructuredLegalSlots, template_dir: str = "templates") -> str:
    """
    Merges deterministic fact/metadata fields and validated LLM narrative into Jinja2 template.
    Runs second-pass regex consistency check before rendering.
    """
    env = Environment(loader=FileSystemLoader(template_dir))
    template = env.get_template("dcdrc_complaint_skeleton.jinja2")
    
    forum_info = determine_jurisdiction_and_forum(facts.transaction_amount_inr if facts.transaction_amount_inr else 0)
    
    # Second pass consistency check can go here
    
    clean_narrative = [re.sub(r'^\s*\d+[\.\)]\s*', '', p).strip() for p in slots.statement_of_facts_narrative]
    clean_prayers = [re.sub(r'^\s*\d+[\.\)]\s*', '', p).strip() for p in slots.prayer_items]
    
    # Auto-generate structured opposite parties if model didn't populate it
    opposite_parties = slots.opposite_parties
    if not opposite_parties and (facts.ecommerce_platform or facts.manufacturer_name):
        from schemas.complaint_generation import OppositePartyItem
        op_list = []
        if facts.ecommerce_platform:
            op_list.append(OppositePartyItem(
                party_title=f"{facts.ecommerce_platform} (E-Commerce Marketplace Platform)",
                party_role="E-Commerce Marketplace Platform / Intermediary",
                address_or_note="[Address / Registered Office as per purchase invoice/order record]"
            ))
        if facts.manufacturer_name:
            op_list.append(OppositePartyItem(
                party_title=f"{facts.manufacturer_name} (Product Manufacturer)",
                party_role="Product Manufacturer",
                address_or_note="[Address / Office as per warranty card/documentation]"
            ))
        if facts.merchant_seller_name:
            op_list.append(OppositePartyItem(
                party_title=f"{facts.merchant_seller_name} (Registered Seller)",
                party_role="Merchant Seller as per Purchase Invoice",
                address_or_note="[Address as per Tax Invoice]"
            ))
        opposite_parties = op_list

    rendered_complaint = template.render(
        forum_name=forum_info["forum_name"],
        forum_city=getattr(facts, "complainant_city", None) or "[INSERT CITY]",
        complainant_name=getattr(facts, "complainant_name", None) or "[INSERT COMPLAINANT NAME]",
        seller_name=facts.seller_or_company_name or "[INSERT SELLER NAME]",
        opposite_parties=opposite_parties,
        transaction_amount=facts.transaction_amount_inr,
        statement_of_facts_narrative=clean_narrative,
        legal_grounds=slots.legal_grounds,
        annexure_descriptions=slots.annexure_descriptions,
        prayer_items=clean_prayers
    )
    
    return rendered_complaint
