# Receipt Graveyard Resolver 🧾⚡

[![Python Version](https://img.shields.io/badge/python-3.10%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/license-Apache--2.0-green.svg)](LICENSE)

<p align="center">
  <img src="https://skillicons.dev/icons?i=python,fastapi,postgres,react,vite,tailwind,threejs,aws,docker,git,postman" alt="Tech Stack Logos" />
</p>

An intelligent, multi-channel expense receipt auditor and policy compliance platform. Built with **FastAPI**, **Google Gemini Vision AI**, and **React 19**, Receipt Graveyard Resolver transforms manual receipt handling into an automated pipeline—extracting receipt items, enforcing corporate financial policies, detecting duplicates via perceptual hashing, and routing exceptions for human review.

---

## 📑 Table of Contents

- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Multi-Channel Ingestion Pipeline](#-multi-channel-ingestion-pipeline)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation & Setup](#-installation--setup)
  - [1. Backend Setup](#1-backend-setup)
  - [2. Frontend Setup](#2-frontend-setup)
  - [3. Desktop Auto-Sync Client (Optional)](#3-desktop-auto-sync-client-optional)
- [Configuration & Environment Variables](#-configuration--environment-variables)
- [Running the Application](#-running-the-application)
- [Testing](#-testing)
- [API Reference](#-api-reference)
- [Design System](#-design-system)
- [Contributing](#-contributing)
- [License](#-license)

---

## Video
[<img src="https://youtube.com" width="100%" alt="Watch the video">](https://youtu.be/Y1RQUvaVM5M)


## 🌟 Key Features

- **Multi-Modal Receipt Extraction**: Leverages Google Gemini Vision (`gemini-2.5-flash` / `gemini-1.5-flash`) via `google-genai` and PyMuPDF to extract dates, vendors, line items, taxes, totals, and foreign currencies from images and PDFs.
- **Configurable Policy Engine**: Validates receipts in real time against corporate rules:
  - Category-based budget ceilings (INR-denominated)
  - Disallowance of non-reimbursable items (alcohol, tobacco, personal gifts)
  - Automated foreign exchange conversion (`fx_converter.py`) to base currency
  - Configurable multi-tier approval workflows (Auto-Approved, Partial Approval, Flagged/Pending Review, Rejected)
- **Perceptual Deduplication**: Combines cryptographic SHA-256 hashes with Perceptual Image Hashing (pHash) to detect duplicate submissions across channels, even if the receipt has been re-photographed, cropped, or resized.
- **Multi-Channel Autonomous Ingestion**:
  - **Channel A (Email IMAP)**: Monitors corporate inboxes (e.g. `receipts@company.com`) and ingests attachments automatically.
  - **Channel B (Cloud S3 Storage)**: Background poller monitors AWS S3 buckets (`inbox/{employee_id}/`) for new receipts.
  - **Channel C (Desktop Sync Agent)**: A local watcher that synchronizes receipts dropped into a desktop folder (`~/Desktop/My_Expenses`) to cloud storage.
  - **Channel D (Web Dashboard)**: Direct drag-and-drop web interface with live preview and instant audit decisions.
- **Audit Ledger & Analytics**: Full status management, reviewer feedback loops, aggregate financial metrics, and CSV export.
- **Digital Finance Ledger UI**: Warm, high-precision React 19 interface styled with Tailwind CSS v4, Lucide icons, Recharts, and interactive 3D elements via Three.js / React Three Fiber.

---

## 🏗 System Architecture

```
                  ┌──────────────────────────────────────────────────┐
                  │                 Ingestion Channels               │
                  └─────────┬──────────────────┬─────────────────┬───┘
                            │                  │                 │
                [Channel A: Email IMAP]  [Channel B: S3]  [Web Dashboard]
                            │                  │                 │
                            └─────────┬────────┴─────────────────┘
                                      ▼
                        ┌───────────────────────────┐
                        │   FastAPI Ingestion Hub   │
                        └─────────────┬─────────────┘
                                      ▼
                      ┌───────────────────────────────┐
                      │    Gemini Multimodal Vision   │
                      │  (Item, Tax, FX Extraction)   │
                      └───────────────┬───────────────┘
                                      ▼
                      ┌───────────────────────────────┐
                      │      Deduplication Engine     │
                      │ (SHA-256 + Perceptual pHash)  │
                      └───────────────┬───────────────┘
                                      ▼
                      ┌───────────────────────────────┐
                      │     Layered Policy Engine     │
                      │ (Limits, Disallowances, FX)   │
                      └───────────────┬───────────────┘
                                      ▼
                ┌─────────────────────┴─────────────────────┐
                ▼                                           ▼
      [PostgreSQL / SQLite]                         [Review Dashboard]
 (Audit Trail, Status, Policies)                (Approve, Flag, Reject, Export)
```

---

## 💻 Tech Stack

<p align="center">
  <img src="https://skillicons.dev/icons?i=python,fastapi,postgres,sqlite,react,vite,tailwind,threejs,aws,docker,git,postman" alt="Tech Stack Logos Banner" />
</p>

### Backend
<p align="left">
  <img src="https://img.shields.io/badge/Python_3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Google_Gemini_AI-8E75C2?style=for-the-badge&logo=googlegemini&logoColor=white" alt="Gemini AI" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/SQLAlchemy_2.0-D71F00?style=for-the-badge&logo=sqlalchemy&logoColor=white" alt="SQLAlchemy" />
  <img src="https://img.shields.io/badge/AWS_S3-569A31?style=for-the-badge&logo=amazons3&logoColor=white" alt="AWS S3" />
  <img src="https://img.shields.io/badge/JWT_Auth-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white" alt="JWT" />
</p>

- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.10+) with [Uvicorn](https://www.uvicorn.org/) ASGI server
- **Vision AI**: Google Gemini API (`gemini-2.5-flash` / `gemini-1.5-flash`) via `google-genai`
- **Document & Image Processing**: [PyMuPDF (fitz)](https://pymupdf.readthedocs.io/), [Pillow](https://python-pillow.org/), and [ImageHash](https://github.com/JohannesBuchner/imagehash) for pHash deduplication
- **Database & ORM**: [SQLAlchemy 2.0](https://www.sqlalchemy.org/) supporting PostgreSQL (`psycopg`) and SQLite
- **Autonomous Ingestion**: Boto3 (AWS S3 poller) & Python IMAP4 / MIME email parser

### Frontend
<p align="left">
  <img src="https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite_8-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS v4" />
  <img src="https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=threedotjs&logoColor=white" alt="Three.js" />
  <img src="https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white" alt="Framer Motion" />
  <img src="https://img.shields.io/badge/Lucide_Icons-F56565?style=for-the-badge&logo=lucide&logoColor=white" alt="Lucide" />
  <img src="https://img.shields.io/badge/Recharts-22C55E?style=for-the-badge&logo=chartdotjs&logoColor=white" alt="Recharts" />
</p>

- **Core & Build**: [React 19](https://react.dev/) + [Vite 8](https://vitejs.dev/)
- **Design System & Styling**: [Tailwind CSS v4](https://tailwindcss.com/) following *"The Digital Finance Ledger"* (`DESIGN.md`)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) and [@base-ui/react](https://base-ui.com/)
- **3D Graphics & Animations**: [Three.js](https://threejs.org/), [@react-three/fiber](https://r3f.docs.pmnd.rs/), [Framer Motion](https://www.framer.com/motion/), and [GSAP](https://gsap.com/)
- **Data Visualization & Icons**: [Recharts](https://recharts.org/), [Lucide React](https://lucide.dev/), and [HugeIcons](https://hugeicons.com/)

### Testing & Infrastructure
<p align="left">
  <img src="https://img.shields.io/badge/Selenium-43B02A?style=for-the-badge&logo=selenium&logoColor=white" alt="Selenium" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git&logoColor=white" alt="Git" />
  <img src="https://img.shields.io/badge/Postman-FF6C37?style=for-the-badge&logo=postman&logoColor=white" alt="Postman" />
</p>

---

## ⚙️ Prerequisites

- **Python**: Version 3.10 or higher
- **Node.js**: Version 18.0 or higher (Node 20+ recommended)
- **Package Managers**: `pip` and `npm`
- **Database** *(Optional)*: PostgreSQL (defaults to SQLite if not configured)
- **API Keys**: Google Gemini API key (from [Google AI Studio](https://aistudio.google.com/app/apikey))

---

## 🚀 Installation & Setup

### 1. Backend Setup

1. Navigate to the `Backend` directory:
   ```bash
   cd Backend
   ```

2. Create and activate a virtual environment:
   ```bash
   # Windows (PowerShell)
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # Linux / macOS
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your Google Gemini API key and credentials
   ```

5. Run the FastAPI development server:
   ```bash
   python -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload
   ```
   *The interactive API documentation will be available at `http://127.0.0.1:8000/docs`.*

---

### 2. Frontend Setup

1. Open a new terminal and navigate to the `Frontend` directory:
   ```bash
   cd Frontend
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The web client will launch at `http://localhost:5173`.*

---

### 3. Desktop Auto-Sync Client (Optional)

To automatically watch a local desktop folder and upload incoming expense receipts to the S3 bucket:

1. Ensure AWS credentials and `S3_BUCKET_NAME` are defined in `Backend/.env`.
2. Run the background desktop synchronization script:
   ```bash
   python desktop_sync.py
   ```
3. Drop receipts into `~/Desktop/My_Expenses`. The sync client automatically detects new files, verifies read-readiness, and moves them to `~/Desktop/My_Expenses/Uploaded` upon successful upload.

---

## 🔧 Configuration & Environment Variables

Copy `Backend/.env.example` to `Backend/.env` and update the parameters:

| Variable | Description | Example / Default |
|----------|-------------|-------------------|
| `GEMINI_API_KEY` | Google AI Studio Gemini API key | `AIzaSy...` |
| `GEMINI_MODEL` | Primary vision model | `gemini-2.5-flash` |
| `GEMINI_FALLBACK_MODEL`| Fallback vision model | `gemini-1.5-flash` |
| `DATABASE_URL` | Database connection string | `postgresql://user:pass@localhost:5432/HackForge` |
| `JWT_SECRET` | Secret key for JWT signing | *(Generate using `secrets.token_urlsafe(48)`)* |
| `BASE_CURRENCY` | Base currency for policy conversion | `INR` |
| `HOST` / `PORT` | Backend binding host and port | `0.0.0.0` / `8000` |
| `IMAP_HOST` | IMAP mail server host | `imap.gmail.com` |
| `IMAP_USER` / `IMAP_PASSWORD` | Ingestion mailbox credentials | `receipts@company.com` |
| `AWS_ACCESS_KEY_ID` | AWS IAM access key | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key | `...` |
| `S3_BUCKET_NAME` | AWS S3 ingestion bucket name | `hackforge-expense-vault-prod` |

---

## 🧪 Testing

The repository includes a comprehensive automated test suite covering multi-currency conversions, perceptual deduplication, policy engine rules, and end-to-end FastAPI routes.

To run all automated test suites:

```bash
python test/run_all_tests.py
```

### Test Coverage

1. **FX Currency Engine (`test_fx_currency.py`)**: Tests real-time currency conversion, rate rounding, and fallback handling.
2. **Multi-Channel Deduplication (`test_deduplication.py`)**: Validates exact cryptographic hash checks and perceptual pHash tolerance thresholds.
3. **Layered Policy Engine (`test_policy_engine.py`)**: Validates category budget limits, item disallowances (alcohol/tobacco), and decision classification.
4. **FastAPI Endpoints (`test_api_endpoints.py`)**: Tests authentication, receipt upload, review status updates, and session resets.

---

## 📡 API Reference

Interactive OpenAPI documentation is accessible at `http://127.0.0.1:8000/docs`. Key endpoints include:

### Authentication
- `POST /api/login` & `POST /auth/login`: Authenticate and receive a JWT bearer token.
- `POST /api/register` & `POST /auth/register`: Create a new user profile.

### Receipt Processing & Management
- `POST /api/process-receipt`: Upload and analyze receipt image/PDF with OCR, deduplication, and policy checks.
- `GET /api/receipts`: Fetch all processed receipts with status, policy flags, and employee metadata.
- `PATCH /api/receipts/{receipt_id}/status`: Reviewer action to update decision status (`approved`, `rejected`, `partially_approved`).
- `GET /uploads/{filename}`: Retrieve stored receipt media assets.

### Automated Ingestion
- `POST /api/ingest/email-webhook`: Ingest inbound emails from webhook providers.
- `POST /api/ingest/email/sync`: Trigger manual IMAP mailbox synchronization.
- `POST /api/ingest/s3/sync`: Synchronize pending receipts in S3 inbox.
- `GET /api/ingest/email/status` & `GET /api/ingest/s3/status`: Monitor ingestion health and counts.

### Policy & Administration
- `GET /api/policy`: Retrieve active expense policies, budget caps, and non-reimbursable rules.
- `PUT /api/policy`: Update corporate expense thresholds.
- `GET /api/export-csv`: Export audit records to CSV for accounting and ERP ingestion.

---

## 🎨 Design System

Receipt Graveyard Resolver implements **"The Digital Finance Ledger"** design system:
- **Primary Accent**: Ledger Orange (`#ea580c`) for focal actions and interactive elements.
- **Surfaces**: Paper-like warm neutrals (`#f9fafb`, `#ffffff`) that prioritize legibility for dense financial data.
- **Typography**: [Geist Variable](https://vercel.com/font) for clear tabular figures and scannability.
- **Outcome Colorway**:
  - `Approved`: Emerald Green (`#059669`)
  - `Flagged / Needs Review`: Amber / Warning (`#d97706`)
  - `Rejected / Disallowed`: Crimson / Danger (`#dc2626`)
  - `Information / Ingested`: Sky Blue (`#0284c7`)

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

---

## 📄 License

This project is licensed under the **Apache License 2.0**. See the [LICENSE](LICENSE) file for more details.
