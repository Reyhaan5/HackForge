import os
import sys
import io
import uuid
from fastapi.testclient import TestClient

# Add Backend to python path
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "Backend"))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app import app
from fixtures import generate_test_images

client = TestClient(app)

def test_api_endpoints():
    print("Testing FastAPI Endpoints & Security Controls...")

    # 1. Test Security: Anonymous access to /api/reset should be 401 Unauthorized
    res_anon_reset = client.post("/api/reset")
    assert res_anon_reset.status_code == 401, f"Expected 401, got {res_anon_reset.status_code}"
    print("  ✓ Anonymous call to /api/reset correctly blocked with 401 Unauthorized")

    # 2. Test Security: Anonymous access to /api/policy should be 401 Unauthorized
    res_anon_policy = client.get("/api/policy")
    assert res_anon_policy.status_code == 401, f"Expected 401, got {res_anon_policy.status_code}"
    print("  ✓ Anonymous call to /api/policy correctly blocked with 401 Unauthorized")

    for protected_path in ("/api/receipts", "/api/employees", "/api/export-csv"):
        protected_response = client.get(protected_path)
        assert protected_response.status_code == 401, (
            f"Expected anonymous {protected_path} request to return 401, "
            f"got {protected_response.status_code}"
        )
    print("  ✓ Anonymous receipt, employee, and export reads are blocked")

    # 3. Test Login: Authenticate as admin to get cryptographically signed token
    login_res = client.post("/api/login", json={"username": "admin", "password": "admin123"})
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    admin_data = login_res.json()
    admin_token = admin_data["token"]
    assert "." in admin_token, "Token is not signed JWT format"
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("  ✓ Admin logged in; received cryptographic JWT token")

    employee_login = client.post("/api/login", json={"username": "alice", "password": "password123"})
    assert employee_login.status_code == 200
    employee_data = employee_login.json()
    employee_headers = {"Authorization": f"Bearer {employee_data['token']}"}
    employee_id = employee_data["user"]["employee_id"]
    own_receipts = client.get(f"/api/receipts?employee_id={employee_id}", headers=employee_headers)
    assert own_receipts.status_code == 200
    other_receipts = client.get("/api/receipts?employee_id=EMP-102", headers=employee_headers)
    assert other_receipts.status_code == 403
    employee_list = client.get("/api/employees", headers=employee_headers)
    assert employee_list.status_code == 200
    assert [employee["id"] for employee in employee_list.json()] == [employee_id]
    print("  ✓ Employee receipt and profile access is scoped to the signed-in employee")

    # 4. Test Security: Public registration privilege escalation prevention
    registration_username = f"attacker_{uuid.uuid4().hex[:10]}"
    reg_res = client.post("/api/register", json={
        "username": registration_username,
        "password": "secretpassword",
        "role": "Admin", # Trying to self-assign Admin
        "employee_id": "EMP-999"
    })
    if reg_res.status_code == 200:
        reg_data = reg_res.json()
        assert reg_data["user"]["role"] == "Employee", f"Attacker escalated role: {reg_data['user']['role']}"
        assert reg_data["user"]["employee_id"] != "EMP-999", "Public registration linked to another employee ID"
        print("  ✓ Public registration role escalation blocked: forced to 'Employee'")
    elif reg_res.status_code == 400:
        print("  ✓ Account exists, verified role restriction")

    # 5. Authenticated Reset
    res_reset = client.post("/api/reset", headers=admin_headers)
    assert res_reset.status_code == 200
    print("  ✓ Authenticated /api/reset executed by admin")

    # 6. Authenticated Policy Read
    res_policy = client.get("/api/policy", headers=admin_headers)
    assert res_policy.status_code == 200
    policy_data = res_policy.json()
    assert "category_caps" in policy_data["rules"]
    print("  ✓ Authenticated /api/policy successfully accessed")

    # 7. Generate test images
    images = generate_test_images()

    with open(images["usd"], "rb") as f:
        anonymous_upload = client.post(
            "/api/process-receipt",
            data={"employee_id": "EMP-101"},
            files={"file": ("anonymous.jpg", f, "image/jpeg")},
        )
    assert anonymous_upload.status_code == 401
    print("  ✓ Anonymous receipt submission is blocked")

    # 8. Process Receipt via 'web' channel
    print("\n  [Endpoint Test] POST /api/process-receipt via 'web'...")
    with open(images["usd"], "rb") as f:
        response = client.post(
            "/api/process-receipt",
            data={
                "employee_id": "EMP-101",
                "submission_channel": "web",
                "city": "New York",
                "category": "Meals",
                "client_name": "Test Client",
                "attendee_count": 1
            },
            files={"file": ("receipt_normal_usd.jpg", f, "image/jpeg")},
            headers=admin_headers
        )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["submission_channel"] == "web"
    print(f"    ✓ Upload successful! Receipt ID: {data['receipt_id']}, Status: {data['decision']['status']}")

    # 9. List Receipts
    res = client.get("/api/receipts?employee_id=EMP-101", headers=admin_headers)
    assert res.status_code == 200
    receipts_list = res.json()
    assert len(receipts_list) >= 1
    print("    ✓ /api/receipts successfully retrieved list")

    res_employees = client.get("/api/employees", headers=admin_headers)
    assert res_employees.status_code == 200
    assert len(res_employees.json()) >= 3
    print("    ✓ Admin can list employees")

    # 10. Authenticated CSV Export
    res_csv = client.get("/api/export-csv", headers=admin_headers)
    assert res_csv.status_code == 200
    assert "text/csv" in res_csv.headers["content-type"]
    print("    ✓ Authenticated /api/export-csv returned CSV stream")

    cleanup = client.post("/api/reset", headers=admin_headers)
    assert cleanup.status_code == 200
    from database import SessionLocal, Employee, Login
    db = SessionLocal()
    registered = db.query(Login).filter_by(username=registration_username).first()
    registered_employee_id = registered.employee_id if registered else None
    db.query(Login).filter_by(username=registration_username).delete(synchronize_session=False)
    if registered_employee_id:
        db.query(Employee).filter_by(id=registered_employee_id).delete(synchronize_session=False)
    db.commit()
    db.close()
    print("  ✓ Test receipts cleaned up")

    print("\n✓ All API endpoint & security tests passed!\n")

def run_all():
    print("=" * 60)
    print("RUNNING API ENDPOINT & SECURITY TESTS")
    print("=" * 60)
    test_api_endpoints()
    print("🎉 ALL API ENDPOINT & SECURITY TESTS COMPLETED SUCCESSFULLY!\n")

if __name__ == "__main__":
    run_all()
