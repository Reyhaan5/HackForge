from typing import List, Dict, Any, Tuple
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from database import Receipt, Policy, Employee
from extractor import ExtractedReceipt, LineItem

class ValidationDecision:
    def __init__(self):
        self.status: str = "APPROVED" # 'APPROVED', 'PARTIAL', 'PENDING_APPROVAL', 'REJECTED'
        self.approved_amount: float = 0.0
        self.flags: List[str] = []
        self.explanation: str = ""
        self.processed_line_items: List[Dict[str, Any]] = []

def get_active_policy(db: Session) -> Dict[str, Any]:
    policy_record = db.query(Policy).filter_by(is_active=True).first()
    if policy_record and policy_record.rules:
        return policy_record.rules
    # Default fallback policy
    return {
        "monthly_limit": 2000.0,
        "approval_threshold": 200.0,
        "city_daily_caps": {"New York": 100.0, "San Francisco": 90.0, "Chicago": 75.0, "Austin": 75.0, "Default": 75.0},
        "category_caps": {"Meals": 100.0, "Office Supplies": 150.0, "Transport": 100.0},
        "client_meal_per_person_limit": 60.0,
        "non_reimbursable_keywords": ["alcohol", "wine", "beer", "liquor", "cocktail", "spa", "massage", "movie", "casino", "gift", "tobacco"]
    }

