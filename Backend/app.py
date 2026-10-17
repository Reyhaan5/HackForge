from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date
import tempfile
import os
import shutil
from uuid import uuid4

from database import init_db, get_db, Receipt, Employee, Policy, Login
from extractor import extract_receipt, compute_image_hash
from policy_engine import validate_receipt
from auth import hash_password, verify_password, create_access_token, get_current_user, require_admin
from pydantic import BaseModel
from typing import Optional

app = FastAPI(title="Expense Graveyard Policy Engine API", version="2.0")

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
    notes: Optional[str] = None

@app.post("/api/login")
@app.post("/auth/login")
def login_user(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(Login).filter_by(username=payload.username.strip()).first()
    if not user or not verify_password(payload.password.strip(), user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    # Automatically upgrade legacy plaintext password to secure PBKDF2 hash
    if "$" not in user.password_hash:
        user.password_hash = hash_password(payload.password.strip())
        db.commit()

    emp_name = None
    emp_dept = None
    if user.employee:
        emp_name = user.employee.name
        emp_dept = user.employee.department

    token = create_access_token({
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

    # Public registration always creates a new employee identity. Callers cannot
    # link an account to another employee or assign themselves a privileged role.
    emp_id = f"EMP-{uuid4().hex[:12].upper()}"
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

    token = create_access_token({
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
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

@app.on_event("startup")
def startup_event():
    init_db()
    print("[DB] Database initialized and ready.")

@app.post("/api/process-receipt")
async def process_receipt(
    file: UploadFile = File(...),
    employee_id: Optional[str] = Form(None),
    submission_channel: str = Form("web"), # 'web', 'email', 'mobile', 'slack', 'api'
    city: str = Form("New York"),
    category: str = Form("Meals"),
    client_name: str = Form(""),
    attendee_count: int = Form(1),
    current_user: Login = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Ingests and validates a receipt from any submission channel (web, email, mobile, slack, api).
    Extracts structured data using a cloud model, enforces layered policies, and stores results.
    """
    if current_user.role in ["Admin", "Finance"]:
        employee_id = employee_id.strip() if employee_id else current_user.employee_id
        if not employee_id:
            raise HTTPException(status_code=400, detail="employee_id is required for administrative submissions")
    else:
        if not current_user.employee_id:
            raise HTTPException(status_code=403, detail="This account is not linked to an employee")
        if employee_id and employee_id.strip() != current_user.employee_id:
            raise HTTPException(status_code=403, detail="You may only submit receipts for your own employee account")
        employee_id = current_user.employee_id

    print(f"\n[Ingest] Ingesting receipt: {file.filename} | Employee: {employee_id} | Channel: {submission_channel} | City: {city}")

    # Check employee existence
    emp = db.query(Employee).filter_by(id=employee_id).first()
    if not emp:
        # Auto-create if new
        emp = Employee(id=employee_id, name=f"Employee {employee_id}", email=f"{employee_id.lower()}@company.com")
        db.add(emp)
        db.commit()

    # Save uploaded file
    file_ext = os.path.splitext(file.filename)[1] or ".jpg"
    temp_filename = f"{employee_id}_{int(datetime.utcnow().timestamp())}_{file.filename}"
    saved_file_path = os.path.join(UPLOAD_DIR, temp_filename)

    with open(saved_file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        # If PDF was uploaded, rasterize page 0 to companion PNG for browser preview
        if file_ext.lower() == ".pdf":
            from extractor import rasterize_pdf_if_needed
            rendered_png = rasterize_pdf_if_needed(saved_file_path)
            if rendered_png != saved_file_path and os.path.exists(rendered_png):
                temp_filename = os.path.basename(rendered_png)

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
            base_amount_usd=decision.base_amount_usd,
            line_items=decision.processed_line_items,
            status=decision.status,
            approved_amount=decision.approved_amount,
            flags=decision.flags,
            explanation=decision.explanation
        )
        db.add(receipt_record)
        db.commit()
        db.refresh(receipt_record)

        # 4. On-the-fly Monthly Total for this employee
        month_start = date(date.today().year, date.today().month, 1)
        monthly_spent = db.query(func.coalesce(func.sum(Receipt.approved_amount), 0.0)).filter(
            Receipt.employee_id == employee_id,
            Receipt.transaction_date >= month_start,
            Receipt.status.in_(["APPROVED", "PARTIAL", "PENDING_APPROVAL"])
        ).scalar()

        return JSONResponse(content={
            "success": True,
            "receipt_id": receipt_record.id,
            "image_url": f"/uploads/{temp_filename}",
            "submission_channel": submission_channel,
            "currency": decision.currency,
            "original_amount": decision.requested_amount_original,
            "exchange_rate": decision.exchange_rate,
            "base_amount_usd": decision.base_amount_usd,
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
                "base_amount_usd": decision.base_amount_usd,
                "approved_amount": decision.approved_amount,
                "flags": decision.flags,
                "explanation": decision.explanation
            },
            "employee_summary": {
                "employee_id": employee_id,
                "monthly_spent_to_date": float(monthly_spent)
            }
        })

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error processing receipt: {str(e)}")
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

@app.get("/api/receipts")
def list_receipts(
    employee_id: str = Query(None),
    submission_channel: str = Query(None),
    status: str = Query(None),
    current_user: Login = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lists receipts with on-the-fly filtering by employee, channel, or status."""
    query = db.query(Receipt)
    if current_user.role not in ["Admin", "Finance"]:
        if not current_user.employee_id:
            raise HTTPException(status_code=403, detail="This account is not linked to an employee")
        if employee_id and employee_id != current_user.employee_id:
            raise HTTPException(status_code=403, detail="You may only view your own receipts")
        query = query.filter(Receipt.employee_id == current_user.employee_id)
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
            "base_amount_usd": float(r.base_amount_usd),
            "approved_amount": float(r.approved_amount),
            "status": r.status,
            "flags": r.flags,
            "explanation": r.explanation,
            "line_items": r.line_items,
            "image_url": f"/uploads/{os.path.basename(r.image_path)}" if r.image_path and os.path.exists(os.path.join(UPLOAD_DIR, os.path.basename(r.image_path))) else None,
            "created_at": r.created_at.isoformat() if r.created_at else None
        }
        for r in receipts
    ]

@app.patch("/api/receipts/{receipt_id}/status")
@app.patch("/receipts/{receipt_id}/status")
def update_receipt_status(
    receipt_id: int,
    payload: ReceiptStatusUpdateRequest,
    db: Session = Depends(get_db)
):
    """Updates receipt status and manager notes persistently in PostgreSQL."""
    receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")

    new_status = payload.status.upper()
    if new_status not in ["APPROVED", "REJECTED", "PARTIAL", "PENDING_APPROVAL"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    if new_status == "REJECTED" and not (payload.notes or "").strip():
        raise HTTPException(status_code=422, detail="A rejection reason is required")

    receipt.status = new_status
    if new_status == "APPROVED":
        if float(receipt.approved_amount) <= 0:
            receipt.approved_amount = receipt.base_amount_usd
        if receipt.flags and isinstance(receipt.flags, list):
            receipt.flags = [
                f for f in receipt.flags 
                if "Requires manager approval" not in f and "High amount" not in f
            ]
    elif new_status == "REJECTED":
        receipt.approved_amount = 0.0

    if payload.notes and payload.notes.strip():
        note_label = "Reviewer rejection reason" if new_status == "REJECTED" else "Manager Note"
        note_text = f"{note_label}: {payload.notes.strip()}"
        receipt.explanation = f"{receipt.explanation or ''}\n{note_text}".strip()

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
    current_user: Login = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns employees with on-the-fly monthly spend calculations."""
    employee_query = db.query(Employee)
    if current_user.role not in ["Admin", "Finance"]:
        if not current_user.employee_id:
            raise HTTPException(status_code=403, detail="This account is not linked to an employee")
        employee_query = employee_query.filter(Employee.id == current_user.employee_id)
    employees = employee_query.all()
    month_start = date(date.today().year, date.today().month, 1)
    
    result = []
    for emp in employees:
        monthly_spent = db.query(func.coalesce(func.sum(Receipt.approved_amount), 0.0)).filter(
            Receipt.employee_id == emp.id,
            Receipt.transaction_date >= month_start,
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
def get_policy(current_user: Login = Depends(get_current_user), db: Session = Depends(get_db)):
    """Fetches the active policy configuration JSON (Requires Authentication)."""
    policy = db.query(Policy).filter_by(is_active=True).first()
    if not policy:
        raise HTTPException(status_code=404, detail="No active policy found")
    return {"id": policy.id, "rules": policy.rules}

@app.put("/api/policy")
def update_policy(rules: dict, admin_user: Login = Depends(get_current_user), db: Session = Depends(get_db)):
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
def get_session_data(current_user: Login = Depends(get_current_user), db: Session = Depends(get_db)):
    """Returns processed receipts and spend scoped by employee role (Requires Authentication)."""
    query = db.query(Receipt).order_by(Receipt.created_at.desc())
    if current_user.role not in ["Admin", "Finance"]:
        query = query.filter(Receipt.employee_id == current_user.employee_id)

    receipts = query.all()
    hashes = [r.image_hash for r in receipts if r.image_hash]
    
    month_start = date(date.today().year, date.today().month, 1)
    spend_query = db.query(func.coalesce(func.sum(Receipt.approved_amount), 0.0)).filter(
        Receipt.transaction_date >= month_start,
        Receipt.status.in_(["APPROVED", "PARTIAL", "PENDING_APPROVAL"])
    )
    if current_user.role not in ["Admin", "Finance"]:
        spend_query = spend_query.filter(Receipt.employee_id == current_user.employee_id)

    monthly_spent = spend_query.scalar()

    history = []
    for r in receipts:
        history.append({
            "id": f"rec_{r.id}",
            "city": r.city,
            "category": r.category,
            "client_name": r.client_name or "",
            "submission_channel": r.submission_channel,
            "image_url": f"/uploads/{os.path.basename(r.image_path)}" if r.image_path and os.path.exists(os.path.join(UPLOAD_DIR, os.path.basename(r.image_path))) else None,
            "timestamp": r.created_at.isoformat() if r.created_at else datetime.utcnow().isoformat(),
            "receipt": {
                "vendor": r.vendor or "Unknown",
                "date": str(r.transaction_date) if r.transaction_date else "",
                "total_amount": float(r.original_amount),
                "currency": r.currency or "USD",
                "base_amount_usd": float(r.base_amount_usd),
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
def reset_database(admin_user: Login = Depends(require_admin), db: Session = Depends(get_db)):
    """Wipes all receipts and resets system (Requires Admin/Finance Privileges)."""
    db.query(Receipt).delete()
    db.commit()
    return {"success": True, "message": "All receipt submissions reset by admin"}

@app.get("/api/export-csv")
def export_csv(current_user: Login = Depends(get_current_user), db: Session = Depends(get_db)):
    """Exports receipt reports to CSV scoped by caller privileges (Requires Authentication)."""
    import csv
    import io

    query = db.query(Receipt).order_by(Receipt.created_at.desc())
    if current_user.role not in ["Admin", "Finance"]:
        query = query.filter(Receipt.employee_id == current_user.employee_id)

    receipts = query.all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Date", "Vendor", "Amount", "Currency", "Category", "City", "Status", "Approved Amount", "Flags", "Employee ID"])
    
    for r in receipts:
        flags_str = "; ".join(r.flags) if isinstance(r.flags, list) else str(r.flags or "")
        writer.writerow([
            r.id,
            str(r.transaction_date or ""),
            r.vendor or "",
            float(r.original_amount),
            r.currency or "USD",
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
