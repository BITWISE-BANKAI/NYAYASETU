import re
import os
import io
import base64
from typing import Dict, Any, Tuple
import pdfplumber
import pytesseract
from PIL import Image
from core.config import settings
import ollama

class OCRServiceError(Exception):
    pass

# Compiled Regex Patterns
REGEX_DATE = re.compile(r'\b(?:\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{4}[-/.]\d{1,2}[-/.]\d{1,2})\b')
REGEX_AMOUNT = re.compile(r'(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)', re.IGNORECASE)
REGEX_INVOICE = re.compile(r'(?:Invoice|Order)\s*(?:No\.?|#|Number)\s*[:\-]?\s*([A-Za-z0-9\-]+)', re.IGNORECASE)

def _extract_text_tier1(file_path: str) -> Tuple[str, list[Image.Image]]:
    """Extract text from a document using pdfplumber or pytesseract."""
    text = ""
    images = []
    
    ext = file_path.lower().split('.')[-1]
    try:
        if ext == 'pdf':
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    extracted = page.extract_text()
                    if extracted:
                        text += extracted + "\\n"
                    # Try to capture first page as image for potential tier 2 fallback
                    try:
                        images.append(page.to_image().original)
                    except Exception:
                        pass
        elif ext in ['png', 'jpg', 'jpeg', 'tiff', 'bmp']:
            img = Image.open(file_path)
            images.append(img)
            text = pytesseract.image_to_string(img)
        else:
            raise OCRServiceError(f"Unsupported file extension: {ext}")
    except Exception as e:
        raise OCRServiceError(f"Tier 1 Extraction failed: {e}")
        
    return text, images

def _parse_fields_from_text(text: str) -> Tuple[Dict[str, Any], float]:
    """Parse fields using regex and compute confidence."""
    extracted = {
        "purchase_date": None,
        "transaction_amount": None,
        "invoice_number": None
    }
    
    # Extract Date
    date_matches = REGEX_DATE.findall(text)
    if date_matches:
        extracted["purchase_date"] = date_matches[0]
        
    # Extract Amount
    amount_matches = REGEX_AMOUNT.findall(text)
    if amount_matches:
        extracted["transaction_amount"] = amount_matches[0]
        
    # Extract Invoice Number
    invoice_matches = REGEX_INVOICE.findall(text)
    if invoice_matches:
        extracted["invoice_number"] = invoice_matches[0]
        
    # Calculate simple confidence
    fields_found = sum(1 for v in extracted.values() if v is not None)
    confidence = fields_found / len(extracted) if text.strip() else 0.0
    
    return extracted, confidence

async def _escalate_tier2_vision(image: Image.Image) -> Tuple[Dict[str, Any], float]:
    """Use Ollama's Vision model (qwen2.5-vl) to extract data when Tier 1 confidence is low."""
    if not image:
        return {}, 0.0
        
    # Convert PIL Image to Base64
    buffered = io.BytesIO()
    # Handle RGBA to RGB for JPEG saving
    if image.mode in ("RGBA", "P"):
        image = image.convert("RGB")
    image.save(buffered, format="JPEG")
    img_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
    
    prompt = (
        "Extract the following details from this image and return ONLY a JSON object: "
        "purchase_date, transaction_amount, seller_name, invoice_number. "
        "If a field is missing, set its value to null."
    )
    
    try:
        # Use synchronous ollama client (if inside async, should ideally run in executor or use AsyncClient)
        # Assuming AsyncClient is available in the installed package.
        client = ollama.AsyncClient(host=settings.ollama_host)
        response = await client.chat(
            model=settings.vision_model,
            messages=[{
                'role': 'user',
                'content': prompt,
                'images': [img_b64]
            }],
            format='json',
            options={'temperature': 0.1}
        )
        
        # Parse JSON
        import json
        result = json.loads(response['message']['content'])
        
        # We assign a high confidence since a vision model successfully returned a structured output
        # In a real scenario, the prompt could ask the model for a confidence score per field.
        confidence = 0.9 
        return result, confidence
        
    except Exception as e:
        # Log failure
        print(f"Tier 2 Vision model failed: {e}")
        return {}, 0.0

async def extract_documents(file_paths: list[str]) -> Tuple[Dict[str, Any], Dict[str, float]]:
    """
    Tiered document intelligence (PDR §11 P1).
    Tier 1: classical extraction first — pdfplumber / Tesseract + regex for dates, amounts, invoice numbers.
    Tier 2: escalate to a vision-language model (Qwen2.5-VL-7B) only when Tier 1 confidence is low.
    
    Returns:
        A tuple of (extracted_key_value_pairs, confidence_scores)
    """
    all_extracted = {}
    all_confidences = {}
    
    for file_path in file_paths:
        if not os.path.exists(file_path):
            continue
            
        # 1. Tier 1 Classical Extraction
        text, images = _extract_text_tier1(file_path)
        extracted, confidence = _parse_fields_from_text(text)
        
        # 2. Tier 2 Escalation Check
        if confidence < 0.7 and images:
            # Escalate to Tier 2 with the first available image
            tier2_extracted, tier2_confidence = await _escalate_tier2_vision(images[0])
            
            # If Tier 2 was more confident, use its results
            if tier2_confidence > confidence:
                extracted.update({k: v for k, v in tier2_extracted.items() if v is not None})
                confidence = tier2_confidence
                
        # Merge results for this document
        for k, v in extracted.items():
            if v is not None:
                # If field isn't already found or we're replacing with a better one (simplistic logic)
                all_extracted[k] = v
                all_confidences[k] = confidence
                
    return all_extracted, all_confidences
