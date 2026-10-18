import os
import time
import shutil
import boto3
from dotenv import load_dotenv

# Load AWS configuration from Backend/.env
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(BASE_DIR, "Backend", ".env")
load_dotenv(ENV_PATH, override=True)

AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION", "ap-southeast-2")
BUCKET_NAME = os.getenv("S3_BUCKET_NAME", "hackforge-expense-vault-prod")
EMPLOYEE_ID = os.getenv("DEFAULT_EMPLOYEE_ID", "EMP-101")

# Desktop sync directory
WATCH_DIR = os.path.join(os.path.expanduser("~"), "Desktop", "My_Expenses")
UPLOADED_DIR = os.path.join(WATCH_DIR, "Uploaded")
os.makedirs(WATCH_DIR, exist_ok=True)
os.makedirs(UPLOADED_DIR, exist_ok=True)

SUPPORTED_EXTS = {".pdf", ".png", ".jpg", ".jpeg", ".webp"}

def get_s3_client():
    if not AWS_ACCESS_KEY or not AWS_SECRET_KEY or not BUCKET_NAME:
        print("[DesktopSync] AWS credentials or bucket name missing in Backend/.env")
        return None
    return boto3.client(
        "s3",
        aws_access_key_id=AWS_ACCESS_KEY,
        aws_secret_access_key=AWS_SECRET_KEY,
        region_name=AWS_REGION
    )

def sync_once(s3_client):
    """Scans the desktop folder and uploads any pending receipts to S3."""
    items = [f for f in os.listdir(WATCH_DIR) if os.path.isfile(os.path.join(WATCH_DIR, f))]
    
    for filename in items:
        ext = os.path.splitext(filename)[1].lower()
        if ext not in SUPPORTED_EXTS:
            continue

        file_path = os.path.join(WATCH_DIR, filename)
        
        # Check if file is still being written to
        try:
            with open(file_path, "rb") as f:
                pass
        except IOError:
            continue

        # S3 target key: inbox/EMP-101/<filename>
        s3_key = f"inbox/{EMPLOYEE_ID}/{filename}"
        print(f"[DesktopSync] Detected new receipt: '{filename}'")
        print(f"[DesktopSync] Uploading to s3://{BUCKET_NAME}/{s3_key} ...")

        try:
            s3_client.upload_file(file_path, BUCKET_NAME, s3_key)
            print(f"[DesktopSync] Upload complete: s3://{BUCKET_NAME}/{s3_key}")
            
            # Move local file to 'Uploaded/' archive subfolder
            dest_path = os.path.join(UPLOADED_DIR, filename)
            # Avoid overwrite collision if file with same name exists
            if os.path.exists(dest_path):
                dest_path = os.path.join(UPLOADED_DIR, f"{int(time.time())}_{filename}")
            shutil.move(file_path, dest_path)
            print(f"[DesktopSync] Moved locally to: {dest_path}\n")

        except Exception as e:
            print(f"[DesktopSync] Error uploading '{filename}' to S3: {e}")

def start_watching(poll_interval: int = 5):
    print("=" * 60)
    print("  HACKFORGE DESKTOP RECEIPT SYNC AGENT")
    print(f"  Watching: {WATCH_DIR}")
    print(f"  Target:   s3://{BUCKET_NAME}/inbox/{EMPLOYEE_ID}/")
    print(f"  Interval: Every {poll_interval} seconds")
    print("=" * 60)
    print("Drop any receipt (.jpg, .png, .pdf) into your 'My_Expenses' desktop folder!\n")

    s3_client = get_s3_client()
    if not s3_client:
        print("[DesktopSync] Could not initialize S3 client. Exiting.")
        return

    while True:
        try:
            sync_once(s3_client)
        except Exception as err:
            print(f"[DesktopSync] Loop error: {err}")
        time.sleep(poll_interval)

if __name__ == "__main__":
    start_watching()
