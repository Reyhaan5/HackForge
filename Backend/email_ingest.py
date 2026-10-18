import os
import re
import email
import imaplib
from email.header import decode_header
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, date
import shutil
from sqlalchemy.orm import Session
from sqlalchemy import func
from dotenv import load_dotenv

ENV_PATH = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(ENV_PATH, override=True)
load_dotenv(override=True)

from database import Receipt, Employee, get_db
from extractor import extract_receipt, rasterize_pdf_if_needed
from policy_engine import validate_receipt

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# List of common signature / icon keywords to discard
JUNK_FILENAME_KEYWORDS = [
    "logo", "signature", "sigimg", "icon", "banner", "footer", 
    "header", "facebook", "twitter", "linkedin", "instagram", 
    "whatsapp", "badge", "avatar", "mail-icon", "pixel"
]

def sanitize_filename(filename: str) -> str:
    """Removes special characters and whitespace from filename."""
    return re.sub(r'[^a-zA-Z0-9_.-]', '_', filename)

def decode_mime_words(raw_header: Optional[str]) -> str:
    """Decodes MIME encoded-words in headers (e.g., =?utf-8?b?...?=)."""
    if not raw_header:
        return ""
    decoded_fragments = []
    for part, encoding in decode_header(raw_header):
        if isinstance(part, bytes):
            try:
                decoded_fragments.append(part.decode(encoding or "utf-8", errors="replace"))
            except Exception:
                decoded_fragments.append(part.decode("latin1", errors="replace"))
        else:
            decoded_fragments.append(str(part))
    return " ".join(decoded_fragments).strip()

def parse_metadata_from_text(subject: str, body: str) -> Dict[str, Any]:
    """
    Intelligently extracts expense metadata hints from subject line or email body.
    Supports tags like:
      - City: [NYC] or City: Chicago
      - Category: [Meals] or Category: Transport
      - Client: [Acme Corp] or Client: Globex
      - Attendees: 3
    """
    full_text = f"{subject}\n{body}"
    meta = {
        "city": "Default",
        "category": "Meals",
        "client_name": "",
        "attendee_count": 1
    }

    # 1. City extraction
    city_match = re.search(r'(?:city|location|in)\s*[:=\-]?\s*([a-zA-Z\s]{3,20})', full_text, re.IGNORECASE)
    if city_match:
        candidate_city = city_match.group(1).strip()
        # Normalization for common aliases
        if "new york" in candidate_city.lower() or "nyc" in candidate_city.lower():
            meta["city"] = "New York"
        elif "san francisco" in candidate_city.lower() or "sf" in candidate_city.lower():
            meta["city"] = "San Francisco"
        elif "chicago" in candidate_city.lower():
            meta["city"] = "Chicago"
        elif "austin" in candidate_city.lower():
            meta["city"] = "Austin"
        elif "london" in candidate_city.lower():
            meta["city"] = "London"
        else:
            meta["city"] = candidate_city.title()
    else:
        # Check bracketed [NYC] or [London]
        bracket_match = re.search(r'\[(New York|NYC|San Francisco|Chicago|Austin|London)\]', subject, re.IGNORECASE)
        if bracket_match:
            b_city = bracket_match.group(1)
            meta["city"] = "New York" if b_city.upper() == "NYC" else b_city.title()

    # 2. Category extraction
    cat_match = re.search(r'(?:category)\s*[:=\-]?\s*(Meals|Travel|Transport|Lodging|Office Supplies|Software)', full_text, re.IGNORECASE)
    if cat_match:
        meta["category"] = cat_match.group(1).title()
    elif "hotel" in full_text.lower() or "lodging" in full_text.lower():
        meta["category"] = "Lodging"
    elif "uber" in full_text.lower() or "flight" in full_text.lower() or "transport" in full_text.lower():
        meta["category"] = "Transport"
    elif "supplies" in full_text.lower():
        meta["category"] = "Office Supplies"

    # 3. Client name extraction
    client_match = re.search(r'(?:with client|client|customer)\s*[:=\-]?\s*([^\n\r,.;]{2,30})', full_text, re.IGNORECASE)
    if client_match:
        c_name = client_match.group(1).strip()
        if c_name.lower() not in ["meals", "receipt", "expense", "urgent", "reimbursement", "attached"]:
            meta["client_name"] = c_name

    # 4. Attendees count extraction
    att_match = re.search(r'(?:attendees?|people|guests?|party of)\s*[:=\-]?\s*(\d{1,2})', full_text, re.IGNORECASE)
    if att_match:
        try:
            meta["attendee_count"] = max(1, int(att_match.group(1)))
        except ValueError:
            pass

    return meta

