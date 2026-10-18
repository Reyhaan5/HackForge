from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date
import os
import hashlib
import hmac
import secrets
import time
from uuid import uuid4

from database import init_db, get_db, SessionLocal, Receipt, Employee, Policy, Login
from extractor import extract_receipt, compute_image_hash
from policy_engine import validate_receipt
from auth import SECRET_KEY, hash_password, verify_password, create_access_token, get_current_user, require_admin
from email_ingest import (
    process_single_receipt_document,
    process_mime_email,
    IMAPInboxPoller,
    resolve_or_create_employee,
    parse_metadata_from_text,
    is_valid_receipt_attachment
)
from s3_ingest import S3BucketPoller, extract_meta_from_s3_key
from pydantic import BaseModel
from typing import Optional, List
import asyncio

app = FastAPI(title="Expense Graveyard Policy Engine API", version="2.0")

# Background autonomous S3 ingestion task
async def s3_background_watcher():
    """Periodically checks s3://<bucket>/inbox/ every 30 seconds for new receipts."""
    await asyncio.sleep(5) # Brief delay to let app initialize
    poller = S3BucketPoller()
    if not poller.is_configured():
        print("[S3AutoWatcher] S3 bucket is not configured. Background watcher idle.")
        return

    print(f"[S3AutoWatcher] Active: Watching s3://{poller.bucket_name}/{poller.inbox_prefix} every 30s")
    while True:
        try:
            db = SessionLocal()
            try:
                res = poller.sync_inbox(db=db, max_files=10)
                if res.get("receipts_created", 0) > 0:
                    print(f"[S3AutoWatcher] Autonomous ingestion: {res['receipts_created']} receipt(s) ingested!")
            finally:
                db.close()
        except Exception as err:
            print(f"[S3AutoWatcher] Error during auto-poll: {err}")
        await asyncio.sleep(30)

@app.on_event("startup")
async def start_background_tasks():
    asyncio.create_task(s3_background_watcher())

@app.exception_handler(HTTPException)
async def log_bad_request_body(request: Request, exc: HTTPException):
    if exc.status_code == 400 and exc.detail == "There was an error parsing the body":
        cause=exc.__cause__ or exc.__context__
        print(
            "[UPLOAD PARSE ERROR] "
            f"cause={cause!r} content-type={request.headers.get('content-type')!r} "
            f"content-length={request.headers.get('content-length')!r}"
        )
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=exc.headers,
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    password: str

class ReceiptStatusUpdateRequest(BaseModel):
    status: str
    notes: Optional[str]=None

