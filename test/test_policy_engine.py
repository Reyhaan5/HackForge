import os
import sys
from datetime import date

# Add Backend to python path
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "Backend"))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from database import init_db, SessionLocal, Receipt
from extractor import ExtractedReceipt, LineItem
from policy_engine import validate_receipt

def test_policy_rules():
    print("Testing Policy Engine Layered Rules...")
    init_db()
    db = SessionLocal()
    
    # Clear test table
    db.query(Receipt).delete()
    db.commit()

    # ------------------------------------------------------------------
    # 1. Partial Reimbursement: Alcohol Deduction
    # ------------------------------------------------------------------
    print("\n[Case 1] Partial Reimbursement with Alcohol Deduction")
    lunch_with_wine = ExtractedReceipt(
        vendor="Osteria Italian",
        date="2026-10-15",
        total_amount=5500.00,
        currency="INR",
        category="Meals",
        line_items=[
            LineItem(description="Truffle Pasta", amount=3500.00),
            LineItem(description="Chianti Red Wine", amount=2000.00) # Prohibited
        ],
        is_itemized=True,
        image_hash="hash_case_1"
    )

    d1 = validate_receipt(
        receipt=lunch_with_wine,
        employee_id="EMP-101",
        submission_channel="web",
        city="Chicago",
        category="Meals",
        client_name="",
        attendee_count=1,
        db=db
    )
    print(f"  Status: {d1.status}")
    print(f"  Approved: ₹{d1.approved_amount:.2f} (Requested: ₹5500.00)")
    print(f"  Flags: {d1.flags}")
    assert d1.status == "PARTIAL"
    assert d1.approved_amount == 3500.00
    assert any("Disallowed items deducted" in f for f in d1.flags)
    print("  ✓ Alcohol (₹2000) cleanly deducted; legitimate food (₹3500) approved.")

    # Save to database to simulate progressive accumulation
    db.add(Receipt(
        employee_id="EMP-101",
        image_path="/tmp/fake_1.jpg",
        image_hash=lunch_with_wine.image_hash,
        submission_channel="web",
        vendor=lunch_with_wine.vendor,
        transaction_date=date(2026, 10, 15),
        category="Meals",
        city="Chicago",
        currency="INR",
        original_amount=5500.00,
        exchange_rate=1.0,
        base_amount_inr=5500.00,
        line_items=d1.processed_line_items,
        status=d1.status,
        approved_amount=d1.approved_amount,
        flags=d1.flags,
        explanation=d1.explanation
    ))
    db.commit()

    # ------------------------------------------------------------------
    # 2. Daily City Cap Accumulation (Chicago cap is ₹6262.50/day)
    # ------------------------------------------------------------------
    print("\n[Case 2] Daily City Cap Accumulation (Chicago Cap: ₹6262.50/day)")
    dinner_same_day = ExtractedReceipt(
        vendor="Chicago Steakhouse",
        date="2026-10-15",
        total_amount=5000.00,
        currency="INR",
        category="Meals",
        line_items=[LineItem(description="Sirloin Steak", amount=5000.00)],
        is_itemized=True,
        image_hash="hash_case_2"
    )

    d2 = validate_receipt(
        receipt=dinner_same_day,
        employee_id="EMP-101",
        submission_channel="web",
        city="Chicago",
        category="Meals",
        client_name="",
        attendee_count=1,
        db=db
    )
    print(f"  Status: {d2.status}")
    print(f"  Approved: ₹{d2.approved_amount:.2f} (Requested: ₹5000.00)")
    print(f"  Flags: {d2.flags}")
    assert d2.approved_amount == 2762.50, f"Expected capped at ₹2762.50, got {d2.approved_amount}"
    assert any("daily meal cap" in f for f in d2.flags)
    print("  ✓ Dinner capped at remaining daily budget (₹2762.50) without rejecting!")

    # ------------------------------------------------------------------
    # 3. Client Meal Attendee Allowance (₹5010/person)
    # ------------------------------------------------------------------
    print("\n[Case 3] Client Meal Allowance (₹5010/person limit)")
    client_meal = ExtractedReceipt(
        vendor="Rooftop Grill",
        date="2026-10-16",
        total_amount=12000.00,
        currency="INR",
        category="Meals",
        line_items=[LineItem(description="Client Dinner Tasting", amount=12000.00)],
        is_itemized=True,
        image_hash="hash_case_3"
    )

    d3 = validate_receipt(
        receipt=client_meal,
        employee_id="EMP-102",
        submission_channel="mobile",
        city="New York",
        category="Meals",
        client_name="Apex Partners",
        attendee_count=2,
        db=db
    )
    print(f"  Status: {d3.status}")
    print(f"  Approved: ₹{d3.approved_amount:.2f}")
    print(f"  Flags: {d3.flags}")
    assert d3.approved_amount == 8350.00, f"Expected 8350.00, got {d3.approved_amount}"
    assert any("client meal allowance" in f for f in d3.flags)
    assert any("daily meal cap" in f for f in d3.flags)
    print("  ✓ Layered rule interaction verified: capped to ₹10020 by attendee rule, then to ₹8350 by NYC daily cap.")

    # ------------------------------------------------------------------
    # 4. High-Value Manager Approval Threshold (>₹16700.00)
    # ------------------------------------------------------------------
    print("\n[Case 4] High-Value Expense Approval Threshold (>₹16700.00)")
    hotel_stay = ExtractedReceipt(
        vendor="Grand Hyatt",
        date="2026-10-17",
        total_amount=25000.00,
        currency="INR",
        category="Lodging",
        line_items=[LineItem(description="Hotel Room 2 nights", amount=25000.00)],
        is_itemized=True,
        image_hash="hash_case_4"
    )

    d4 = validate_receipt(
        receipt=hotel_stay,
        employee_id="EMP-103",
        submission_channel="web",
        city="Austin",
        category="Lodging",
        client_name="",
        attendee_count=1,
        db=db
    )
    print(f"  Status: {d4.status}")
    print(f"  Flags: {d4.flags}")
    assert d4.status == "PENDING_APPROVAL"
    assert any("Requires manager sign-off" in f for f in d4.flags)

    # ------------------------------------------------------------------
    # 5. Unitemized Receipt Breakdown Heuristic
    # ------------------------------------------------------------------
    print("\n[Case 5] Unitemized Receipt Breakdown Warning")
    unitemized_lunch = ExtractedReceipt(
        vendor="Corner Diner",
        date="2026-10-18",
        total_amount=5000.00,
        currency="INR",
        category="Meals",
        line_items=[],
        is_itemized=False,
        image_hash="hash_case_5_unitemized"
    )

    d5 = validate_receipt(
        receipt=unitemized_lunch,
        employee_id="EMP-101",
        submission_channel="web",
        city="Default",
        category="Meals",
        client_name="",
        attendee_count=1,
        db=db
    )
    print(f"  Status: {d5.status}")
    print(f"  Flags: {d5.flags}")
    assert any("UNITEMIZED RECEIPT" in f for f in d5.flags)
    assert d5.status == "PENDING_APPROVAL"
    print("  ✓ Unitemized receipt flagged and escalated to PENDING_APPROVAL for verification.")

    # ------------------------------------------------------------------
    # 6. Category Cap Enforcement (e.g. ₹1000 cap for Office Supplies)
    # ------------------------------------------------------------------
    print("\n[Case 6] Category Cap Enforcement (Office Supplies configured with ₹1000.00 cap)")
    from database import Policy
    active_policy = db.query(Policy).filter_by(is_active=True).first()
    original_rules = dict(active_policy.rules)
    modified_rules = dict(original_rules)
    modified_rules["category_caps"] = dict(original_rules.get("category_caps", {}))
    modified_rules["category_caps"]["Office Supplies"] = 1000.0
    active_policy.rules = modified_rules
    db.commit()

    office_supplies_receipt = ExtractedReceipt(
        vendor="Staples",
        date="2026-10-18",
        total_amount=8000.00,
        currency="INR",
        category="Office Supplies",
        line_items=[LineItem(description="Printer Paper & Toner", amount=8000.00)],
        is_itemized=True,
        image_hash="hash_case_6_office_supplies"
    )

    d6 = validate_receipt(
        receipt=office_supplies_receipt,
        employee_id="EMP-102",
        submission_channel="web",
        city="Default",
        category="Office Supplies",
        client_name="",
        attendee_count=1,
        db=db
    )
    print(f"  Status: {d6.status}")
    print(f"  Approved Amount: ₹{d6.approved_amount:.2f} (Requested: ₹8000.00)")
    print(f"  Flags: {d6.flags}")
    assert d6.approved_amount == 1000.00, f"Expected 1000.00, got {d6.approved_amount}"
    assert d6.status == "PARTIAL"
    assert any("Exceeds Office Supplies cap" in f and "1000.00" in f for f in d6.flags)
    print("  ✓ With ₹1000 cap configured for Office Supplies, an ₹8000 claim was capped at ₹1000.00!")

    # Restore original rules
    active_policy.rules = original_rules
    db.commit()

    # ------------------------------------------------------------------
    # 7. Structuring / Threshold Evasion Detection near ₹16700 within 48h
    # ------------------------------------------------------------------
    print("\n[Case 7] Structuring / Threshold Evasion Detection near ₹16700 within 48h")
    # Save a receipt for EMP-103 on 2026-10-18 for ₹15000
    r_struct1 = Receipt(
        employee_id="EMP-103",
        image_path="/tmp/fake1.jpg",
        image_hash="fake_hash_struct_1",
        submission_channel="web",
        vendor="Tech Gear",
        transaction_date=date(2026, 10, 18),
        category="Office Supplies",
        currency="INR",
        original_amount=15000.00,
        exchange_rate=1.0,
        base_amount_inr=15000.00,
        status="APPROVED",
        approved_amount=15000.00
    )
    db.add(r_struct1)
    db.commit()

    # Next day (2026-10-19), EMP-103 submits another ₹15500 receipt just below the ₹16700 threshold
    struct2_receipt = ExtractedReceipt(
        vendor="Desk Depot",
        date="2026-10-19",
        total_amount=15500.00,
        currency="INR",
        category="Office Supplies",
        line_items=[LineItem(description="Ergonomic Keyboard", amount=15500.00)],
        is_itemized=True,
        image_hash="hash_case_7_structuring"
    )

    d7 = validate_receipt(
        receipt=struct2_receipt,
        employee_id="EMP-103",
        submission_channel="web",
        city="Default",
        category="Office Supplies",
        client_name="",
        attendee_count=1,
        db=db
    )
    print(f"  Status: {d7.status}")
    print(f"  Flags: {d7.flags}")
    assert d7.status == "PENDING_APPROVAL"
    assert any("STRUCTURING ALERT" in f for f in d7.flags)
    print("  ✓ Structuring pattern detected: repeated expenses near threshold flagged for audit!")

    print("\n✓ All policy engine rule tests passed!\n")

def run_all():
    print("=" * 60)
    print("RUNNING LAYERED POLICY ENGINE TESTS")
    print("=" * 60)
    test_policy_rules()
    print("🎉 ALL POLICY ENGINE TESTS COMPLETED SUCCESSFULLY!\n")

if __name__ == "__main__":
    run_all()
