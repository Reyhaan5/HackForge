from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import tempfile
import os
from extractor import extract_receipt
from policy_engine import validate_receipt, compute_hash

app = FastAPI(title="Receipt Graveyard Resolver API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session store
session_store = {
    "processed_hashes": [],
    "monthly_spent": 0.0,
    "history": []
}

@app.post("/api/process-receipt")
async def process_receipt(
    file: UploadFile = File(...),
    city: str = Form("New York"),
    category: str = Form("Meals"),
    client_name: str = Form("")
):
    print(f"\n📥 Received request: {file.filename} | City: {city} | Category: {category}")
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name
        
        print("🤖 Running AI extraction...")
        extracted = extract_receipt(tmp_path)
        print(f"✅ Extracted: {extracted.vendor} - ${extracted.total_amount}")
        
        print("⚖️ Running policy validation...")
        result = validate_receipt(
            extracted, city, session_store["monthly_spent"], category, client_name, session_store["processed_hashes"]
        )
        
        session_store["processed_hashes"].append(compute_hash(extracted))
        if result.status in ["APPROVED", "PENDING_APPROVAL"]:
            session_store["monthly_spent"] += result.reimbursement_amount
        
        session_store["history"].append({
            "receipt": extracted.model_dump(),
            "result": {"status": result.status, "flags": result.flags, "reimbursement_amount": result.reimbursement_amount}
        })
        
        return JSONResponse(content={
            "success": True,
            "extracted": extracted.model_dump(),
            "validation": {"status": result.status, "flags": result.flags, "reimbursement_amount": result.reimbursement_amount},
            "session": {"monthly_spent": session_store["monthly_spent"], "receipts_processed": len(session_store["history"])}
        })
    
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

@app.get("/api/session")
async def get_session():
    return session_store

@app.post("/api/reset-session")
async def reset_session():
    session_store["processed_hashes"] = []
    session_store["monthly_spent"] = 0.0
    session_store["history"] = []
    return {"success": True, "message": "Session reset"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)