@app.post("/api/login")
@app.post("/auth/login")
def login_user(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(Login).filter_by(username=payload.username.strip()).first()
    if not user or not verify_password(payload.password.strip(), user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    if "$" not in user.password_hash:
        user.password_hash=hash_password(payload.password.strip())
        db.commit()

    emp_name = None
    emp_dept = None
    if user.employee:
        emp_name = user.employee.name
        emp_dept = user.employee.department

    token=create_access_token({
        "sub": user.username,
        "role": user.role,
        "employee_id": user.employee_id
    })

    return {
        "success": True,
        "token": token,
        "user": {
            "username": user.username,
            "role": user.role,
            "employee_id": user.employee_id,
            "name": emp_name or user.username.title(),
            "department": emp_dept or ("Finance" if user.role == "Admin" else "General")
        }
    }

@app.post("/api/register")
@app.post("/auth/register")
def register_user(payload: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(Login).filter_by(username=payload.username.strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    emp_id=f"EMP-{uuid4().hex[:12].upper()}"
    db.add(Employee(
        id=emp_id,
        name=payload.username.strip().title(),
        email=f"{emp_id.lower()}@company.com",
        department="General",
    ))

    # Security fix: Public registration strictly assigns "Employee" role
    # Admin/Finance roles cannot be self-assigned through public registration
    new_login = Login(
        username=payload.username.strip(),
        password_hash=hash_password(payload.password.strip()),
        role="Employee",
        employee_id=emp_id,
    )
    db.add(new_login)
    db.commit()
    db.refresh(new_login)

    token=create_access_token({
        "sub": new_login.username,
        "role": new_login.role,
        "employee_id": new_login.employee_id
    })

    return {
        "success": True,
        "token": token,
        "user": {
            "username": new_login.username,
            "role": new_login.role,
            "employee_id": new_login.employee_id,
            "name": new_login.username.title(),
            "department": "General"
        }
    }

# Create uploads storage folder
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
MAX_UPLOAD_BYTES = 25 * 1024 * 1024
ALLOWED_UPLOAD_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".pdf"}
MEDIA_URL_TTL_SECONDS = 24 * 60 * 60
MEDIA_URL_SECRET = (os.getenv("MEDIA_URL_SECRET") or SECRET_KEY).encode("utf-8") or secrets.token_bytes(32)


def _current_month_range():
    today = date.today()
    month_start = date(today.year, today.month, 1)
    next_year = today.year + 1 if today.month == 12 else today.year
    next_month = 1 if today.month == 12 else today.month + 1
    next_month_start = date(next_year, next_month, 1)
    return month_start, next_month_start


def _receipt_media_url(request: Request, image_path: Optional[str]):
    if not image_path:
        return None

    filename = os.path.basename(image_path.replace("\\", "/"))
    if os.path.splitext(filename)[1].lower() not in ALLOWED_UPLOAD_EXTENSIONS:
        return None
    storage_root = os.path.realpath(UPLOAD_DIR)
    safe_path = os.path.realpath(os.path.join(storage_root, filename))
    try:
        if os.path.commonpath((storage_root, safe_path)) != storage_root:
            return None
    except ValueError:
        return None
    if not os.path.isfile(safe_path):
        return None

    expires = int(time.time()) + MEDIA_URL_TTL_SECONDS
    message = f"{filename}:{expires}".encode("utf-8")
    signature = hmac.new(MEDIA_URL_SECRET, message, hashlib.sha256).hexdigest()
    url = request.url_for("get_uploaded_receipt", filename=filename)
    return str(url.include_query_params(expires=expires, signature=signature))


async def _save_uploaded_file(file: UploadFile, destination: str):
    total_size = 0
    created = False
    try:
        with open(destination, "xb") as buffer:
            created = True
            while chunk := await file.read(1024 * 1024):
                total_size += len(chunk)
                if total_size > MAX_UPLOAD_BYTES:
                    raise HTTPException(status_code=413, detail="Receipt file exceeds the 25 MB upload limit")
                buffer.write(chunk)
        if total_size == 0:
            raise HTTPException(status_code=400, detail="Receipt file is empty")
    except Exception:
        if created:
            try:
                os.remove(destination)
            except OSError:
                pass
        raise


def _remove_files(paths):
    for path in paths:
        if path:
            try:
                os.remove(path)
            except OSError:
                pass


@app.get("/uploads/{filename}", name="get_uploaded_receipt")
def get_uploaded_receipt(
    filename: str,
    expires: int = Query(...),
    signature: str = Query(...),
):
    now = int(time.time())
    if expires < now or expires > now + MEDIA_URL_TTL_SECONDS + 60:
        raise HTTPException(status_code=403, detail="Receipt link has expired")
    if not filename or os.path.basename(filename) != filename or filename in {".", ".."}:
        raise HTTPException(status_code=404, detail="Receipt not found")
    if os.path.splitext(filename)[1].lower() not in ALLOWED_UPLOAD_EXTENSIONS:
        raise HTTPException(status_code=404, detail="Receipt not found")

    message = f"{filename}:{expires}".encode("utf-8")
    expected_signature = hmac.new(MEDIA_URL_SECRET, message, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature, expected_signature):
        raise HTTPException(status_code=403, detail="Invalid receipt link")

    storage_root = os.path.realpath(UPLOAD_DIR)
    safe_path = os.path.realpath(os.path.join(storage_root, filename))
    try:
        if os.path.commonpath((storage_root, safe_path)) != storage_root:
            raise HTTPException(status_code=404, detail="Receipt not found")
    except ValueError:
        raise HTTPException(status_code=404, detail="Receipt not found")
    if not os.path.isfile(safe_path):
        raise HTTPException(status_code=404, detail="Receipt not found")

    return FileResponse(safe_path, headers={"Cache-Control": "private, no-store"})

@app.on_event("startup")
def startup_event():
    init_db()
    print("[DB] Database initialized and ready.")

@app.post("/api/process-receipt")
async def process_receipt(
    request: Request,
    file: UploadFile = File(...),
    employee_id: Optional[str]=Form(None),
    submission_channel: str=Form("web"),
    city: str=Form(...),
    category: str=Form(...),
    client_name: str = Form(""),
    attendee_count: int = Form(1),
    current_user: Login=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role in ["Admin", "Finance"]:
        employee_id=employee_id.strip() if employee_id else current_user.employee_id
        if not employee_id:
            raise HTTPException(status_code=400, detail="employee_id is required for administrative submissions")
    else:
        if not current_user.employee_id:
            raise HTTPException(status_code=403, detail="This account is not linked to an employee")
        if employee_id and employee_id.strip() != current_user.employee_id:
            raise HTTPException(status_code=403, detail="You may only submit receipts for your own employee account")
        employee_id=current_user.employee_id

    print(f"\n[Ingest] Ingesting receipt: {file.filename} | Employee: {employee_id} | Channel: {submission_channel} | City: {city}")

    original_filename = (file.filename or "receipt.jpg").replace("\\", "/").rsplit("/", 1)[-1]
    file_ext = os.path.splitext(original_filename)[1].lower() or ".jpg"
    if file_ext not in {".jpg", ".jpeg", ".png", ".webp", ".pdf"}:
        raise HTTPException(status_code=415, detail="Unsupported receipt file type")
    temp_filename = f"{uuid4().hex}{file_ext}"
    saved_file_path = os.path.join(UPLOAD_DIR, temp_filename)
    preview_file_path = os.path.splitext(saved_file_path)[0] + "_page1.png" if file_ext == ".pdf" else None
    receipt_committed = False

    emp = db.query(Employee).filter_by(id=employee_id).first()
    if not emp:
        # Auto-create if new
        emp = Employee(id=employee_id, name=f"Employee {employee_id}", email=f"{employee_id.lower()}@company.com")
        db.add(emp)
        db.commit()

    try:
        await _save_uploaded_file(file, saved_file_path)
        if file_ext.lower() == ".pdf":
            from extractor import rasterize_pdf_if_needed
            rendered_png=rasterize_pdf_if_needed(saved_file_path)
            if rendered_png != saved_file_path and os.path.exists(rendered_png):
                temp_filename=os.path.basename(rendered_png)
                preview_file_path=rendered_png

        # 1. Cloud Model Vision Extraction
        extracted = extract_receipt(saved_file_path)
        
        # 2. Run Layered Policy Engine (Calculations on the fly)
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

        # 3. Store Receipt & Decision
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
            base_amount_inr=decision.base_amount_inr,
            line_items=decision.processed_line_items,
            status=decision.status,
            approved_amount=decision.approved_amount,
            flags=decision.flags,
            explanation=decision.explanation
        )
        db.add(receipt_record)
        db.commit()
        receipt_committed = True
        db.refresh(receipt_record)

        # 4. On-the-fly Monthly Total for this employee
        month_start, next_month_start = _current_month_range()
        monthly_spent = db.query(func.coalesce(func.sum(Receipt.approved_amount), 0.0)).filter(
            Receipt.employee_id == employee_id,
            Receipt.transaction_date >= month_start,
            Receipt.transaction_date < next_month_start,
            Receipt.status.in_(["APPROVED", "PARTIAL", "PENDING_APPROVAL"])
        ).scalar()

        return JSONResponse(content={
            "success": True,
            "receipt_id": receipt_record.id,
            "image_url": _receipt_media_url(request, os.path.join(UPLOAD_DIR, temp_filename)),
            "submission_channel": submission_channel,
            "currency": decision.currency,
            "original_amount": decision.requested_amount_original,
            "exchange_rate": decision.exchange_rate,
            "base_amount_inr": decision.base_amount_inr,
            "extracted": extracted.model_dump(),
            "validation": {
                "status": decision.status,
                "flags": decision.flags,
                "reimbursement_amount": decision.approved_amount
            },
            "session": {
                "monthly_spent": float(monthly_spent),
                "receipts_processed": db.query(Receipt).count()
            },
            "decision": {
                "status": decision.status,
                "requested_amount_original": decision.requested_amount_original,
                "base_amount_inr": decision.base_amount_inr,
                "approved_amount": decision.approved_amount,
                "flags": decision.flags,
                "explanation": decision.explanation
            },
            "employee_summary": {
                "employee_id": employee_id,
                "monthly_spent_to_date": float(monthly_spent)
            }
        })

    except HTTPException:
        db.rollback()
        if not receipt_committed:
            _remove_files((saved_file_path, preview_file_path))
        raise
    except ValueError as e:
        db.rollback()
        if not receipt_committed:
            _remove_files((saved_file_path, preview_file_path))
        return JSONResponse(status_code=422, content={"success": False, "error": str(e)})
    except Exception as e:
        db.rollback()
        if not receipt_committed:
            _remove_files((saved_file_path, preview_file_path))
        print(f"[ERROR] Error processing receipt: {str(e)}")
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

# =====================================================================
# STAGE 1: AUTOMATED INGESTION (CHANNEL A: INBOUND EMAIL)
# =====================================================================

@app.post("/api/ingest/email-webhook")
@app.post("/api/ingest/email/simulate")
async def ingest_email_endpoint(
    file: UploadFile = File(...),
    from_email: str = Form("emp-101@company.com"),
    subject: str = Form("Expense Receipt"),
    body: str = Form(""),
    db: Session = Depends(get_db)
):
    """
    Automated Email Ingestion (Channel A):
    Receives forwarded receipts (via webhook or email simulator),
    auto-resolves employee identity from sender email, parses metadata
    (city/category/client hints) from subject & body, rejects signature junk,
    and executes the automated extraction & policy validation pipeline.
    """
    file_bytes = await file.read()
    filename = file.filename or "receipt.jpg"

    is_valid, reason = is_valid_receipt_attachment(filename, file_bytes)
    if not is_valid:
        return JSONResponse(status_code=400, content={
            "success": False,
            "error": reason,
            "filename": filename
        })

    # Resolve Employee
    emp = resolve_or_create_employee(db, from_email)

    # Parse metadata hints from email subject & body
    meta = parse_metadata_from_text(subject, body)

    try:
        result = process_single_receipt_document(
            db=db,
            file_bytes=file_bytes,
            original_filename=filename,
            employee_id=emp.id,
            submission_channel="email",
            city=meta["city"],
            category=meta["category"],
            client_name=meta["client_name"],
            attendee_count=meta["attendee_count"]
        )

        return JSONResponse(content={
            "success": True,
            "channel": "email",
            "sender": {
                "email": emp.email,
                "name": emp.name,
                "employee_id": emp.id
            },
            "subject": subject,
            "metadata_inferred": meta,
            "receipt": result
        })
    except Exception as e:
        db.rollback()
        print(f"[EmailIngest] Error: {e}")
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

@app.post("/api/ingest/email/raw")
async def ingest_raw_mime_email(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Parses a full raw RFC822 (.eml) MIME email file containing headers,
    body, and multiple attachments.
    """
    raw_bytes = await file.read()
    try:
        summary = process_mime_email(raw_bytes, db)
        return JSONResponse(content=summary)
    except Exception as e:
        db.rollback()
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

@app.get("/api/ingest/email/status")
def get_email_ingest_status():
    """Returns the configuration status of the IMAP email listener."""
    poller = IMAPInboxPoller()
    return {
        "channel": "email",
        "imap_configured": poller.is_configured(),
        "host": poller.host if poller.is_configured() else "Not Configured",
        "folder": poller.folder,
        "supported_formats": [".pdf", ".png", ".jpg", ".jpeg", ".webp"],
        "junk_filtering_enabled": True
    }

@app.post("/api/ingest/email/sync")
def sync_email_inbox(
    max_emails: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """
    Manually triggers an IMAP inbox check for unread receipt emails.
    """
    poller = IMAPInboxPoller()
    result = poller.sync_inbox(db=db, max_emails=max_emails)
    status_code = 200 if result.get("success") else 400
    return JSONResponse(status_code=status_code, content=result)

# =====================================================================
# STAGE 1: AUTOMATED INGESTION (CHANNEL B: AWS S3 CLOUD STORAGE)
# =====================================================================

@app.get("/api/ingest/s3/status")
def get_s3_ingest_status():
    """Returns configuration and connection health of the AWS S3 Bucket listener."""
    poller = S3BucketPoller()
    conn_info = poller.check_bucket_connection()
    return {
        "channel": "s3",
        "s3_configured": poller.is_configured(),
        "connected": conn_info.get("connected", False),
        "bucket": poller.bucket_name if poller.is_configured() else "Not Configured",
        "region": poller.region,
        "inbox_prefix": poller.inbox_prefix,
        "supported_formats": [".pdf", ".png", ".jpg", ".jpeg", ".webp"],
        "error": conn_info.get("error")
    }

@app.post("/api/ingest/s3/sync")
def sync_s3_inbox_endpoint(
    max_files: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """
    Manually triggers polling of s3://<bucket>/inbox/ for pending receipt files.
    """
    poller = S3BucketPoller()
    result = poller.sync_inbox(db=db, max_files=max_files)
    status_code = 200 if result.get("success") else 400
    return JSONResponse(status_code=status_code, content=result)

@app.post("/api/ingest/s3/simulate")
async def simulate_s3_upload_endpoint(
    file: UploadFile = File(...),
    employee_id: str = Form("EMP-101"),
    city: str = Form("New York"),
    category: str = Form("Meals"),
    client_name: str = Form(""),
    attendee_count: int = Form(1),
    db: Session = Depends(get_db)
):
    """
    Simulates an automated drop into s3://<bucket>/inbox/<employee_id>/
    and processes the receipt with submission_channel='s3'.
    """
    file_bytes = await file.read()
    filename = file.filename or "receipt.jpg"

    is_valid, reason = is_valid_receipt_attachment(filename, file_bytes)
    if not is_valid:
        return JSONResponse(status_code=400, content={
            "success": False,
            "error": reason,
            "filename": filename
        })

    try:
        result = process_single_receipt_document(
            db=db,
            file_bytes=file_bytes,
            original_filename=filename,
            employee_id=employee_id,
            submission_channel="s3",
            city=city,
            category=category,
            client_name=client_name,
            attendee_count=attendee_count
        )
        return JSONResponse(content={
            "success": True,
            "channel": "s3",
            "bucket": os.getenv("S3_BUCKET_NAME", "company-expense-vault"),
            "key": f"inbox/{employee_id}/{filename}",
            "receipt": result
        })
    except Exception as e:
        db.rollback()
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

@app.post("/api/ingest/s3-webhook")
async def s3_event_notification_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    AWS S3 Event Notification Webhook (s3:ObjectCreated:*).
    Receives notification payload when a file is uploaded to the S3 bucket,
    downloads the object, and processes it in sub-second time.
    """
    try:
        body = await request.json()
        records = body.get("Records", [])
        if not records:
            return JSONResponse(content={"message": "No S3 records to process."})

        poller = S3BucketPoller()
        client = poller.get_client()
        if not client:
            return JSONResponse(status_code=400, content={"error": "S3 client not configured."})

        processed = []
        for rec in records:
            bucket_name = rec.get("s3", {}).get("bucket", {}).get("name")
            key = rec.get("s3", {}).get("object", {}).get("key")
            if not bucket_name or not key or key.endswith('/'):
                continue

            obj = client.get_object(Bucket=bucket_name, Key=key)
            file_bytes = obj["Body"].read()
            filename = os.path.basename(key)

            meta = extract_meta_from_s3_key(key)
            emp_hint = meta["employee_hint"]
            emp_id = resolve_or_create_employee(db, emp_hint).id if "@" in emp_hint else emp_hint

            res = process_single_receipt_document(
                db=db,
                file_bytes=file_bytes,
                original_filename=filename,
                employee_id=emp_id,
                submission_channel="s3",
                city=meta["city"],
                category=meta["category"],
                client_name=meta["client_name"],
                attendee_count=meta["attendee_count"]
            )
            processed.append(res)

        return JSONResponse(content={"success": True, "processed": processed})
    except Exception as e:
        db.rollback()
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

@app.get("/api/receipts")
def list_receipts(
    request: Request,
    employee_id: str = Query(None),
    submission_channel: str = Query(None),
    status: str = Query(None),
    current_user: Login=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lists receipts with on-the-fly filtering by employee, channel, or status."""
    query = db.query(Receipt)
    if current_user.role not in ["Admin", "Finance"]:
        if not current_user.employee_id:
            raise HTTPException(status_code=403, detail="This account is not linked to an employee")
        if employee_id and employee_id != current_user.employee_id:
            raise HTTPException(status_code=403, detail="You may only view your own receipts")
        query=query.filter(Receipt.employee_id == current_user.employee_id)
    elif employee_id:
        query = query.filter(Receipt.employee_id == employee_id)
    if submission_channel:
        query = query.filter(Receipt.submission_channel == submission_channel)
    if status:
        query = query.filter(Receipt.status == status)
    
    receipts = query.order_by(Receipt.id.desc()).all()
    return [
        {
            "id": r.id,
            "employee_id": r.employee_id,
            "submission_channel": r.submission_channel,
            "vendor": r.vendor,
            "transaction_date": str(r.transaction_date),
            "category": r.category,
            "city": r.city,
            "attendee_count": r.attendee_count,
            "client_name": r.client_name,
            "currency": r.currency,
            "original_amount": float(r.original_amount),
            "exchange_rate": float(r.exchange_rate),
            "base_amount_inr": float(r.base_amount_inr),
            "approved_amount": float(r.approved_amount),
            "status": r.status,
            "flags": r.flags,
            "explanation": r.explanation,
            "line_items": r.line_items,
            "image_url": _receipt_media_url(request, r.image_path),
            "created_at": r.created_at.isoformat() if r.created_at else None
        }
        for r in receipts
    ]

@app.patch("/api/receipts/{receipt_id}/status")
@app.patch("/receipts/{receipt_id}/status")
def update_receipt_status(
    receipt_id: int,
    payload: ReceiptStatusUpdateRequest,
    admin_user: Login=Depends(require_admin),
    db: Session=Depends(get_db)
):
    """Updates receipt status and manager notes persistently in PostgreSQL."""
    receipt=db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")

    new_status=payload.status.upper()
    if new_status not in ["APPROVED", "REJECTED", "PARTIAL", "PENDING_APPROVAL"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    if new_status == "REJECTED" and not (payload.notes or "").strip():
        raise HTTPException(status_code=422, detail="A rejection reason is required")

    receipt.status=new_status
    if new_status == "APPROVED":
        if float(receipt.approved_amount) <= 0:
            receipt.approved_amount=receipt.base_amount_inr
        if receipt.flags and isinstance(receipt.flags, list):
            receipt.flags=[
                f for f in receipt.flags 
                if "Requires manager approval" not in f and "High amount" not in f
            ]
    elif new_status == "REJECTED":
        receipt.approved_amount=0.0

    if payload.notes and payload.notes.strip():
        note_label="Reviewer rejection reason" if new_status == "REJECTED" else "Manager Note"
        note_text=f"{note_label}: {payload.notes.strip()}"
        receipt.explanation=f"{receipt.explanation or ''}\n{note_text}".strip()

    db.commit()
    db.refresh(receipt)
    return {
        "success": True,
        "receipt_id": receipt.id,
        "status": receipt.status,
        "approved_amount": float(receipt.approved_amount),
        "explanation": receipt.explanation,
        "flags": receipt.flags
    }

@app.get("/api/employees")
def list_employees(
    current_user: Login=Depends(get_current_user),
    db: Session=Depends(get_db),
):
    """Returns employees with on-the-fly monthly spend calculations."""
    employee_query=db.query(Employee)
    if current_user.role not in ["Admin", "Finance"]:
        if not current_user.employee_id:
            raise HTTPException(status_code=403, detail="This account is not linked to an employee")
        employee_query=employee_query.filter(Employee.id == current_user.employee_id)
    employees=employee_query.all()
    month_start, next_month_start = _current_month_range()
    
    result = []
    for emp in employees:
        monthly_spent = db.query(func.coalesce(func.sum(Receipt.approved_amount), 0.0)).filter(
            Receipt.employee_id == emp.id,
            Receipt.transaction_date >= month_start,
            Receipt.transaction_date < next_month_start,
            Receipt.status.in_(["APPROVED", "PARTIAL", "PENDING_APPROVAL"])
        ).scalar()

        receipt_count = db.query(func.count(Receipt.id)).filter(Receipt.employee_id == emp.id).scalar()

        result.append({
            "id": emp.id,
            "name": emp.name,
            "email": emp.email,
            "department": emp.department,
            "receipts_count": receipt_count,
            "monthly_spent": float(monthly_spent)
        })
    return result

@app.get("/api/policy")
def get_policy(current_user: Login=Depends(get_current_user), db: Session=Depends(get_db)):
    """Fetches the active policy configuration JSON (Requires Authentication)."""
    policy = db.query(Policy).filter_by(is_active=True).first()
    if not policy:
        raise HTTPException(status_code=404, detail="No active policy found")
    return {"id": policy.id, "rules": policy.rules}

@app.put("/api/policy")
def update_policy(rules: dict, admin_user: Login=Depends(get_current_user), db: Session=Depends(get_db)):
    """Updates active policy rules (Admin only)."""
    if admin_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Only Admin accounts can edit expense policies")
    for key in ("monthly_limit", "approval_threshold", "client_meal_per_person_limit"):
        if key in rules and (not isinstance(rules[key], (int, float)) or isinstance(rules[key], bool) or rules[key] < 0):
            raise HTTPException(status_code=422, detail=f"{key} must be a non-negative number")
    for key in ("city_daily_caps", "category_caps"):
        if key in rules and (not isinstance(rules[key], dict) or any(
            not isinstance(name, str) or not name.strip() or not isinstance(value, (int, float))
            or isinstance(value, bool) or value < 0 for name, value in rules[key].items()
        )):
            raise HTTPException(status_code=422, detail=f"{key} must contain named non-negative amounts")
    if "non_reimbursable_keywords" in rules and (
        not isinstance(rules["non_reimbursable_keywords"], list)
        or any(not isinstance(word, str) or not word.strip() for word in rules["non_reimbursable_keywords"])
    ):
        raise HTTPException(status_code=422, detail="non_reimbursable_keywords must be a list of words")
    policy = db.query(Policy).filter_by(is_active=True).first()
    if not policy:
        policy = Policy(id="DEFAULT-EXPENSE-POLICY", is_active=True, rules=rules)
        db.add(policy)
    else:
        policy.rules = rules
    db.commit()
    return {"success": True, "message": "Policy updated successfully", "rules": policy.rules}

@app.get("/api/session")
def get_session_data(request: Request, current_user: Login=Depends(get_current_user), db: Session=Depends(get_db)):
    """Returns processed receipts and spend scoped by employee role (Requires Authentication)."""
    query=db.query(Receipt).order_by(Receipt.created_at.desc())
    if current_user.role not in ["Admin", "Finance"]:
        query=query.filter(Receipt.employee_id == current_user.employee_id)

    receipts=query.all()
    hashes = [r.image_hash for r in receipts if r.image_hash]
    
    month_start, next_month_start = _current_month_range()
    spend_query=db.query(func.coalesce(func.sum(Receipt.approved_amount), 0.0)).filter(
        Receipt.transaction_date >= month_start,
        Receipt.transaction_date < next_month_start,
        Receipt.status.in_(["APPROVED", "PARTIAL", "PENDING_APPROVAL"])
    )
    if current_user.role not in ["Admin", "Finance"]:
        spend_query=spend_query.filter(Receipt.employee_id == current_user.employee_id)

    monthly_spent=spend_query.scalar()

    history = []
    for r in receipts:
        history.append({
            "id": f"rec_{r.id}",
            "city": r.city,
            "category": r.category,
            "client_name": r.client_name or "",
            "submission_channel": r.submission_channel,
            "image_url": _receipt_media_url(request, r.image_path),
            "timestamp": r.created_at.isoformat() if r.created_at else datetime.utcnow().isoformat(),
            "receipt": {
                "vendor": r.vendor or "Unknown",
                "date": str(r.transaction_date) if r.transaction_date else "",
                "total_amount": float(r.original_amount),
                "currency": r.currency or "INR",
                "base_amount_inr": float(r.base_amount_inr),
                "exchange_rate": float(r.exchange_rate),
                "line_items": r.line_items or [],
                "is_itemized": bool(r.line_items)
            },
            "result": {
                "status": r.status,
                "flags": r.flags or [],
                "reimbursement_amount": float(r.approved_amount),
                "explanation": r.explanation or ""
            }
        })

    return {
        "processed_hashes": hashes,
        "monthly_spent": float(monthly_spent),
        "history": history
    }

@app.post("/api/reset-session")
@app.post("/api/reset")
def reset_database(admin_user: Login=Depends(require_admin), db: Session=Depends(get_db)):
    """Wipes all receipts and resets system (Requires Admin/Finance Privileges)."""
    db.query(Receipt).delete()
    db.commit()
    return {"success": True, "message": "All receipt submissions reset by admin"}

@app.get("/api/export-csv")
def export_csv(current_user: Login=Depends(get_current_user), db: Session=Depends(get_db)):
    """Exports receipt reports to CSV scoped by caller privileges (Requires Authentication)."""
    import csv
    import io

    query=db.query(Receipt).order_by(Receipt.created_at.desc())
    if current_user.role not in ["Admin", "Finance"]:
        query=query.filter(Receipt.employee_id == current_user.employee_id)

    receipts=query.all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Date", "Vendor", "Original Amount", "Original Currency", "Amount (INR)", "Category", "City", "Status", "Approved Amount (INR)", "Flags", "Employee ID"])
    
    for r in receipts:
        flags_str = "; ".join(r.flags) if isinstance(r.flags, list) else str(r.flags or "")
        writer.writerow([
            r.id,
            str(r.transaction_date or ""),
            r.vendor or "",
            float(r.original_amount),
            r.currency or "INR",
            float(r.base_amount_inr),
            r.category or "",
            r.city or "",
            r.status,
            float(r.approved_amount),
            flags_str,
            r.employee_id
        ])
    
    output.seek(0)
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=receipts_export.csv"}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
