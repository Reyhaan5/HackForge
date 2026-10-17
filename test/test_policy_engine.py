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
        total_amount=55.00,
        currency="USD",
        category="Meals",
        line_items=[
            LineItem(description="Truffle Pasta", amount=35.00),
            LineItem(description="Chianti Red Wine", amount=20.00) # Prohibited
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
    print(f"  Approved: ${d1.approved_amount:.2f} (Requested: $55.00)")
    print(f"  Flags: {d1.flags}")
    assert d1.status == "PARTIAL"
    assert d1.approved_amount == 35.00
    assert any("Disallowed items deducted" in f for f in d1.flags)
    print("  ✓ Alcohol ($20) cleanly deducted; legitimate food ($35) approved.")

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
        currency="USD",
        original_amount=55.00,
        exchange_rate=1.0,
        base_amount_usd=55.00,
        line_items=d1.processed_line_items,
        status=d1.status,
        approved_amount=d1.approved_amount,
        flags=d1.flags,
        explanation=d1.explanation
    ))
    db.commit()

    # ------------------------------------------------------------------
    # 2. Daily City Cap Accumulation (Chicago cap is $75.00/day)
    # ------------------------------------------------------------------
    print("\n[Case 2] Daily City Cap Accumulation (Chicago Cap: $75/day)")
    # Employee EMP-101 already spent $35 on 2026-10-15.
    # Now submits dinner on the same day for $50.00.
    # Total would be $35 + $50 = $85 (exceeds $75 cap by $10).
    # Should cap current reimbursement to remaining $40.00!
    dinner_same_day = ExtractedReceipt(
        vendor="Chicago Steakhouse",
        date="2026-10-15",
        total_amount=50.00,
        currency="USD",
        category="Meals",
        line_items=[LineItem(description="Sirloin Steak", amount=50.00)],
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
    print(f"  Approved: ${d2.approved_amount:.2f} (Requested: $50.00)")
    print(f"  Flags: {d2.flags}")
    assert d2.approved_amount == 40.00, f"Expected capped at $40.00, got {d2.approved_amount}"
    assert any("daily meal cap" in f for f in d2.flags)
    print("  ✓ Dinner capped at remaining daily budget ($40.00) without rejecting!")

    # ------------------------------------------------------------------
    # 3. Client Meal Attendee Allowance ($60/person)
    # ------------------------------------------------------------------
    print("\n[Case 3] Client Meal Allowance ($60/person limit)")
    # Client dinner for $150 with 2 attendees -> max allowance = $120.
    client_meal = ExtractedReceipt(
        vendor="Rooftop Grill",
        date="2026-10-16",
        total_amount=150.00,
        currency="USD",
        category="Meals",
        line_items=[LineItem(description="Client Dinner Tasting", amount=150.00)],
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
    print(f"  Approved: ${d3.approved_amount:.2f}")
    print(f"  Flags: {d3.flags}")
    # Layered interaction: $150 -> $120 (by 2 attendees x $60), then -> $100 (by NYC $100 daily cap)
    assert d3.approved_amount == 100.00, f"Expected 100.00, got {d3.approved_amount}"
    assert any("client meal allowance" in f for f in d3.flags)
    assert any("daily meal cap" in f for f in d3.flags)
    print("  ✓ Layered rule interaction verified: $150 capped to $120 by attendee rule, then to $100 by NYC daily cap.")

    # ------------------------------------------------------------------
    # 4. High-Value Manager Approval Threshold ($200.00)
    # ------------------------------------------------------------------
    print("\n[Case 4] High-Value Expense Approval Threshold (>$200.00)")
    hotel_stay = ExtractedReceipt(
        vendor="Grand Hyatt",
        date="2026-10-17",
        total_amount=350.00,
        currency="USD",
        category="Lodging",
        line_items=[LineItem(description="Hotel Room 2 nights", amount=350.00)],
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
    print("  ✓ Expense over $200 flagged for manager sign-off.")

    print("\n✓ All policy engine rule tests passed!\n")

def run_all():
    print("=" * 60)
    print("RUNNING LAYERED POLICY ENGINE TESTS")
    print("=" * 60)
    test_policy_rules()
    print("🎉 ALL POLICY ENGINE TESTS COMPLETED SUCCESSFULLY!\n")

if __name__ == "__main__":
    run_all()
