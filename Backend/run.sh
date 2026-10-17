#!/bin/bash
set -e

echo "🚀 Expense Graveyard Policy Engine — Backend Setup"
echo "================================================="

# Venv
if [ ! -d "venv" ]; then
    echo "[1/3] Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate

echo "[2/3] Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "[3/3] Launching FastAPI Backend on port 8000..."
uvicorn app:app --host 0.0.0.0 --port 8000 --reload