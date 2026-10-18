import os
import email_ingest

def test_channel_a():
    print("--- Running Stage 1 (Channel A) Ingestion Tests ---")

    # 1. Test Metadata Extraction
    meta1 = email_ingest.parse_metadata_from_text(
        subject="Expense: [NYC] Uber to Client Acme",
        body="Category: Transport, Attendees: 2"
    )
    print("Test 1 Metadata (NYC/Transport/Attendees:2):", meta1)
    assert meta1["city"] == "New York", f"Expected New York, got {meta1['city']}"
    assert meta1["category"] == "Transport", f"Expected Transport, got {meta1['category']}"
    assert meta1["attendee_count"] == 2, f"Expected 2, got {meta1['attendee_count']}"

    # 2. Test Metadata Extraction for London Hotel
    meta2 = email_ingest.parse_metadata_from_text(
        subject="Client Dinner in London with Barclays",
        body="City: London\nCategory: Meals\nAttendees: 4"
    )
    print("Test 2 Metadata (London/Barclays/Attendees:4):", meta2)
    assert meta2["city"] == "London"
    assert meta2["attendee_count"] == 4

    # 3. Test Signature / Junk Attachment Filtering
    is_valid, reason = email_ingest.is_valid_receipt_attachment("footer_logo.png", b"small bytes")
    print("Test 3 Filter footer_logo.png ->", is_valid, f"({reason})")
    assert not is_valid

    is_valid, reason = email_ingest.is_valid_receipt_attachment("signature_icon.jpg", b"123" * 50)
    print("Test 4 Filter signature_icon.jpg ->", is_valid, f"({reason})")
    assert not is_valid

    # Valid receipt
    valid_bytes = b"%PDF-1.4 " + (b"0" * 20000)
    is_valid, reason = email_ingest.is_valid_receipt_attachment("flight_invoice.pdf", valid_bytes)
    print("Test 5 Valid flight_invoice.pdf ->", is_valid, f"({reason})")
    assert is_valid

    # 4. Check IMAP status
    poller = email_ingest.IMAPInboxPoller()
    print("Test 6 IMAP Configuration Status -> Configured:", poller.is_configured())

    print("\n>>> ALL CHANNEL A EMAIL INGESTION TESTS PASSED SUCCESSFULLY! <<<")

if __name__ == "__main__":
    test_channel_a()
