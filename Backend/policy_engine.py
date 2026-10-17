from typing import List
from extractor import ExtractedReceipt
import hashlib

POLICY = {
    "city_caps": {"New York": 100.0, "San Francisco": 90.0, "Chicago": 75.0, "Austin": 75.0, "Default": 75.0},
    "non_reimbursable_keywords": ["alcohol", "wine", "beer", "liquor", "spa", "massage", "movie", "casino", "gift"],
    "approval_threshold": 200.0,
    "monthly_limit": 2000.0
}

class ValidationResult:
    def __init__(self):
        self.status: str = "APPROVED"
        self.flags: List[str] = []
        self.reimbursement_amount: float = 0.0

def compute_hash(receipt: ExtractedReceipt) -> str:
    raw = f"{receipt.vendor}|{receipt.date}|{receipt.total_amount}|{receipt.currency}"
    return hashlib.md5(raw.encode()).hexdigest()

def validate_receipt(receipt: ExtractedReceipt, city: str, monthly_spent: float, category: str, client_name: str, existing_hashes: List[str]) -> ValidationResult:
    result = ValidationResult()
    
    # 1. Duplicate check
    if compute_hash(receipt) in existing_hashes:
        result.flags.append("🚨 DUPLICATE: This exact receipt was already processed")
        result.status = "REJECTED"
        return result
    
    # 2. City cap
    cap = POLICY["city_caps"].get(city, POLICY["city_caps"]["Default"])
    if receipt.total_amount > cap:
        result.flags.append(f"⚠️ Over {city} cap: ${receipt.total_amount:.2f} exceeds ${cap:.2f} limit")
        result.status = "FLAGGED"
    
    # 3. Non-reimbursable items
    if receipt.is_itemized and receipt.line_items:
        all_text = " ".join([item.description.lower() for item in receipt.line_items])
        for kw in POLICY["non_reimbursable_keywords"]:
            if kw in all_text:
                result.flags.append(f"🚫 Non-reimbursable item detected: '{kw}'")
                result.status = "REJECTED"
                return result
    
    # 4. Approval threshold
    if receipt.total_amount > POLICY["approval_threshold"]:
        result.flags.append(f"🔒 Requires manager approval (>${POLICY['approval_threshold']})")
        if result.status == "APPROVED":
            result.status = "PENDING_APPROVAL"
    
    # 5. Monthly limit
    if monthly_spent + receipt.total_amount > POLICY["monthly_limit"]:
        result.flags.append(f"📉 Exceeds monthly employee limit of ${POLICY['monthly_limit']}")
        result.status = "REJECTED"
        return result
    
    if result.status in ["APPROVED", "PENDING_APPROVAL"]:
        result.reimbursement_amount = receipt.total_amount
    
    return result