def resolve_or_create_employee(db: Session, sender_email: str) -> Employee:
    """Finds an existing employee by email or auto-provisions a new record."""
    clean_email = sender_email.strip().lower()
    emp = db.query(Employee).filter(func.lower(Employee.email) == clean_email).first()
    if emp:
        return emp

    # Extract name prefix from email (e.g. 'john.doe@company.com' -> 'John Doe')
    prefix = clean_email.split('@')[0]
    readable_name = prefix.replace('.', ' ').replace('_', ' ').replace('-', ' ').title()
    emp_id = f"EMP-{abs(hash(clean_email)) % 1000000:06d}"

    emp = Employee(
        id=emp_id,
        name=readable_name or f"Employee {emp_id}",
        email=clean_email,
        department="General"
    )
    db.add(emp)
    db.commit()
    db.refresh(emp)
    print(f"[EmailIngest] Auto-provisioned new employee: {emp.id} ({emp.email})")
    return emp

def is_valid_receipt_attachment(filename: str, file_bytes: bytes) -> Tuple[bool, str]:
    """
    Filters out junk email attachments (tracking pixels, email signatures, spacers).
    Returns (is_valid, reason).
    """
    lower_fn = filename.lower()
    valid_exts = ('.pdf', '.png', '.jpg', '.jpeg', '.webp')
    if not lower_fn.endswith(valid_exts):
        return False, f"Unsupported file extension. Only {valid_exts} are supported."

    # Reject tiny files (< 4KB) which are almost always signature logos or tracking pixels
    if len(file_bytes) < 4 * 1024 and not lower_fn.endswith('.pdf'):
        return False, f"File size too small ({len(file_bytes)} bytes). Discarded as email signature/icon."

    # Check for junk signature keywords in filename
    for kw in JUNK_FILENAME_KEYWORDS:
        if kw in lower_fn:
            return False, f"Filename matched email signature keyword filter: '{kw}'."

    return True, "Valid receipt document."