def validate_receipt(
    receipt: ExtractedReceipt,
    employee_id: str,
    submission_channel: str,
    city: str,
    category: str,
    client_name: str,
    attendee_count: int,
    db: Session
) -> ValidationDecision:
    decision = ValidationDecision()
    policy = get_active_policy(db)
    
    total = float(receipt.total_amount)
    current_date = None
    if receipt.date:
        try:
            current_date = datetime.strptime(receipt.date, "%Y-%m-%d").date()
        except ValueError:
            current_date = date.today()
    else:
        current_date = date.today()

    # -------------------------------------------------------------
    # 1. Multi-Channel Deduplication Check
    # -------------------------------------------------------------
    # Check exact/perceptual image hash across any submission channel
    duplicate = db.query(Receipt).filter(Receipt.image_hash == receipt.image_hash).first()
    if not duplicate and receipt.vendor and receipt.date:
        # Fuzzy match: same employee, vendor, date, and amount
        duplicate = db.query(Receipt).filter(
            Receipt.employee_id == employee_id,
            Receipt.vendor == receipt.vendor,
            Receipt.transaction_date == current_date,
            func.abs(Receipt.original_amount - total) < 0.05
        ).first()

    if duplicate:
        decision.status = "REJECTED"
        channel_info = f"via '{duplicate.submission_channel}' channel" if duplicate.submission_channel else ""
        decision.flags.append(
            f"🚨 DUPLICATE DETECTED: This receipt was already submitted {channel_info} on {duplicate.created_at.strftime('%Y-%m-%d')}"
        )
        decision.approved_amount = 0.0
        decision.explanation = f"Submission rejected as duplicate. Receipt #{duplicate.id} already exists in the system."
        decision.processed_line_items = [item.model_dump() for item in receipt.line_items]
        return decision

    # -------------------------------------------------------------
    # 2. Math Discrepancy Verification
    # -------------------------------------------------------------
    if receipt.is_itemized and receipt.line_items:
        items_sum = sum(item.amount for item in receipt.line_items)
        expected_total = items_sum + receipt.calculated_tax + receipt.calculated_tip
        if abs(expected_total - total) > 0.75:
            decision.flags.append(
                f"⚠️ Math mismatch: Line items sum (${items_sum:.2f}) does not match total (${total:.2f})."
            )

    # -------------------------------------------------------------
    # 3. Partial Reimbursement: Item-Level Disallowance (e.g. Alcohol)
    # -------------------------------------------------------------
    disallowed_keywords = policy.get("non_reimbursable_keywords", [])
    disallowed_amount = 0.0
    disallowed_names = []
    processed_items = []

    for item in receipt.line_items:
        item_dict = item.model_dump()
        desc_lower = item.description.lower()
        is_prohibited = any(kw in desc_lower for kw in disallowed_keywords)
        
        if is_prohibited:
            item_dict["disallowed"] = True
            disallowed_amount += item.amount
            disallowed_names.append(f"{item.description} (${item.amount:.2f})")
        else:
            item_dict["disallowed"] = False
        
        processed_items.append(item_dict)

    decision.processed_line_items = processed_items

    if disallowed_amount > 0:
        decision.flags.append(
            f"🚫 Disallowed items deducted: {', '.join(disallowed_names)}"
        )
        decision.status = "PARTIAL"

    reimbursable = max(0.0, total - disallowed_amount)

    # -------------------------------------------------------------
    # 4. Client Meal & Attendee Count Verification
    # -------------------------------------------------------------
    if category == "Meals" and client_name:
        per_person_limit = policy.get("client_meal_per_person_limit", 60.0)
        eff_attendees = max(1, attendee_count)
        max_client_allowance = per_person_limit * eff_attendees
        if reimbursable > max_client_allowance:
            excess = reimbursable - max_client_allowance
            decision.flags.append(
                f"⚠️ Exceeds client meal allowance (${per_person_limit:.2f}/person x {eff_attendees} attendees = ${max_client_allowance:.2f}). Excess: ${excess:.2f}"
            )
            reimbursable = max_client_allowance
            decision.status = "PARTIAL"

    # -------------------------------------------------------------
    # 5. On-the-Fly Daily City Cap Accumulation
    # -------------------------------------------------------------
    city_caps = policy.get("city_daily_caps", {})
    daily_cap = city_caps.get(city, city_caps.get("Default", 75.0))

    # Query total already approved for this employee on this transaction date
    daily_spent_query = db.query(func.coalesce(func.sum(Receipt.approved_amount), 0.0)).filter(
        Receipt.employee_id == employee_id,
        Receipt.transaction_date == current_date,
        Receipt.status.in_(["APPROVED", "PARTIAL", "PENDING_APPROVAL"])
    ).scalar()
    daily_spent_so_far = float(daily_spent_query or 0.0)

    if category == "Meals":
        remaining_daily_budget = max(0.0, daily_cap - daily_spent_so_far)
        if reimbursable > remaining_daily_budget:
            capped_amount = remaining_daily_budget
            decision.flags.append(
                f"⚠️ Exceeds {city} daily meal cap (${daily_cap:.2f}). Already spent ${daily_spent_so_far:.2f} today. Capping at remaining ${remaining_daily_budget:.2f}."
            )
            reimbursable = capped_amount
            decision.status = "PARTIAL" if reimbursable > 0 else "REJECTED"

    # -------------------------------------------------------------
    # 6. On-the-Fly Monthly Limit Accumulation
    # -------------------------------------------------------------
    monthly_limit = policy.get("monthly_limit", 2000.0)
    month_start = date(current_date.year, current_date.month, 1)
    
    monthly_spent_query = db.query(func.coalesce(func.sum(Receipt.approved_amount), 0.0)).filter(
        Receipt.employee_id == employee_id,
        Receipt.transaction_date >= month_start,
        Receipt.status.in_(["APPROVED", "PARTIAL", "PENDING_APPROVAL"])
    ).scalar()
    monthly_spent_so_far = float(monthly_spent_query or 0.0)

    remaining_monthly = max(0.0, monthly_limit - monthly_spent_so_far)
    if reimbursable > remaining_monthly:
        decision.flags.append(
            f"📉 Monthly employee budget limit ($ {monthly_limit:.2f}) reached. Already spent ${monthly_spent_so_far:.2f} this month."
        )
        reimbursable = remaining_monthly
        decision.status = "PARTIAL" if reimbursable > 0 else "REJECTED"

    # -------------------------------------------------------------
    # 7. High-Value Manager Approval Threshold
    # -------------------------------------------------------------
    approval_threshold = policy.get("approval_threshold", 200.0)
    if total > approval_threshold:
        decision.flags.append(
            f"🔒 High amount (>${approval_threshold:.2f}): Requires manager sign-off."
        )
        if decision.status in ["APPROVED", "PARTIAL"]:
            decision.status = "PENDING_APPROVAL"

    decision.approved_amount = round(reimbursable, 2)

    # -------------------------------------------------------------
    # 8. Human-Readable Explanation Synthesis
    # -------------------------------------------------------------
    parts = []
    if decision.status == "APPROVED":
        parts.append(f"Fully approved for ${decision.approved_amount:.2f}.")
    elif decision.status == "PARTIAL":
        parts.append(f"Partially approved for ${decision.approved_amount:.2f} (Requested: ${total:.2f}).")
    elif decision.status == "PENDING_APPROVAL":
        parts.append(f"Approved for ${decision.approved_amount:.2f}, pending manager sign-off.")
    else:
        parts.append(f"Rejected ($0.00 reimbursement).")

    if disallowed_amount > 0:
        parts.append(f"Deducted ${disallowed_amount:.2f} for non-reimbursable items.")
    if decision.flags:
        parts.append("Policy notes: " + "; ".join(decision.flags))

    decision.explanation = " ".join(parts)
    return decision