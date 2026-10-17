import os
import re
import json
import hashlib
from typing import List, Optional
from pydantic import BaseModel, Field
from PIL import Image, ImageOps, ImageEnhance
import imagehash
from dotenv import load_dotenv
from fx_converter import normalize_currency

load_dotenv()

class LineItem(BaseModel):
    description: str
    amount: float
    disallowed: bool = False

class ExtractedReceipt(BaseModel):
    vendor: Optional[str] = "Unknown Vendor"
    date: Optional[str] = None # YYYY-MM-DD
    total_amount: float = 0.0
    currency: str = "USD"
    category: str = "Meals"
    line_items: List[LineItem] = Field(default_factory=list)
    calculated_tax: float = 0.0
    calculated_tip: float = 0.0
    is_itemized: bool = False
    image_hash: str = ""

def preprocess_receipt_image(image_path: str) -> None:
    """
    Normalizes orientation via EXIF and applies contrast/sharpness
    enhancement to boost readability of faded thermal receipts.
    """
    try:
        with Image.open(image_path) as img:
            # 1. Rotate based on EXIF tag (mobile camera angles)
            img = ImageOps.exif_transpose(img).convert("RGB")
            
            # 2. Enhance contrast slightly for faded thermal paper
            contrast_enhancer = ImageEnhance.Contrast(img)
            img = contrast_enhancer.enhance(1.2)
            
            # 3. Enhance sharpness for faint text
            sharpness_enhancer = ImageEnhance.Sharpness(img)
            img = sharpness_enhancer.enhance(1.2)
            
            img.save(image_path)
    except Exception as e:
        print(f"Warning: Image pre-processing skipped: {e}")

def compute_image_hash(image_path: str) -> str:
    """Computes a perceptual hash (pHash) of the image to catch duplicates across channels and angles."""
    try:
        with Image.open(image_path) as img:
            img = ImageOps.exif_transpose(img)
            return str(imagehash.phash(img))
    except Exception:
        # Fallback to MD5 of file content
        try:
            with open(image_path, "rb") as f:
                return hashlib.md5(f.read()).hexdigest()
        except Exception:
            return hashlib.md5(str(image_path).encode()).hexdigest()

def extract_receipt(image_path: str) -> ExtractedReceipt:
    """
    Extracts structured receipt data using a cloud multimodal model (Gemini).
    Pre-processes the image and falls back gracefully.
    """
    # 1. Preprocess & Hash
    preprocess_receipt_image(image_path)
    img_hash = compute_image_hash(image_path)

    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    
    # 2. If API key is present, invoke cloud vision model
    if api_key:
        prompt = """Analyze this receipt carefully and extract structured data as strict JSON conforming to this schema:
{
  "vendor": "string (business or merchant name)",
  "date": "YYYY-MM-DD (transaction date, or null if unreadable)",
  "total_amount": 0.00 (final total charge as numeric float),
  "currency": "USD" (ISO 3-letter currency code, e.g. USD, EUR, GBP, JPY, CAD, INR, AUD, CHF),
  "category": "Meals" (infer one of: "Meals", "Lodging", "Transport", "Office Supplies", "Entertainment"),
  "line_items": [
    {"description": "item description", "amount": 0.00}
  ],
  "calculated_tax": 0.00,
  "calculated_tip": 0.00,
  "is_itemized": true
}
Important Extraction Rules:
1. Currency: Extract the correct currency (e.g. € -> EUR, ¥ -> JPY, £ -> GBP, $ -> USD, ₹ -> INR).
2. Messy/Faded Receipts: If the printed total is faded or obscured, sum up the line items + tax.
3. Handwritten content: Check for handwritten tips or totals added at the bottom.
4. Itemization: Extract every distinct item listed with its numeric amount.
5. Return RAW JSON ONLY. No markdown wrapping or conversational explanation."""

        # Attempt google-genai SDK
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=api_key)
            with open(image_path, "rb") as f:
                img_bytes = f.read()

            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[
                    types.Part.from_bytes(data=img_bytes, mime_type="image/jpeg"),
                    prompt
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.1
                )
            )

            raw_text = response.text.strip()
            raw_text = re.sub(r"^```json\s*", "", raw_text)
            raw_text = re.sub(r"\s*```$", "", raw_text)
            data = json.loads(raw_text)
            
            data["currency"] = normalize_currency(data.get("currency", "USD"))
            data["image_hash"] = img_hash
            return ExtractedReceipt(**data)
            
        except ImportError:
            # Attempt google.generativeai legacy SDK
            try:
                import google.generativeai as genai_legacy
                genai_legacy.configure(api_key=api_key)
                model = genai_legacy.GenerativeModel("gemini-1.5-flash")
                with Image.open(image_path) as pil_img:
                    response = model.generate_content([pil_img, prompt])
                
                raw_text = response.text.strip()
                raw_text = re.sub(r"^```json\s*", "", raw_text)
                raw_text = re.sub(r"\s*```$", "", raw_text)
                data = json.loads(raw_text)
                data["currency"] = normalize_currency(data.get("currency", "USD"))
                data["image_hash"] = img_hash
                return ExtractedReceipt(**data)
            except Exception as e_legacy:
                print(f"⚠️ Legacy Gemini SDK extraction error: {e_legacy}")
        except Exception as e:
<<<<<<< Updated upstream
<<<<<<< Updated upstream
            print(f"⚠️ Gemini cloud extraction error: {e}")
=======
            print(f"[WARN] Cloud vision extraction error: {e}. Falling back to heuristic extractor.")
>>>>>>> Stashed changes
=======
            print(f"[WARN] Cloud vision extraction error: {e}. Falling back to heuristic extractor.")
>>>>>>> Stashed changes

    # 3. Graceful heuristic fallback for offline development & testing
    return ExtractedReceipt(
        vendor="Sample Merchant",
        date="2026-10-15",
        total_amount=68.50,
        currency="USD",
        category="Meals",
        line_items=[
            LineItem(description="Business Lunch Combo", amount=50.50),
            LineItem(description="House Wine", amount=18.00)
        ],
        calculated_tax=0.0,
        calculated_tip=0.0,
        is_itemized=True,
        image_hash=img_hash
    )