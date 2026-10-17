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

def test_deduplication_and_fraud():
    print("Testing Deduplication & Cross-Employee Fraud Checks...")
    init_db()
    db = SessionLocal()
    
    # Clear test table
    db.query(Receipt).delete()
    db.commit()

    sample_receipt = ExtractedReceipt(
        vendor="Acme Bistro",
        date="2026-10-15",
        total_amount=45.00,
        currency="USD",
        category="Meals",
        line_items=[LineItem(description="Business Lunch", amount=45.00)],
        is_itemized=True,
        image_hash="perceptual_hash_abc_123"
    )

    # 1. First submission by EMP-101 via web
    print("  [Step 1] EMP-101 submits receipt via web...")
    d1 = validate_receipt(
        receipt=sample_receipt,
        employee_id="EMP-101",
        submission_channel="web",
        city="New York",
        category="Meals",
        client_name="",
        attendee_count=1,
        db=db
    )
    assert d1.status == "APPROVED"
    assert d1.approved_amount == 45.00
    print(f"    ✓ First submission approved: ${d1.approved_amount:.2f}")

    # Save to database
    r1 = Receipt(
        employee_id="EMP-101",
        image_path="/tmp/fake_receipt.jpg",
        image_hash=sample_receipt.image_hash,
        submission_channel="web",
        vendor=sample_receipt.vendor,
        transaction_date=date(2026, 10, 15),
        category="Meals",
        city="New York",
        currency="USD",
        original_amount=sample_receipt.total_amount,
        exchange_rate=1.0,
        base_amount_usd=sample_receipt.total_amount,
        line_items=d1.processed_line_items,
        status=d1.status,
        approved_amount=d1.approved_amount,
        flags=d1.flags,
        explanation=d1.explanation
    )
    db.add(r1)
    db.commit()

    # 2. Same-Employee Duplicate: EMP-101 resubmits the same receipt
    print("  [Step 2] EMP-101 resubmits the same receipt...")
    d2 = validate_receipt(
        receipt=sample_receipt,
        employee_id="EMP-101",
        submission_channel="web",
        city="New York",
        category="Meals",
        client_name="",
        attendee_count=1,
        db=db
    )
    assert d2.status == "REJECTED", f"Expected REJECTED, got {d2.status}"
    assert d2.approved_amount == 0.00
    assert any("DUPLICATE DETECTED" in flag for flag in d2.flags)
    print(f"    ✓ Duplicate caught! Flag: {d2.flags[0]}")

    # 3. Cross-Employee Double Claim: EMP-102 submits the exact same receipt!
    print("  [Step 3] Cross-Employee Collision: EMP-102 submits EMP-101's receipt...")
    d3 = validate_receipt(
        receipt=sample_receipt,
        employee_id="EMP-102",
        submission_channel="web",
        city="New York",
        category="Meals",
        client_name="",
        attendee_count=1,
        db=db
    )
    assert d3.status == "REJECTED", f"Expected REJECTED, got {d3.status}"
    assert d3.approved_amount == 0.00
    assert any("FRAUD ALERT: Cross-employee double claim" in flag for flag in d3.flags)
    print(f"    ✓ Cross-employee double claim caught! Flag: {d3.flags[0]}")

    # 4. Cross-Employee Fuzzy Collision: EMP-103 submits identical vendor, date, and amount
    print("  [Step 4] EMP-103 submits receipt with matching vendor, date, and amount...")
    fuzzy_receipt = ExtractedReceipt(
        vendor="Acme Bistro",
        date="2026-10-15",
        total_amount=45.00,
        currency="USD",
        category="Meals",
        line_items=[LineItem(description="Business Lunch", amount=45.00)],
        is_itemized=True,
        image_hash="distinct_photo_hash_different_angle"
    )
    d4 = validate_receipt(
        receipt=fuzzy_receipt,
        employee_id="EMP-103",
        submission_channel="web",
        city="New York",
        category="Meals",
        client_name="",
        attendee_count=1,
        db=db
    )
    assert d4.status == "REJECTED"
    assert any("FRAUD ALERT: Cross-employee double claim" in flag for flag in d4.flags)
    print("    ✓ Fuzzy cross-employee collision caught successfully!")

    print("✓ All deduplication and fraud tests passed!\n")

def run_all():
    print("=" * 60)
    print("RUNNING DEDUPLICATION & FRAUD TESTS")
    print("=" * 60)
    test_deduplication_and_fraud()
    print("🎉 ALL DEDUPLICATION & FRAUD TESTS COMPLETED SUCCESSFULLY!\n")

if __name__ == "__main__":
    run_all()
