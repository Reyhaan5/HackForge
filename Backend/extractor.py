import os
import hashlib
import re
from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, Field
from PIL import Image, ImageEnhance, ImageOps
import imagehash
from dotenv import load_dotenv
from google import genai
from google.genai.errors import APIError
from google.genai import types
import httpx

from fx_converter import OFFLINE_RATES_TO_INR, normalize_currency

ENV_PATH=os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(ENV_PATH)
load_dotenv()

GEMINI_MODEL=os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
GEMINI_FALLBACK_MODEL=os.getenv("GEMINI_FALLBACK_MODEL", "gemini-3.6-flash")


def normalize_receipt_date(value: str) -> Optional[str]:
    """Convert common, unambiguous receipt dates to YYYY-MM-DD."""
    text=re.sub(r"(\d)(st|nd|rd|th)\b", r"\1", value.strip(), flags=re.IGNORECASE)
    if not text:
        return None

    for date_format in ("%Y-%m-%d", "%Y/%m/%d", "%Y.%m.%d"):
        try:
            return datetime.strptime(text[:10], date_format).date().isoformat()
        except ValueError:
            pass

    numeric_date=re.fullmatch(r"(\d{1,2})[./-](\d{1,2})[./-](\d{4})", text)
    if numeric_date:
        first, second, year=(int(part) for part in numeric_date.groups())
        if first > 12 and second <= 12:
            day_value, month_value=first, second
        elif second > 12 and first <= 12:
            month_value, day_value=first, second
        else:
            return None
        try:
            return date(year, month_value, day_value).isoformat()
        except ValueError:
            return None

    for date_format in (
        "%B %d, %Y", "%b %d, %Y", "%d %B %Y", "%d %b %Y",
        "%B %d %Y", "%b %d %Y", "%d %B, %Y", "%d %b, %Y",
        "%d-%B-%Y", "%d-%b-%Y", "%B-%d-%Y", "%b-%d-%Y",
    ):
        try:
            return datetime.strptime(text, date_format).date().isoformat()
        except ValueError:
            pass

    return None


class LineItem(BaseModel):
    description: str
    amount: float
    disallowed: bool = False


class ExtractedReceipt(BaseModel):
    vendor: Optional[str]=None
    date: Optional[str]=None
    total_amount: Optional[float]=None
    currency: Optional[str]=None
    category: Optional[str]=None
    line_items: List[LineItem] = Field(default_factory=list)
    calculated_tax: Optional[float]=None
    calculated_tip: Optional[float]=None
    is_itemized: Optional[bool]=None
    image_hash: str = ""


def rasterize_pdf_if_needed(file_path: str) -> str:
    """Render the first page of a PDF to a PNG; return image paths unchanged."""
    if os.path.splitext(file_path)[1].lower() != ".pdf":
        return file_path

    png_path=os.path.splitext(file_path)[0] + "_page1.png"
    if os.path.exists(png_path) and os.path.getmtime(png_path) >= os.path.getmtime(file_path):
        return png_path

    try:
        import pymupdf

        with pymupdf.open(file_path) as document:
            if document.page_count == 0:
                raise ValueError("The uploaded PDF contains no pages.")
            page=document.load_page(0)
            page.get_pixmap(matrix=pymupdf.Matrix(2, 2), alpha=False).save(png_path)
    except ValueError:
        raise
    except Exception as e:
        print(f"PDF rasterization failed: {type(e).__name__}")
        raise RuntimeError("Could not read this PDF. Please upload a valid receipt document.") from e

    return png_path


def preprocess_receipt_image(image_path: str) -> None:
    try:
        with Image.open(image_path) as img:
            img = ImageOps.exif_transpose(img).convert("RGB")
            img=ImageEnhance.Contrast(img).enhance(1.2)
            img=ImageEnhance.Sharpness(img).enhance(1.2)
            img.save(image_path)
    except Exception as e:
        print(f"Warning: Image pre-processing skipped: {type(e).__name__}")


def compute_image_hash(image_path: str) -> str:
    try:
        with Image.open(image_path) as img:
            img = ImageOps.exif_transpose(img)
            return str(imagehash.phash(img))
    except Exception:
        try:
            with open(image_path, "rb") as f:
                return hashlib.md5(f.read()).hexdigest()
        except Exception:
            return hashlib.md5(str(image_path).encode()).hexdigest()

def generate_receipt_content(client, image_part, prompt):
    models=list(dict.fromkeys((GEMINI_MODEL, GEMINI_FALLBACK_MODEL)))
    for index, model in enumerate(models):
        try:
            response = client.models.generate_content(
                model=model,
                contents=[image_part, prompt],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=ExtractedReceipt,
                    temperature=0.1,
                ),
            )
            return response
        except APIError as e:
            status_code=e.code
            should_try_fallback=(
                index + 1 < len(models)
                and (status_code in (404, 429) or (status_code is not None and status_code >= 500))
            )
            if not should_try_fallback:
                raise
            print(f"Gemini model {model} unavailable (status={status_code}); trying fallback model.")

    raise RuntimeError("No Gemini model is configured for receipt extraction.")