def process_single_receipt_document(
    db: Session,
    file_bytes: bytes,
    original_filename: str,
    employee_id: str,
    submission_channel: str = "email",
    city: str = "Default",
    category: str = "Meals",
    client_name: str = "",
    attendee_count: int = 1
) -> Dict[str, Any]:
    """
    Core pipeline execution: saves file, extracts data with Gemini,
    evaluates policy rules, and persists to DB.
    """
    clean_fn = sanitize_filename(original_filename)
    timestamp = int(datetime.utcnow().timestamp())
    saved_filename = f"{employee_id}_{timestamp}_{clean_fn}"
    saved_file_path = os.path.join(UPLOAD_DIR, saved_filename)

    with open(saved_file_path, "wb") as f:
        f.write(file_bytes)

    # 1. Rasterize PDF if necessary
    preview_filename = saved_filename
    if clean_fn.lower().endswith(".pdf"):
        rendered_png = rasterize_pdf_if_needed(saved_file_path)
        if rendered_png != saved_file_path and os.path.exists(rendered_png):
            preview_filename = os.path.basename(rendered_png)

    # 2. Extract structured fields via Gemini
    extracted = extract_receipt(saved_file_path)

    # 3. Policy Engine Validation
    decision = validate_receipt(
        receipt=extracted,
        employee_id=employee_id,
        submission_channel=submission_channel,
        city=city,
        category=category,
        client_name=client_name,
        attendee_count=attendee_count,
        db=db
    )

    parsed_date = None
    if extracted.date:
        try:
            parsed_date = datetime.strptime(extracted.date, "%Y-%m-%d").date()
        except ValueError:
            parsed_date = date.today()

    # 4. Check for Straight-Through Processing (STP) condition:
    # If 100% compliant with zero flags and status is APPROVED -> STP Completed!
    is_stp = (decision.status == "APPROVED" and len(decision.flags) == 0)
    final_status = decision.status

    # 5. Store record in database
    receipt_record = Receipt(
        employee_id=employee_id,
        image_path=saved_file_path,
        image_hash=extracted.image_hash,
        submission_channel=submission_channel,
        vendor=extracted.vendor,
        transaction_date=parsed_date,
        category=category,
        city=city,
        attendee_count=attendee_count,
        client_name=client_name or None,
        currency=decision.currency,
        original_amount=decision.requested_amount_original,
        exchange_rate=decision.exchange_rate,
        base_amount_usd=decision.base_amount_usd,
        line_items=decision.processed_line_items,
        status=final_status,
        approved_amount=decision.approved_amount,
        flags=decision.flags,
        explanation=decision.explanation
    )
    db.add(receipt_record)
    db.commit()
    db.refresh(receipt_record)

    return {
        "receipt_id": receipt_record.id,
        "employee_id": employee_id,
        "filename": original_filename,
        "preview_url": f"/uploads/{preview_filename}",
        "vendor": extracted.vendor,
        "date": str(parsed_date or ""),
        "currency": decision.currency,
        "original_amount": decision.requested_amount_original,
        "base_amount_usd": decision.base_amount_usd,
        "approved_amount": decision.approved_amount,
        "status": final_status,
        "is_stp": is_stp,
        "flags": decision.flags,
        "explanation": decision.explanation
    }

def process_mime_email(raw_email_bytes: bytes, db: Session) -> Dict[str, Any]:
    """
    Parses an RFC822 MIME email payload, extracts attachments, filters junk,
    and runs each valid receipt through the processing pipeline.
    """
    msg = email.message_from_bytes(raw_email_bytes)
    raw_from = msg.get("From", "")
    sender_name, sender_email = email.utils.parseaddr(raw_from)
    sender_email = sender_email or "unknown@company.com"

    subject = decode_mime_words(msg.get("Subject", ""))
    date_header = msg.get("Date", "")

    # Extract plain text body
    body_text = ""
    if msg.is_multipart():
        for part in msg.walk():
            ctype = part.get_content_type()
            cdisp = str(part.get("Content-Disposition", ""))
            if ctype == "text/plain" and "attachment" not in cdisp:
                charset = part.get_content_charset() or "utf-8"
                try:
                    body_text += part.get_payload(decode=True).decode(charset, errors="replace")
                except Exception:
                    pass
    else:
        try:
            body_text = msg.get_payload(decode=True).decode(msg.get_content_charset() or "utf-8", errors="replace")
        except Exception:
            pass

    # Extract metadata hints (city, category, client, etc.)
    metadata = parse_metadata_from_text(subject, body_text)

    # Resolve employee
    emp = resolve_or_create_employee(db, sender_email)

    ingested_receipts = []
    skipped_attachments = []

    # Iterate over all attachments
    for part in msg.walk():
        content_disposition = str(part.get("Content-Disposition", ""))
        filename = part.get_filename()

        if filename:
            filename = decode_mime_words(filename)
            file_bytes = part.get_payload(decode=True)
            if not file_bytes:
                continue

            is_valid, reason = is_valid_receipt_attachment(filename, file_bytes)
            if not is_valid:
                skipped_attachments.append({"filename": filename, "reason": reason})
                print(f"[EmailIngest] Skipped attachment '{filename}': {reason}")
                continue

            try:
                res = process_single_receipt_document(
                    db=db,
                    file_bytes=file_bytes,
                    original_filename=filename,
                    employee_id=emp.id,
                    submission_channel="email",
                    city=metadata["city"],
                    category=metadata["category"],
                    client_name=metadata["client_name"],
                    attendee_count=metadata["attendee_count"]
                )
                ingested_receipts.append(res)
                print(f"[EmailIngest] Successfully ingested #{res['receipt_id']} for {emp.name} from email ({res['status']})")
            except Exception as e:
                skipped_attachments.append({"filename": filename, "reason": f"Processing error: {str(e)}"})
                print(f"[EmailIngest] Error processing attachment '{filename}': {e}")

    return {
        "success": True,
        "sender": {
            "name": sender_name,
            "email": sender_email,
            "employee_id": emp.id
        },
        "subject": subject,
        "date": date_header,
        "metadata_inferred": metadata,
        "receipts_processed_count": len(ingested_receipts),
        "receipts": ingested_receipts,
        "skipped_attachments": skipped_attachments
    }

