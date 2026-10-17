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

def test_multi_channel_deduplication():
    print("Testing Multi-Channel Duplicate Detection...")
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

    # 1. First submission via 'email'
    print("  [Step 1] Submitting receipt via 'email' channel...")
    d1 = validate_receipt(
        receipt=sample_receipt,
        employee_id="EMP-101",
        submission_channel="email",
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
        submission_channel="email",
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

    # 2. Second submission: Same receipt submitted via 'slack'
    print("  [Step 2] Resubmitting the same receipt via 'slack' channel...")
    d2 = validate_receipt(
        receipt=sample_receipt,
        employee_id="EMP-101",
        submission_channel="slack",
        city="New York",
        category="Meals",
        client_name="",
        attendee_count=1,
        db=db
    )
    assert d2.status == "REJECTED", f"Expected REJECTED, got {d2.status}"
    assert d2.approved_amount == 0.00
    assert any("DUPLICATE DETECTED" in flag for flag in d2.flags)
    assert any("via 'email' channel" in flag for flag in d2.flags), "Did not identify prior channel 'email'"
    print(f"    ✓ Slack submission caught as duplicate! Flag: {d2.flags[0]}")

    # 3. Third submission: Same receipt submitted via 'web' upload
    print("  [Step 3] Resubmitting via 'web' portal...")
    d3 = validate_receipt(
        receipt=sample_receipt,
        employee_id="EMP-101",
        submission_channel="web",
        city="New York",
        category="Meals",
        client_name="",
        attendee_count=1,
        db=db
    )
    assert d3.status == "REJECTED"
    print(f"    ✓ Web submission caught as duplicate!")

    # 4. Fuzzy Duplicate Test (Different hash, but same vendor + date + amount + employee)
    print("  [Step 4] Testing fuzzy duplicate with modified hash...")
    fuzzy_receipt = ExtractedReceipt(
        vendor="Acme Bistro",
        date="2026-10-15",
        total_amount=45.00,
        currency="USD",
        category="Meals",
        line_items=[LineItem(description="Business Lunch", amount=45.00)],
        is_itemized=True,
        image_hash="different_perceptual_hash_xyz_999"
    )
    d4 = validate_receipt(
        receipt=fuzzy_receipt,
        employee_id="EMP-101",
        submission_channel="mobile",
        city="New York",
        category="Meals",
        client_name="",
        attendee_count=1,
        db=db
    )
    assert d4.status == "REJECTED"
    print("    ✓ Fuzzy duplicate (identical vendor, date, amount) caught successfully!")

    print("✓ All deduplication tests passed!\n")

def run_all():
    print("=" * 60)
    print("RUNNING MULTI-CHANNEL DEDUPLICATION TESTS")
    print("=" * 60)
    test_multi_channel_deduplication()
    print("🎉 ALL DEDUPLICATION TESTS COMPLETED SUCCESSFULLY!\n")

if __name__ == "__main__":
    run_all()
