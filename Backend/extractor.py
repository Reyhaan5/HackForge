import torch
import json
import re
from PIL import Image
from pydantic import BaseModel, Field
from typing import List
from transformers import Qwen2VLForConditionalGeneration, AutoProcessor
from qwen_vl_utils import process_vision_info

class LineItem(BaseModel):
    description: str
    amount: float

class ExtractedReceipt(BaseModel):
    vendor: str
    date: str
    total_amount: float
    currency: str
    line_items: List[LineItem]
    is_itemized: bool

MODEL_NAME = "Qwen/Qwen2-VL-2B-Instruct"
_model = None
_processor = None

def load_model():
    global _model, _processor
    if _model is None:
        print("🧠 Loading Qwen2-VL-2B on RTX 5050 (this takes ~30s on first run)...")
        _processor = AutoProcessor.from_pretrained(MODEL_NAME, trust_remote_code=True)
        _model = Qwen2VLForConditionalGeneration.from_pretrained(
            MODEL_NAME,
            torch_dtype=torch.bfloat16, # Optimized for RTX 5050
            device_map="auto",
            trust_remote_code=True
        )
        print("✅ Model loaded successfully!")
    return _model, _processor

def extract_receipt(image_path: str) -> ExtractedReceipt:
    model, processor = load_model()
    image = Image.open(image_path).convert("RGB")
    
    messages = [{
        "role": "user",
        "content": [
            {"type": "image", "image": image},
            {"type": "text", "text": """Extract receipt data as strict JSON only. No markdown, no explanations. Schema:
{"vendor": "string", "date": "YYYY-MM-DD", "total_amount": 0.00, "currency": "USD", "line_items": [{"description": "item", "amount": 0.00}], "is_itemized": true}
If a field is unreadable, use null. Convert currencies to ISO codes (USD, EUR, etc.).""" }
        ]
    }]
    
    text = processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    image_inputs, _ = process_vision_info(messages)
    inputs = processor(text=[text], images=image_inputs, padding=True, return_tensors="pt").to(model.device)
    
    output = model.generate(**inputs, max_new_tokens=512, temperature=0.1, do_sample=False)
    output_text = processor.batch_decode([out[len(inp):] for inp, out in zip(inputs.input_ids, output)], skip_special_tokens=True)[0]
    
    # Extract JSON from response
    json_match = re.search(r'\{.*\}', output_text, re.DOTALL)
    data = json.loads(json_match.group(0)) if json_match else {"vendor": "UNKNOWN", "date": None, "total_amount": 0.0, "currency": "USD", "line_items": [], "is_itemized": False}
    
    # Normalize missing fields
    data.setdefault("line_items", [])
    data.setdefault("currency", "USD")
    data.setdefault("total_amount", 0.0)
    data.setdefault("is_itemized", False)
    
    return ExtractedReceipt(**data)