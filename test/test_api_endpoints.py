import os
import sys
import io
from fastapi.testclient import TestClient

# Add Backend to python path
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "Backend"))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app import app
from fixtures import generate_test_images

client = TestClient(app)

def test_api_endpoints():
    print("Testing FastAPI Endpoints End-to-End...")
    
    # 1. Reset database
    res = client.post("/api/reset")
    assert res.status_code == 200
    print("  ✓ /api/reset works")

    # 2. Get Employees (Initial State)
    res = client.get("/api/employees")
    assert res.status_code == 200
    employees = res.json()
    assert len(employees) >= 3
    print(f"  ✓ /api/employees returned {len(employees)} seeded employees")

    # 3. Get Active Policy
    res = client.get("/api/policy")
    assert res.status_code == 200
    policy_data = res.json()
    assert "city_daily_caps" in policy_data["rules"]
    print("  ✓ /api/policy fetched active JSON policy")

    # 4. Generate test images
    images = generate_test_images()

    # 5. Process Receipt via 'email' channel
    print("\n  [Endpoint Test] POST /api/process-receipt via 'email'...")
    with open(images["usd"], "rb") as f:
        response = client.post(
            "/api/process-receipt",
            data={
                "employee_id": "EMP-101",
                "submission_channel": "email",
                "city": "New York",
                "category": "Meals",
                "client_name": "Test Client",
                "attendee_count": 1
            },
            files={"file": ("receipt_normal_usd.jpg", f, "image/jpeg")}
        )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["submission_channel"] == "email"
    assert "approved_amount" in data["decision"]
    print(f"    ✓ Upload successful! Receipt ID: {data['receipt_id']}, Status: {data['decision']['status']}")

    # 6. List Receipts
    res = client.get("/api/receipts?employee_id=EMP-101")
    assert res.status_code == 200
    receipts_list = res.json()
    assert len(receipts_list) >= 1
    first_receipt = receipts_list[0]
    assert first_receipt["submission_channel"] == "email"
    assert "base_amount_usd" in first_receipt
    assert "exchange_rate" in first_receipt
    print(f"    ✓ /api/receipts successfully retrieved list with FX metadata")

    # 7. Verify Employee Monthly Spend Accumulated On-The-Fly
    res = client.get("/api/employees")
    emps = res.json()
    emp_101 = next(e for e in emps if e["id"] == "EMP-101")
    assert emp_101["monthly_spent"] > 0
    assert emp_101["receipts_count"] >= 1
    print(f"    ✓ /api/employees correctly computed on-the-fly monthly spend: ${emp_101['monthly_spent']:.2f}")

    print("\n✓ All API endpoint tests passed!\n")

def run_all():
    print("=" * 60)
    print("RUNNING API ENDPOINT END-TO-END TESTS")
    print("=" * 60)
    test_api_endpoints()
    print("🎉 ALL API ENDPOINT TESTS COMPLETED SUCCESSFULLY!\n")

if __name__ == "__main__":
    run_all()