class IMAPInboxPoller:
    """
    Connects to an IMAP mailbox (e.g. Gmail/Outlook) to poll unread receipt emails.
    """
    def __init__(
        self,
        host: Optional[str] = None,
        port: int = 993,
        username: Optional[str] = None,
        password: Optional[str] = None,
        folder: str = "INBOX"
    ):
        from dotenv import load_dotenv
        load_dotenv(override=True)
        self.host = host or os.getenv("IMAP_HOST", "imap.gmail.com")
        self.port = int(os.getenv("IMAP_PORT", str(port)))
        self.username = (username or os.getenv("IMAP_USER", "")).strip()
        self.password = (password or os.getenv("IMAP_PASSWORD", "")).replace(" ", "").replace('"', '').replace("'", "").strip()
        self.folder = folder or os.getenv("IMAP_FOLDER", "INBOX")

    def is_configured(self) -> bool:
        return bool(self.host and self.username and self.password and "your_email" not in self.username.lower())

    def sync_inbox(self, db: Session, max_emails: int = 10) -> Dict[str, Any]:
        """
        Polls IMAP server for UNSEEN emails, runs each through process_mime_email,
        and returns a sync summary.
        """
        if not self.is_configured():
            return {
                "success": False,
                "error": "IMAP credentials not configured in environment (IMAP_USER / IMAP_PASSWORD missing)."
            }

        results = []
        try:
            mail = imaplib.IMAP4_SSL(self.host, self.port)
            mail.login(self.username, self.password)
            mail.select(self.folder)

            # Search for unread emails
            status, search_data = mail.search(None, '(UNSEEN)')
            if status != "OK" or not search_data[0]:
                mail.close()
                mail.logout()
                return {
                    "success": True,
                    "message": "Inbox checked. No new unread receipt emails found.",
                    "emails_scanned": 0,
                    "receipts_created": 0
                }

            email_ids = search_data[0].split()
            to_process = email_ids[-max_emails:]  # Process latest up to max_emails

            for eid in to_process:
                fetch_status, fetch_data = mail.fetch(eid, '(RFC822)')
                if fetch_status == "OK" and fetch_data[0]:
                    raw_email_bytes = fetch_data[0][1]
                    email_summary = process_mime_email(raw_email_bytes, db)
                    results.append(email_summary)
                    # Mark email as SEEN (read)
                    mail.store(eid, '+FLAGS', '\\Seen')

            mail.close()
            mail.logout()

            total_receipts = sum(r.get("receipts_processed_count", 0) for r in results)
            return {
                "success": True,
                "message": f"Successfully polled {len(results)} unread emails and generated {total_receipts} receipts.",
                "emails_scanned": len(results),
                "receipts_created": total_receipts,
                "details": results
            }

        except Exception as e:
            return {
                "success": False,
                "error": f"IMAP sync failed: {str(e)}"
            }
