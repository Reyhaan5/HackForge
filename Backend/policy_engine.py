from typing import List, Dict, Any, Tuple
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import Receipt, Policy, Employee
from extractor import ExtractedReceipt, LineItem
from fx_converter import convert_to_usd, normalize_currency

class ValidationDecision:
    def __init__(self):
        self.status: str = "APPROVED"  # 'APPROVED', 'PARTIAL', 'PENDING_APPROVAL', 'REJECTED'
        self.requested_amount_original: float = 0.0
        self.currency: str = "USD"
        self.exchange_rate: float = 1.0
        self.base_amount_usd: float = 0.0
        self.approved_amount: float = 0.0  # in base USD
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
        "city_daily_caps": {
            "New York": 100.0,
            "San Francisco": 90.0,
            "Chicago": 75.0,
            "Austin": 75.0,
            "Default": 75.0
        },
        "category_caps": {
            "Meals": 100.0,
            "Office Supplies": 150.0,
            "Transport": 100.0
        },
        "client_meal_per_person_limit": 60.0,
        "non_reimbursable_keywords": [
            "alcohol", "wine", "beer", "liquor", "cocktail", "sake",
            "spa", "massage", "movie", "casino", "gift", "tobacco"
        ]
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
    
    # -------------------------------------------------------------
    # 1. Multi-Currency Normalization & FX Conversion
    # -------------------------------------------------------------
    raw_amount = float(receipt.total_amount)
    decision.requested_amount_original = raw_amount
    base_amount_usd, exchange_rate, normalized_currency = convert_to_usd(raw_amount, receipt.currency)
    
    decision.currency = normalized_currency
    decision.exchange_rate = exchange_rate
    decision.base_amount_usd = base_amount_usd

    if normalized_currency != "USD":
        decision.flags.append(
            f"💱 Currency Converted: {raw_amount:,.2f} {normalized_currency} → ${base_amount_usd:,.2f} USD (FX rate: {exchange_rate:.6f})"
        )

    current_date = None
    if receipt.date:
        try:
            current_date = datetime.strptime(receipt.date, "%Y-%m-%d").date()
        except ValueError:
            current_date = date.today()
    else:
        current_date = date.today()

    # -------------------------------------------------------------
    # 2. Duplicate & Cross-Employee Double Claiming Check
    # -------------------------------------------------------------
    # Find matching hash if exists
    hash_match = db.query(Receipt).filter(Receipt.image_hash == receipt.image_hash).first()

    # Check 2A: Cross-Employee Double Claim (Collusion / Duplicate Submission)
    cross_match = None
    if hash_match and hash_match.employee_id != employee_id:
        cross_match = hash_match
    elif receipt.vendor and receipt.date:
        # Check fuzzy match against other employees (same vendor, same date, identical amount)
        cross_match = db.query(Receipt).filter(
            Receipt.employee_id != employee_id,
            Receipt.vendor == receipt.vendor,
            Receipt.transaction_date == current_date,
            func.abs(Receipt.original_amount - raw_amount) < 0.50
        ).first()

    if cross_match:
        decision.status = "REJECTED"
        decision.flags.append(
            f"🚨 FRAUD ALERT: Cross-employee double claim! An identical expense was already claimed by employee '{cross_match.employee_id}' (Receipt #{cross_match.id} on {cross_match.transaction_date})."
        )
        decision.approved_amount = 0.0
        decision.explanation = f"Submission rejected: identical receipt already claimed by employee {cross_match.employee_id}."
        decision.processed_line_items = [item.model_dump() for item in receipt.line_items]
        return decision

    # Check 2B: Same-Employee Duplicate Submission
    same_match = hash_match if (hash_match and hash_match.employee_id == employee_id) else None
    if not same_match and receipt.vendor and receipt.date:
        same_match = db.query(Receipt).filter(
            Receipt.employee_id == employee_id,
            Receipt.vendor == receipt.vendor,
            Receipt.transaction_date == current_date,
            func.abs(Receipt.original_amount - raw_amount) < 0.05
        ).first()

    if same_match:
        decision.status = "REJECTED"
        decision.flags.append(
            f"🚨 DUPLICATE DETECTED: You already submitted this receipt on {same_match.created_at.strftime('%Y-%m-%d')} (Receipt #{same_match.id})"
        )
        decision.approved_amount = 0.0
        decision.explanation = f"Submission rejected as duplicate of your previous submission #{same_match.id}."
        decision.processed_line_items = [item.model_dump() for item in receipt.line_items]
        return decision

    # -------------------------------------------------------------
    # 3. Unitemized Receipt Breakdown & Math Verification
    # -------------------------------------------------------------
    is_unitemized = not receipt.is_itemized or len(receipt.line_items) == 0
    if is_unitemized:
        # Flag unitemized claims since non-reimbursables cannot be verified
        is_round = (raw_amount >= 50.0 and raw_amount % 10 == 0)
        warning_msg = f"⚠️ UNITEMIZED RECEIPT: Total ({raw_amount:,.2f} {normalized_currency}) lacks itemized breakdown. Non-reimbursable exclusions (alcohol, gifts) cannot be verified."
        if is_round:
            warning_msg += " Flat round amount detected."
        warning_msg += " Requires itemized merchant invoice before reimbursement."
        
        decision.flags.append(warning_msg)
        if decision.status == "APPROVED":
            decision.status = "PENDING_APPROVAL"

    elif receipt.line_items and receipt.calculated_tax is not None and receipt.calculated_tip is not None:
        items_sum = sum(item.amount for item in receipt.line_items)
        expected_total = items_sum + receipt.calculated_tax + receipt.calculated_tip
        if abs(expected_total - raw_amount) > 0.75:
            decision.flags.append(
                f"⚠️ Math mismatch: Line items sum ({items_sum:,.2f}) does not match printed total ({raw_amount:,.2f} {normalized_currency})."
            )

    # -------------------------------------------------------------
    # 4. Partial Reimbursement: Item-Level Disallowance (e.g. Alcohol)
    # -------------------------------------------------------------
    disallowed_keywords = policy.get("non_reimbursable_keywords", [])
    disallowed_amount_orig = 0.0
    disallowed_names = []
    processed_items = []

    for item in receipt.line_items:
        item_dict = item.model_dump()
        desc_lower = item.description.lower()
        is_prohibited = any(kw in desc_lower for kw in disallowed_keywords)
        
        if is_prohibited:
            item_dict["disallowed"] = True
            disallowed_amount_orig += item.amount
            disallowed_names.append(f"{item.description} ({item.amount:,.2f} {normalized_currency})")
        else:
            item_dict["disallowed"] = False
        
        processed_items.append(item_dict)

    decision.processed_line_items = processed_items

    # Convert disallowed deduction into base USD
    disallowed_amount_usd = round(disallowed_amount_orig * exchange_rate, 2)

    if disallowed_amount_orig > 0:
        decision.flags.append(
            f"🚫 Disallowed items deducted: {', '.join(disallowed_names)} (-${disallowed_amount_usd:,.2f} USD)"
        )
        decision.status = "PARTIAL"

    reimbursable_usd = max(0.0, base_amount_usd - disallowed_amount_usd)

    # -------------------------------------------------------------
    # 5. Client Meal & Attendee Count Verification
    # -------------------------------------------------------------
    if category == "Meals" and client_name:
        per_person_limit = policy.get("client_meal_per_person_limit", 60.0)
        eff_attendees = max(1, attendee_count)
        max_client_allowance = per_person_limit * eff_attendees
        if reimbursable_usd > max_client_allowance:
            excess = reimbursable_usd - max_client_allowance
            decision.flags.append(
                f"⚠️ Exceeds client meal allowance (${per_person_limit:.2f}/person x {eff_attendees} attendees = ${max_client_allowance:.2f} USD). Excess: ${excess:.2f}"
            )
            reimbursable_usd = max_client_allowance
            decision.status = "PARTIAL"

    # -------------------------------------------------------------
    # 5B. Category Cap Enforcement
    # -------------------------------------------------------------
    category_caps = policy.get("category_caps", {})
    cat_cap = category_caps.get(category)
    if cat_cap is not None:
        cat_cap = float(cat_cap)
        if reimbursable_usd > cat_cap:
            excess = reimbursable_usd - cat_cap
            decision.flags.append(
                f"⚠️ Exceeds {category} cap (${cat_cap:.2f} USD). Excess: ${excess:.2f} USD."
            )
            reimbursable_usd = cat_cap
            decision.status = "PARTIAL" if reimbursable_usd > 0 else "REJECTED"

    # -------------------------------------------------------------
    # 6. On-the-Fly Daily City Cap Accumulation (in USD)
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
        if reimbursable_usd > remaining_daily_budget:
            capped_amount = remaining_daily_budget
            decision.flags.append(
                f"⚠️ Exceeds {city} daily meal cap (${daily_cap:.2f} USD). Already approved ${daily_spent_so_far:.2f} today. Capped at remaining ${remaining_daily_budget:.2f} USD."
            )
            reimbursable_usd = capped_amount
            decision.status = "PARTIAL" if reimbursable_usd > 0 else "REJECTED"

    # -------------------------------------------------------------
    # 7. On-the-Fly Monthly Limit Accumulation (in USD)
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
    if reimbursable_usd > remaining_monthly:
        decision.flags.append(
            f"📉 Monthly employee budget limit (${monthly_limit:.2f} USD) reached. Already spent ${monthly_spent_so_far:.2f} this month."
        )
        reimbursable_usd = remaining_monthly
        decision.status = "PARTIAL" if reimbursable_usd > 0 else "REJECTED"

    # -------------------------------------------------------------
    # 8. High-Value Manager Approval Threshold (in USD)
    # -------------------------------------------------------------
    approval_threshold = policy.get("approval_threshold", 200.0)
    if base_amount_usd > approval_threshold:
        decision.flags.append(
            f"🔒 High amount (>${approval_threshold:.2f} USD): Requires manager sign-off."
        )
        if decision.status in ["APPROVED", "PARTIAL"]:
            decision.status = "PENDING_APPROVAL"

    # -------------------------------------------------------------
    # 8B. Structuring / Threshold Evasion Detection
    # -------------------------------------------------------------
    structuring_lower = policy.get("structuring_lower_bound", approval_threshold * 0.75) # e.g. $150.00
    if structuring_lower <= base_amount_usd <= approval_threshold:
        from datetime import timedelta
        window_start = current_date - timedelta(days=2)
        recent_structured = db.query(Receipt).filter(
            Receipt.employee_id == employee_id,
            Receipt.transaction_date >= window_start,
            Receipt.transaction_date <= current_date,
            Receipt.base_amount_usd >= structuring_lower,
            Receipt.base_amount_usd <= approval_threshold,
            Receipt.status.in_(["APPROVED", "PARTIAL", "PENDING_APPROVAL"])
        ).all()
        
        if recent_structured:
            receipt_refs = ", ".join([f"#{r.id} (${float(r.base_amount_usd):.2f} on {r.transaction_date})" for r in recent_structured])
            decision.flags.append(
                f"🚨 STRUCTURING ALERT: Multiple expenses near manager threshold (${approval_threshold:.2f} USD) within 48h ({receipt_refs}). Escalated for manager audit."
            )
            decision.status = "PENDING_APPROVAL"

    decision.approved_amount = round(reimbursable_usd, 2)

    # -------------------------------------------------------------
    # 9. Human-Readable Explanation Synthesis
    # -------------------------------------------------------------
    parts = []
    curr_prefix = f"{raw_amount:,.2f} {normalized_currency}" if normalized_currency != "USD" else f"${raw_amount:,.2f}"
    
    if decision.status == "APPROVED":
        parts.append(f"Fully approved for ${decision.approved_amount:,.2f} USD.")
    elif decision.status == "PARTIAL":
        parts.append(f"Partially approved for ${decision.approved_amount:,.2f} USD (Submitted: {curr_prefix}).")
    elif decision.status == "PENDING_APPROVAL":
        parts.append(f"Approved for ${decision.approved_amount:,.2f} USD, pending manager approval.")
    else:
        parts.append("Submission rejected ($0.00 reimbursement).")

    if disallowed_amount_usd > 0:
        parts.append(f"Deducted ${disallowed_amount_usd:,.2f} USD for non-reimbursable items.")
    if decision.flags:
        parts.append("Policy notes: " + "; ".join(decision.flags))

    decision.explanation = " ".join(parts)
    return decision
