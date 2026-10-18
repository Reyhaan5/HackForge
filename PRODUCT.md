# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Employees submitting business expenses and tracking reimbursement decisions.
- Finance or admin reviewers resolving receipts that are flagged or need approval.

## Product Purpose

Receipt Graveyard Resolver is a hackathon demo for submitting expense receipts, extracting their details, checking them against expense rules, and reviewing the resulting reimbursement status. Success means a receipt can be processed into an understandable decision and exceptions can be resolved by a reviewer.

## Positioning

The demo combines receipt image extraction with configurable expense policy checks, duplicate detection, item-level disallowances, currency conversion, and human review of exceptions in one workflow.

## Operating Context

Employees upload receipt images through a web interface and provide context such as city, category, and client. The system extracts receipt details, evaluates policy rules, and records a status, reimbursement amount, flags, and explanation. Finance/admin users can review pending or flagged submissions and inspect aggregate expense analytics. The backend also exposes receipt-processing and policy APIs.

## Capabilities and Constraints

- The frontend is a React application built with Vite; the API is built with FastAPI and stores records in SQLite by default, with a configurable database URL.
- Receipt extraction uses Gemini when a Gemini or Google API key is configured. Receipt images are sent to that cloud model. Without a key, the current implementation returns a fixed synthetic sample receipt for development/demo use; it does not perform local Qwen extraction.
- Policy evaluation supports configurable INR-denominated expense limits, non-reimbursable line items, duplicate detection, approval thresholds, and conversion of receipts in other currencies to INR. Decisions may be approved, partially approved, rejected, or pending approval.
- The repository contains seeded demo employees, accounts, and policy values. Treat these and generated sample receipts as demonstration data, not real customer or company evidence.
- The project is a hackathon demo. Production deployment, authentication/security requirements, receipt retention, and handling of sensitive data have not been established.

## Brand Commitments

- Product name: Receipt Graveyard Resolver; the interface also uses the shorter name Receipt Graveyard.
- The product presents itself as an AI-assisted expense receipt auditing and policy review tool.

## Evidence on Hand

- Runnable application code, API endpoints, seeded demo data, and synthetic receipt examples are present in the repository.
- No verified customer testimonials, real company policy evidence, or production case studies are established. Do not present demo data as real-world evidence.

## Product Principles

- Reduce manual effort in receipt submission and review.
- Make policy flags and reimbursement decisions understandable to employees and reviewers.
- Apply expense rules consistently while keeping exceptions available for human review.
- Treat extracted receipt details as inputs to verification, not as unquestionable truth.
