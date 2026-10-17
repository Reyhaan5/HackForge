-- PostgreSQL Schema for Expense Management System
-- Drop tables if they exist (for clean migrations)
DROP TABLE IF EXISTS logins CASCADE;
DROP TABLE IF EXISTS receipts CASCADE;
DROP TABLE IF EXISTS policies CASCADE;
DROP TABLE IF EXISTS employees CASCADE;

-- 1. Employees Table
CREATE TABLE employees (
    id VARCHAR(50) PRIMARY KEY,              -- e.g. 'EMP-001'
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    department VARCHAR(100)
);

-- 2. Policies Table (Stores layered rules directly in JSONB)
CREATE TABLE policies (
    id VARCHAR(50) PRIMARY KEY,              -- e.g. 'CORP-POLICY-2026'
    is_active BOOLEAN DEFAULT TRUE,
    rules JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Receipts Table (Core Ingestion, Extraction, and Decision)
CREATE TABLE receipts (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    
    -- Ingestion metadata & deduplication
    image_path TEXT NOT NULL,
    image_hash VARCHAR(64) NOT NULL,         -- Perceptual pHash or content hash
    submission_channel VARCHAR(50) NOT NULL DEFAULT 'web', -- 'web', 'email', 'mobile', 'slack', 'api'
    
    -- Extracted Receipt Fields
    vendor VARCHAR(255),
    transaction_date DATE,
    category VARCHAR(100) DEFAULT 'Meals',   -- 'Meals', 'Lodging', 'Transport', 'Office Supplies'
    city VARCHAR(100) DEFAULT 'Default',
    attendee_count INTEGER DEFAULT 1,        -- For client entertainment & attendee verification
    client_name VARCHAR(255),                -- Mandatory if client lunch/dinner
    
    currency VARCHAR(10) DEFAULT 'USD',
    original_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    exchange_rate NUMERIC(12, 6) NOT NULL DEFAULT 1.000000,
    base_amount_usd NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    
    -- Itemized breakdown in JSONB:
    -- [{"description": "Cheeseburger", "amount": 16.50}, {"description": "IPA Beer", "amount": 8.00, "disallowed": true}]
    line_items JSONB DEFAULT '[]'::jsonb,
    
    -- Decision & Policy Audit Output
    status VARCHAR(50) NOT NULL DEFAULT 'APPROVED', -- 'APPROVED', 'PARTIAL', 'PENDING_APPROVAL', 'REJECTED'
    approved_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    flags JSONB DEFAULT '[]'::jsonb,                -- Array of policy violation/warning strings
    explanation TEXT,                               -- Plain-text decision explanation for employee & finance
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for high performance on-the-fly calculations & deduplication
CREATE INDEX idx_receipts_employee_date ON receipts(employee_id, transaction_date);
CREATE INDEX idx_receipts_image_hash ON receipts(image_hash);
CREATE INDEX idx_receipts_channel ON receipts(submission_channel);
CREATE INDEX idx_receipts_status ON receipts(status);

-- Seed Initial Default Policy
INSERT INTO policies (id, is_active, rules) VALUES (
    'DEFAULT-EXPENSE-POLICY',
    TRUE,
    '{
        "monthly_limit": 2000.0,
        "approval_threshold": 200.0,
        "city_daily_caps": {
            "New York": 100.0,
            "San Francisco": 90.0,
            "Chicago": 75.0,
            "Austin": 75.0,
            "Default": 75.0
        },
        "category_caps": {
            "Meals": 100.0,
            "Office Supplies": 150.0,
            "Transport": 100.0
        },
        "client_meal_per_person_limit": 60.0,
        "non_reimbursable_keywords": [
            "alcohol", "wine", "beer", "liquor", "cocktail", 
            "spa", "massage", "movie", "casino", "gift", "tobacco"
        ]
    }'::jsonb
);

-- Seed Sample Employees
INSERT INTO employees (id, name, email, department) VALUES
    ('EMP-101', 'Alice Johnson', 'alice.johnson@company.com', 'Sales'),
    ('EMP-102', 'Bob Smith', 'bob.smith@company.com', 'Engineering'),
    ('EMP-103', 'Carlos Rivera', 'carlos.rivera@company.com', 'Product')
ON CONFLICT (id) DO NOTHING;

-- 4. Logins Table (Authentication & Role Verification)
CREATE TABLE logins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'Employee', -- 'Employee', 'Admin', 'Finance'
    employee_id VARCHAR(50) REFERENCES employees(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_logins_username ON logins(username);

-- Seed Default Logins (Linked to Sample Employees & Admin)
INSERT INTO logins (username, password_hash, role, employee_id) VALUES
    ('alice', 'password123', 'Employee', 'EMP-101'),
    ('bob', 'password123', 'Employee', 'EMP-102'),
    ('carlos', 'password123', 'Employee', 'EMP-103'),
    ('admin', 'admin123', 'Admin', NULL),
    ('finance', 'finance123', 'Admin', NULL)
ON CONFLICT (username) DO NOTHING;

