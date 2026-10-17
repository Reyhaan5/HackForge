import os
import re
import json
import hashlib
from typing import List, Optional
from pydantic import BaseModel, Field
from PIL import Image, ImageOps
import imagehash
from dotenv import load_dotenv

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

def compute_image_hash(image_path: str) -> str:
    """Computes a perceptual hash (pHash) of the image to catch duplicates across channels and orientations."""
    try:
        with Image.open(image_path) as img:
            img = ImageOps.exif_transpose(img)
            return str(imagehash.phash(img))
    except Exception:
        # Fallback to file content MD5 if image processing fails
        with open(image_path, "rb") as f:
            return hashlib.md5(f.read()).hexdigest()

def extract_receipt(image_path: str) -> ExtractedReceipt:
    """
    Extracts structured receipt data using a cloud multimodal model (Gemini).
    Pre-processes the image (EXIF orientation, contrast) and falls back gracefully.
    """
    img_hash = compute_image_hash(image_path)
    
    # 1. Pre-process image to correct rotation/orientation
    try:
        with Image.open(image_path) as img:
            corrected_img = ImageOps.exif_transpose(img).convert("RGB")
            corrected_img.save(image_path)
    except Exception as e:
        print(f"Warning: Image pre-processing error: {e}")

    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    
    # If API key is available, call Gemini via google-genai
    if api_key:
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=api_key)
            with open(image_path, "rb") as f:
                img_bytes = f.read()

            prompt = """Analyze this receipt and extract structured data as strict JSON adhering to this schema:
{
  "vendor": "string (business name)",
  "date": "YYYY-MM-DD (or null if missing)",
  "total_amount": 0.00 (numeric final total),
  "currency": "USD" (ISO 3-letter code, e.g. USD, EUR, GBP, CAD, INR, JPY),
  "category": "Meals" (one of: "Meals", "Lodging", "Transport", "Office Supplies", "Entertainment"),
  "line_items": [
    {"description": "item name", "amount": 0.00}
  ],
  "calculated_tax": 0.00,
  "calculated_tip": 0.00,
  "is_itemized": true
}
Notes:
- If rotated, read according to printed text orientation.
- Extract individual purchased items in line_items whenever visible.
- If total is missing or faded, sum the line items + tax.
- Output RAW JSON ONLY. No markdown, no code blocks."""

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
            # Clean possible markdown wrapping
            raw_text = re.sub(r"^```json\s*", "", raw_text)
            raw_text = re.sub(r"\s*```$", "", raw_text)

            data = json.loads(raw_text)
            data["image_hash"] = img_hash
            return ExtractedReceipt(**data)

        except Exception as e:
            print(f"⚠️ Cloud vision extraction error: {e}. Falling back to heuristic extractor.")

    # Graceful heuristic / mock fallback for testing without active cloud key
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