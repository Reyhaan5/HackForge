import os
from datetime import datetime
from sqlalchemy import (
    create_engine, Column, Integer, String, Numeric, Date, DateTime, Boolean, ForeignKey, Text
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from dotenv import load_dotenv

ENV_PATH = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(ENV_PATH)
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    db_user = os.getenv("DB_USER", "postgres")
    db_pass = os.getenv("DB_PASSWORD", "postgres")
    db_host = os.getenv("DB_HOST", "localhost")
    db_port = os.getenv("DB_PORT", "5432")
    db_name = os.getenv("DB_NAME", "HackForge")
    DATABASE_URL = f"postgresql://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Employee(Base):
    __tablename__ = "employees"

    id = Column(String(50), primary_key=True)  # e.g., 'EMP-101'
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    department = Column(String(100), nullable=True)

    receipts = relationship("Receipt", back_populates="employee", cascade="all, delete-orphan")

class Policy(Base):
    __tablename__ = "policies"

    id = Column(String(50), primary_key=True)  # e.g., 'DEFAULT-EXPENSE-POLICY'
    is_active = Column(Boolean, default=True)
    rules = Column(JSONB, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Receipt(Base):
    __tablename__ = "receipts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_id = Column(String(50), ForeignKey("employees.id"), nullable=False)
    
    # Ingestion metadata & deduplication
    image_path = Column(Text, nullable=False)
    image_hash = Column(String(64), nullable=False, index=True)
    submission_channel = Column(String(50), default="web", nullable=False, index=True) # 'web', 'email', 'mobile', 'slack', 'api'
    
    # Extracted Receipt Fields
    vendor = Column(String(255), nullable=True)
    transaction_date = Column(Date, nullable=True, index=True)
    category = Column(String(100), default="Meals")
    city = Column(String(100), default="Default")
    attendee_count = Column(Integer, default=1)
    client_name = Column(String(255), nullable=True)
    
    currency = Column(String(10), default="INR")
    original_amount = Column(Numeric(10, 2), default=0.00, nullable=False)
    exchange_rate = Column(Numeric(12, 6), default=1.000000, nullable=False)
    base_amount_inr = Column(Numeric(10, 2), default=0.00, nullable=False)
    
    # Itemized lines in JSONB: [{"description": "Lunch", "amount": 25.0, "disallowed": false}]
    line_items = Column(JSONB, default=list)
    
    # Decision output
    status = Column(String(50), default="APPROVED", index=True) # 'APPROVED', 'PARTIAL', 'PENDING_APPROVAL', 'REJECTED'
    approved_amount = Column(Numeric(10, 2), default=0.00, nullable=False)
    flags = Column(JSONB, default=list)
    explanation = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    employee = relationship("Employee", back_populates="receipts")

class Login(Base):
    __tablename__ = "logins"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="Employee", nullable=False)  # 'Employee', 'Admin', 'Finance'
    employee_id = Column(String(50), ForeignKey("employees.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    employee = relationship("Employee")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Seed default policy if missing
        if not db.query(Policy).filter_by(id="DEFAULT-EXPENSE-POLICY").first():
            default_policy = Policy(
                id="DEFAULT-EXPENSE-POLICY",
                is_active=True,
                rules={
                    "monthly_limit": 167000.0,
                    "approval_threshold": 16700.0,
                    "city_daily_caps": {
                        "New York": 8350.0,
                        "San Francisco": 7515.0,
                        "Chicago": 6263.0,
                        "Austin": 6263.0,
                        "Default": 6263.0
                    },
                    "category_caps": {
                        "Office Supplies": 12525.0,
                        "Transport": 8350.0
                    },
                    "client_meal_per_person_limit": 5010.0,
                    "non_reimbursable_keywords": [
                        "alcohol", "wine", "beer", "liquor", "cocktail",
                        "spa", "massage", "movie", "casino", "gift", "tobacco"
                    ]
                }
            )
            db.add(default_policy)

        # Seed sample employees if missing
        sample_employees = [
            ("EMP-101", "Alice Johnson", "alice.johnson@company.com", "Sales"),
            ("EMP-102", "Bob Smith", "bob.smith@company.com", "Engineering"),
            ("EMP-103", "Carlos Rivera", "carlos.rivera@company.com", "Product")
        ]
        for emp_id, name, email, dept in sample_employees:
            if not db.query(Employee).filter_by(id=emp_id).first():
                db.add(Employee(id=emp_id, name=name, email=email, department=dept))

        # Seed sample logins with secure PBKDF2 hashes
        from auth import hash_password
        sample_logins = [
            ("alice", "password123", "Employee", "EMP-101"),
            ("bob", "password123", "Employee", "EMP-102"),
            ("carlos", "password123", "Employee", "EMP-103"),
            ("admin", "admin123", "Admin", None),
            ("finance", "finance123", "Admin", None),
        ]
        for uname, pwd, r, empid in sample_logins:
            user_entry = db.query(Login).filter_by(username=uname).first()
            if not user_entry:
                db.add(Login(username=uname, password_hash=hash_password(pwd), role=r, employee_id=empid))
            elif not "$" in user_entry.password_hash:
                # Upgrade legacy plaintext password to secure hash
                user_entry.password_hash = hash_password(pwd)
        
        db.commit()
    finally:
        db.close()
