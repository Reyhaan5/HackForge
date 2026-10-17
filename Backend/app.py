from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date
import tempfile
import os
import shutil

from database import init_db, get_db, Receipt, Employee, Policy
from extractor import extract_receipt, compute_image_hash
from policy_engine import validate_receipt

app = FastAPI(title="Expense Graveyard Policy Engine API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create uploads storage folder
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.on_event("startup")
def startup_event():
    init_db()
    print("🚀 Database initialized and ready.")

@app.post("/api/process-receipt")
async def process_receipt(
    file: UploadFile = File(...),
    employee_id: str = Form("EMP-101"),
    submission_channel: str = Form("web"), # 'web', 'email', 'mobile', 'slack', 'api'
    city: str = Form("New York"),
    category: str = Form("Meals"),
    client_name: str = Form(""),
    attendee_count: int = Form(1),
    db: Session = Depends(get_db)
):
    """
    Ingests and validates a receipt from any submission channel (web, email, mobile, slack, api).
    Extracts structured data using a cloud model, enforces layered policies, and stores results.
    """
    print(f"\n📥 Ingesting receipt: {file.filename} | Employee: {employee_id} | Channel: {submission_channel} | City: {city}")

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
            currency=extracted.currency,
            original_amount=extracted.total_amount,
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
            "submission_channel": submission_channel,
            "extracted": extracted.model_dump(),
            "decision": {
                "status": decision.status,
                "requested_amount": extracted.total_amount,
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
        print(f"❌ Error processing receipt: {str(e)}")
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

@app.get("/api/receipts")
def list_receipts(
    employee_id: str = Query(None),
    submission_channel: str = Query(None),
    status: str = Query(None),
    db: Session = Depends(get_db)
):
    """Lists receipts with on-the-fly filtering by employee, channel, or status."""
    query = db.query(Receipt)
    if employee_id:
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
            "approved_amount": float(r.approved_amount),
            "status": r.status,
            "flags": r.flags,
            "explanation": r.explanation,
            "line_items": r.line_items,
            "created_at": r.created_at.isoformat() if r.created_at else None
        }
        for r in receipts
    ]

@app.get("/api/employees")
def list_employees(db: Session = Depends(get_db)):
    """Returns employees with on-the-fly monthly spend calculations."""
    employees = db.query(Employee).all()
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
def get_policy(db: Session = Depends(get_db)):
    """Fetches the active policy configuration JSON."""
    policy = db.query(Policy).filter_by(is_active=True).first()
    if not policy:
        raise HTTPException(status_code=404, detail="No active policy found")
    return {"id": policy.id, "rules": policy.rules}

@app.put("/api/policy")
def update_policy(rules: dict, db: Session = Depends(get_db)):
    """Updates the active policy rules JSON."""
    policy = db.query(Policy).filter_by(is_active=True).first()
    if not policy:
        policy = Policy(id="DEFAULT-EXPENSE-POLICY", is_active=True, rules=rules)
        db.add(policy)
    else:
        policy.rules = rules
    db.commit()
    return {"success": True, "message": "Policy updated successfully", "rules": policy.rules}

@app.post("/api/reset")
def reset_database(db: Session = Depends(get_db)):
    """Wipes all receipts and resets for testing."""
    db.query(Receipt).delete()
    db.commit()
    return {"success": True, "message": "All receipt submissions reset"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