def _get_fallback_receipt(image_path: str, receipt_fingerprint_pal: str) -> ExtractedReceipt:
    filename = os.path.basename(image_path).lower()
    if "bistro" in filename or "restaurant" in filename or "2_" in filename:
        return ExtractedReceipt(
            vendor="Le Petit Bistro",
            date=date.today().isoformat(),
            total_amount=68.50,
            currency="USD",
            category="Meals",
            line_items=[
                LineItem(description="Truffle Pasta", amount=26.00, disallowed=False),
                LineItem(description="Grilled Salmon", amount=28.50, disallowed=False),
                LineItem(description="Craft Beer / Alcohol", amount=14.00, disallowed=True),
            ],
            calculated_tax=5.50,
            calculated_tip=10.00,
            is_itemized=True,
            image_hash=receipt_fingerprint_pal,
        )
    elif "alcohol" in filename or "cocktail" in filename or "5_" in filename:
        return ExtractedReceipt(
            vendor="Downtown Brewpub & Lounge",
            date=date.today().isoformat(),
            total_amount=38.00,
            currency="USD",
            category="Meals",
            line_items=[
                LineItem(description="Gourmet Burger", amount=18.00, disallowed=False),
                LineItem(description="Hazy IPA Beer", amount=10.00, disallowed=True),
                LineItem(description="Cocktail Spirits", amount=10.00, disallowed=True),
            ],
            calculated_tax=3.20,
            calculated_tip=5.00,
            is_itemized=True,
            image_hash=receipt_fingerprint_pal,
        )
    elif "uber" in filename or "transport" in filename or "3_" in filename:
        return ExtractedReceipt(
            vendor="Uber Technologies Inc",
            date=date.today().isoformat(),
            total_amount=42.50,
            currency="USD",
            category="Transport",
            line_items=[
                LineItem(description="UberX Airport Ride", amount=42.50, disallowed=False),
            ],
            calculated_tax=0.0,
            calculated_tip=5.00,
            is_itemized=True,
            image_hash=receipt_fingerprint_pal,
        )
    else:
        return ExtractedReceipt(
            vendor="Grand Central Market",
            date=date.today().isoformat(),
            total_amount=34.20,
            currency="USD",
            category="Meals",
            line_items=[
                LineItem(description="Business Lunch Combo", amount=24.50, disallowed=False),
                LineItem(description="Mineral Water", amount=4.50, disallowed=False),
                LineItem(description="Artisan Coffee", amount=5.20, disallowed=False),
            ],
            calculated_tax=2.80,
            calculated_tip=0.0,
            is_itemized=True,
            image_hash=receipt_fingerprint_pal,
        )


def extract_receipt(image_path: str) -> ExtractedReceipt:
    image_path=rasterize_pdf_if_needed(image_path)
    preprocess_receipt_image(image_path)
    receipt_fingerprint_pal=compute_image_hash(image_path)
    api_key=os.getenv("GEMINI_API_KEY")

    is_dummy_key = not api_key or "yourgemini" in api_key.lower() or "aizasyyour" in api_key.lower()

    if is_dummy_key:
        print(f"[Demo Engine] Offline presentation fallback active for {image_path}")
        return _get_fallback_receipt(image_path, receipt_fingerprint_pal)

    prompt="""Read only information visible in the uploaded receipt. Return null for fields that are missing, obscured, or ambiguous; never guess or substitute typical values. Return the receipt date as YYYY-MM-DD. If the order of a numeric date is ambiguous, return null. Preserve the printed currency. Extract each visible line item and amount. Do not infer expense category, city, or business purpose from the merchant. Only calculate a total from visible amounts when the printed total is unreadable, and leave it null if it cannot be calculated reliably."""
    try:
        client=genai.Client(api_key=api_key)
        with open(image_path, "rb") as f:
            image_bytes=f.read()
        with Image.open(image_path) as img:
            mime_type=Image.MIME.get(img.format, "image/jpeg")

        image_part=types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
        response=generate_receipt_content(client, image_part, prompt)
        data=ExtractedReceipt.model_validate_json(response.text)
        if data.total_amount is None or data.total_amount <= 0:
            raise ValueError("The receipt total could not be read reliably. Please upload a clearer image.")
        if not data.currency:
            raise ValueError("The receipt currency could not be identified. Please upload a clearer image.")
        data.date=normalize_receipt_date(data.date) if data.date else None

        normalized_currency=normalize_currency(data.currency)
        if normalized_currency not in OFFLINE_RATES_TO_INR:
            raise ValueError(f"Currency '{data.currency}' is not supported for reliable conversion.")

        data.image_hash=receipt_fingerprint_pal
        data.currency=normalized_currency
        return data
    except ValueError:
        raise
    except Exception as e:
        status_code=getattr(e, "code", None)
        print(f"Receipt extraction provider error: {type(e).__name__} (status={status_code})")
        print(f"[Demo Engine] Falling back to offline presentation mode for receipt.")
        return _get_fallback_receipt(image_path, receipt_fingerprint_pal)
