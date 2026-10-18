from typing import List, Dict, Any, Tuple
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import Receipt, Policy, Employee
from extractor import ExtractedReceipt, LineItem
from fx_converter import convert_to_inr, normalize_currency

class ValidationDecision:
    def __init__(self):
        self.status: str = "APPROVED"  # 'APPROVED', 'PARTIAL', 'PENDING_APPROVAL', 'REJECTED'
        self.requested_amount_original: float = 0.0
        self.currency: str="INR"
        self.exchange_rate: float = 1.0
        self.base_amount_inr: float=0.0
        self.approved_amount: float=0.0
        self.flags: List[str] = []
        self.explanation: str = ""
        self.processed_line_items: List[Dict[str, Any]] = []

def get_active_policy(db: Session) -> Dict[str, Any]:
    policy_record = db.query(Policy).filter_by(is_active=True).first()
    if policy_record and policy_record.rules:
        return policy_record.rules
    # Default fallback policy
    return {
        "monthly_limit": 167000.0,
        "approval_threshold": 16700.0,
        "city_daily_caps": {
            "Mumbai": 4000.0,
            "Bengaluru": 3500.0,
            "Delhi NCR": 3500.0,
            "Hyderabad": 3000.0,
            "Pune": 3000.0,
            "Chennai": 3000.0,
            "Kolkata": 2500.0,
            "Ahmedabad": 2500.0,
            "Jaipur": 2500.0,
            "Default": 2500.0
        },
        "category_caps": {
            "Meals": 8350.0,
            "Office Supplies": 12525.0,
            "Transport": 8350.0
        },
        "client_meal_per_person_limit": 5010.0,
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
    
    raw_amount = float(receipt.total_amount)
    decision.requested_amount_original = raw_amount
    base_amount_inr, exchange_rate, normalized_currency=convert_to_inr(raw_amount, receipt.currency)
    
    decision.currency = normalized_currency
    decision.exchange_rate = exchange_rate
    decision.base_amount_inr=base_amount_inr

    if normalized_currency != "INR":
        decision.flags.append(
            f"Currency Converted: {raw_amount:,.2f} {normalized_currency} → ₹{base_amount_inr:,.2f} INR (FX rate: {exchange_rate:.6f})"
        )

    current_date = None
    if receipt.date:
        try:
            current_date = datetime.strptime(receipt.date, "%Y-%m-%d").date()
        except ValueError:
            pass
    if current_date is None:
        decision.flags.append("Receipt date could not be read; date-based checks need manual review.")

    hash_match=db.query(Receipt).filter(Receipt.image_hash == receipt.image_hash).first()
    cross_match=None
    if hash_match and hash_match.employee_id != employee_id:
        cross_match=hash_match
    elif receipt.vendor and current_date:

        cross_match=db.query(Receipt).filter(
            Receipt.employee_id != employee_id,
            Receipt.vendor == receipt.vendor,
            Receipt.transaction_date == current_date,
            func.abs(Receipt.original_amount - raw_amount) < 0.50
        ).first()

    if cross_match:
        decision.status="REJECTED"
        decision.flags.append(
            f"FRAUD ALERT: Cross-employee double claim! An identical expense was already claimed by employee '{cross_match.employee_id}' (Receipt #{cross_match.id} on {cross_match.transaction_date})."
        )
        decision.approved_amount=0.0
        decision.explanation=f"Submission rejected: identical receipt already claimed by employee {cross_match.employee_id}."
        decision.processed_line_items=[item.model_dump() for item in receipt.line_items]
        return decision


    same_match=hash_match if (hash_match and hash_match.employee_id == employee_id) else None
    if not same_match and receipt.vendor and current_date:
        same_match=db.query(Receipt).filter(
            Receipt.employee_id == employee_id,
            Receipt.vendor == receipt.vendor,
            Receipt.transaction_date == current_date,
            func.abs(Receipt.original_amount - raw_amount) < 0.05
        ).first()

    if same_match:
        decision.status = "REJECTED"
        decision.flags.append(
            f"DUPLICATE DETECTED: You already submitted this receipt on {same_match.created_at.strftime('%Y-%m-%d')} (Receipt #{same_match.id})"
        )
        decision.approved_amount = 0.0
        decision.explanation=f"Submission rejected as duplicate of your previous submission #{same_match.id}."
        decision.processed_line_items = [item.model_dump() for item in receipt.line_items]
        return decision
    
    receipt_is_a_bit_messy=not receipt.is_itemized or len(receipt.line_items) == 0
    if receipt_is_a_bit_messy:

        is_round=(raw_amount >= 50.0 and raw_amount % 10 == 0)
        receipt_note_pal=f"UNITEMIZED RECEIPT: Total ({raw_amount:,.2f} {normalized_currency}) lacks itemized breakdown. Non-reimbursable exclusions (alcohol, gifts) cannot be verified."
        if is_round:
            receipt_note_pal += " Flat round amount detected."
        receipt_note_pal += " Requires itemized merchant invoice before reimbursement."
        
        decision.flags.append(receipt_note_pal)
        if decision.status == "APPROVED":
            decision.status="PENDING_APPROVAL"

    elif receipt.line_items and receipt.calculated_tax is not None and receipt.calculated_tip is not None:
        items_sum = sum(item.amount for item in receipt.line_items)
        expected_total = items_sum + receipt.calculated_tax + receipt.calculated_tip
        if abs(expected_total - raw_amount) > 0.75:
            decision.flags.append(
                f"Math mismatch: Line items sum ({items_sum:,.2f}) does not match printed total ({raw_amount:,.2f} {normalized_currency})."
            )

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


    disallowed_amount_inr=round(disallowed_amount_orig * exchange_rate, 2)

    if disallowed_amount_orig > 0:
        decision.flags.append(
            f"Disallowed items deducted: {', '.join(disallowed_names)} (-₹{disallowed_amount_inr:,.2f} INR)"
        )
        decision.status = "PARTIAL"

    reimbursable_inr=max(0.0, base_amount_inr - disallowed_amount_inr)
    if category == "Meals" and client_name:
        per_person_limit=policy.get("client_meal_per_person_limit", 5010.0)
        eff_attendees = max(1, attendee_count)
        max_client_allowance = per_person_limit * eff_attendees
        if reimbursable_inr > max_client_allowance:
            excess=reimbursable_inr - max_client_allowance
            decision.flags.append(
                f"Exceeds client meal allowance (₹{per_person_limit:.2f}/person x {eff_attendees} attendees = ₹{max_client_allowance:.2f} INR). Excess: ₹{excess:.2f}"
            )
            reimbursable_inr=max_client_allowance
            decision.status = "PARTIAL"
            
    category_caps=policy.get("category_caps", {})
    cat_cap=category_caps.get(category)
    if cat_cap is not None:
        cat_cap=float(cat_cap)
        if reimbursable_inr > cat_cap:
            excess=reimbursable_inr - cat_cap
            decision.flags.append(
                f"Exceeds {category} cap (₹{cat_cap:.2f} INR). Excess: ₹{excess:.2f} INR."
            )
            reimbursable_inr=cat_cap
            decision.status="PARTIAL" if reimbursable_inr > 0 else "REJECTED"

    city_caps = policy.get("city_daily_caps", {})
    daily_cap=city_caps.get(city, city_caps.get("Default", 6263.0))

    daily_spent_so_far=0.0
    if current_date:
        daily_spent_query=db.query(func.coalesce(func.sum(Receipt.approved_amount), 0.0)).filter(
            Receipt.employee_id == employee_id,
            Receipt.transaction_date == current_date,
            Receipt.status.in_(["APPROVED", "PARTIAL", "PENDING_APPROVAL"])
        ).scalar()
        daily_spent_so_far=float(daily_spent_query or 0.0)

    if category == "Meals" and current_date:
        remaining_daily_budget = max(0.0, daily_cap - daily_spent_so_far)
        if reimbursable_inr > remaining_daily_budget:
            capped_amount = remaining_daily_budget
            decision.flags.append(
                f"Exceeds {city} daily meal cap (₹{daily_cap:.2f} INR). Already approved ₹{daily_spent_so_far:.2f} today. Capped at remaining ₹{remaining_daily_budget:.2f} INR."
            )
            reimbursable_inr=capped_amount
            decision.status="PARTIAL" if reimbursable_inr > 0 else "REJECTED"

    monthly_limit=policy.get("monthly_limit", 167000.0)
    monthly_spent_so_far=0.0
    if current_date:
        month_start=date(current_date.year, current_date.month, 1)
        monthly_spent_query=db.query(func.coalesce(func.sum(Receipt.approved_amount), 0.0)).filter(
            Receipt.employee_id == employee_id,
            Receipt.transaction_date >= month_start,
            Receipt.status.in_(["APPROVED", "PARTIAL", "PENDING_APPROVAL"])
        ).scalar()
        monthly_spent_so_far=float(monthly_spent_query or 0.0)

    remaining_monthly = max(0.0, monthly_limit - monthly_spent_so_far)
    if current_date and reimbursable_inr > remaining_monthly:
        decision.flags.append(
            f"📉 Monthly employee budget limit (₹{monthly_limit:.2f} INR) reached. Already spent ₹{monthly_spent_so_far:.2f} this month."
        )
        reimbursable_inr=remaining_monthly
        decision.status="PARTIAL" if reimbursable_inr > 0 else "REJECTED"

    approval_threshold=policy.get("approval_threshold", 16700.0)
    if base_amount_inr > approval_threshold:
        decision.flags.append(
            f"High amount (>₹{approval_threshold:.2f} INR): Requires manager sign-off."
        )
        if decision.status in ["APPROVED", "PARTIAL"]:
            decision.status = "PENDING_APPROVAL"


    structuring_lower=policy.get("structuring_lower_bound", approval_threshold * 0.75)
    if current_date and structuring_lower <= base_amount_inr <= approval_threshold:
        from datetime import timedelta
        window_start=current_date - timedelta(days=2)
        recent_structured=db.query(Receipt).filter(
            Receipt.employee_id == employee_id,
            Receipt.transaction_date >= window_start,
            Receipt.transaction_date <= current_date,
            Receipt.base_amount_inr >= structuring_lower,
            Receipt.base_amount_inr <= approval_threshold,
            Receipt.status.in_(["APPROVED", "PARTIAL", "PENDING_APPROVAL"])
        ).all()
        
        if recent_structured:
            receipt_refs=", ".join([f"#{r.id} (₹{float(r.base_amount_inr):.2f} on {r.transaction_date})" for r in recent_structured])
            decision.flags.append(
                f"STRUCTURING ALERT: Multiple expenses near manager threshold (₹{approval_threshold:.2f} INR) within 48h ({receipt_refs}). Escalated for manager audit."
            )
            decision.status="PENDING_APPROVAL"

    if current_date is None and decision.status in ["APPROVED", "PARTIAL"]:
        decision.status="PENDING_APPROVAL"

    decision.approved_amount=round(reimbursable_inr, 2)
    parts = []
    curr_prefix=f"{raw_amount:,.2f} {normalized_currency}" if normalized_currency != "INR" else f"₹{raw_amount:,.2f}"
    
    if decision.status == "APPROVED":
        parts.append(f"Fully approved for ₹{decision.approved_amount:,.2f} INR.")
    elif decision.status == "PARTIAL":
        parts.append(f"Partially approved for ₹{decision.approved_amount:,.2f} INR (Submitted: {curr_prefix}).")
    elif decision.status == "PENDING_APPROVAL":
        parts.append(f"Approved for ₹{decision.approved_amount:,.2f} INR, pending manager approval.")
    else:
        parts.append("Submission rejected (0.00 INR reimbursement).")

    if disallowed_amount_inr > 0:
        parts.append(f"Deducted ₹{disallowed_amount_inr:,.2f} INR for non-reimbursable items.")
    if decision.flags:
        parts.append("Policy notes: " + "; ".join(decision.flags))

    decision.explanation = " ".join(parts)
    return decision
