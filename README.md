#  Receipt Graveyard Resolver - Backend

An AI-powered expense receipt auditor that runs 100% locally on an NVIDIA RTX 5050. Built with FastAPI and the Qwen2-VL-2B Vision-Language Model.

## ️ Prerequisites
- **Python 3.10 or higher**
- **NVIDIA RTX 5050 GPU** (Ensure your NVIDIA drivers are up to date)
- **Windows 10 / 11**

## 🚀 Setup & Installation (Windows)

### 1. Create and Activate Virtual Environment
Open **Command Prompt (cmd)** or **PowerShell** inside this `Backend` folder and run:

```cmd
cd Backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app:app --app-dir Backend --host 127.0.0.1 --port 8000 --reload
```