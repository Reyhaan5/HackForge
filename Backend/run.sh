#!/bin/bash
set -e

echo "🪦 Receipt Graveyard Resolver — Arch Linux Setup"
echo "================================================="

# System deps
echo "[1/4] Installing system dependencies..."
sudo pacman -S --needed --noconfirm python python-pip python-virtualenv \
    cuda cudnn python-pytorch-opt-cuda git

# Venv
echo "[2/4] Creating virtual environment..."
python -m venv venv
source venv/bin/activate

echo "[3/4] Installing Python packages..."
pip install --upgrade pip
pip install -r requirements.txt

echo "[4/4] Launching Streamlit..."
echo ""
echo "✅ App will open at http://localhost:8501"
echo "   First run will download ~4.5GB model (one-time)"
echo ""
streamlit run app.py