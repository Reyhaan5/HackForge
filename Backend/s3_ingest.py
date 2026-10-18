import os
import re
import boto3
from botocore.exceptions import ClientError
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from dotenv import load_dotenv

ENV_PATH = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(ENV_PATH, override=True)
load_dotenv(override=True)

from database import Receipt, Employee
from email_ingest import (
    process_single_receipt_document, 
    resolve_or_create_employee, 
    parse_metadata_from_text,
    is_valid_receipt_attachment
)

def extract_meta_from_s3_key(key: str) -> Dict[str, Any]:
    """
    Extracts employee identifier and metadata tags from S3 object key.
    Examples:
      - 'inbox/EMP-101/lunch.jpg' -> employee: 'EMP-101'
      - 'inbox/sarah.connor@company.com/invoice.pdf' -> employee: 'sarah.connor@company.com'
      - 'inbox/EMP-101_[NYC]_Acme.jpg' -> employee: 'EMP-101', city: 'New York'
    """
    # Remove inbox prefix
    clean_key = re.sub(r'^(inbox|uploads)/', '', key, flags=re.IGNORECASE)
    parts = clean_key.split('/')
    
    employee_hint = "EMP-101"
    filename = parts[-1]
    
    if len(parts) > 1:
        employee_hint = parts[0]
    elif '_' in filename:
        prefix = filename.split('_')[0]
        if prefix.startswith('EMP-') or '@' in prefix:
            employee_hint = prefix

    # Parse metadata hints from filename
    meta = parse_metadata_from_text(subject=filename, body="")
    meta["employee_hint"] = employee_hint
    meta["filename"] = filename
    return meta

class S3BucketPoller:
    """
    Manages AWS S3 Cloud Storage receipt intake, downloading,
    processing via the policy engine, and archiving.
    """
    def __init__(
        self,
        bucket_name: Optional[str] = None,
        region: Optional[str] = None,
        inbox_prefix: str = "inbox/"
    ):
        load_dotenv(ENV_PATH, override=True)
        self.bucket_name = (bucket_name or os.getenv("S3_BUCKET_NAME", "")).strip()
        self.region = (region or os.getenv("AWS_REGION", "us-east-1")).strip()
        self.inbox_prefix = (inbox_prefix or os.getenv("S3_INBOX_PREFIX", "inbox/")).strip()
        if not self.inbox_prefix.endswith('/'):
            self.inbox_prefix += '/'

        self.aws_access_key = os.getenv("AWS_ACCESS_KEY_ID", "").strip()
        self.aws_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY", "").strip()

    def is_configured(self) -> bool:
        return bool(
            self.bucket_name and 
            self.aws_access_key and 
            self.aws_secret_key and
            "your_aws" not in self.aws_access_key.lower() and
            "your_bucket" not in self.bucket_name.lower()
        )

    def get_client(self):
        if not self.is_configured():
            return None
        return boto3.client(
            "s3",
            region_name=self.region,
            aws_access_key_id=self.aws_access_key,
            aws_secret_access_key=self.aws_secret_key
        )

    def check_bucket_connection(self) -> Dict[str, Any]:
        """Checks if the configured S3 bucket exists and is accessible."""
        if not self.is_configured():
            return {
                "configured": False,
                "connected": False,
                "error": "AWS credentials (AWS_ACCESS_KEY_ID / S3_BUCKET_NAME) not configured in .env."
            }

        client = self.get_client()
        try:
            client.head_bucket(Bucket=self.bucket_name)
            return {
                "configured": True,
                "connected": True,
                "bucket": self.bucket_name,
                "region": self.region,
                "inbox_prefix": self.inbox_prefix
            }
        except ClientError as e:
            return {
                "configured": True,
                "connected": False,
                "bucket": self.bucket_name,
                "error": str(e)
            }

    def sync_inbox(self, db: Session, max_files: int = 10) -> Dict[str, Any]:
        """
        Scans s3://<bucket>/inbox/, streams incoming receipts,
        processes each through the Gemini + Policy Engine pipeline,
        and moves processed objects to processed/ or quarantine/.
        """
        if not self.is_configured():
            return {
                "success": False,
                "error": "S3 credentials not configured in environment (S3_BUCKET_NAME or AWS_ACCESS_KEY_ID missing)."
            }

        client = self.get_client()
        ingested = []
        skipped = []

        try:
            # 1. List objects in inbox/
            response = client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=self.inbox_prefix,
                MaxKeys=max_files
            )

            contents = response.get("Contents", [])
            # Filter out directory placeholders
            objects_to_process = [obj for obj in contents if not obj["Key"].endswith('/')]

            if not objects_to_process:
                return {
                    "success": True,
                    "message": f"S3 inbox ({self.inbox_prefix}) is clear. No new receipts found.",
                    "files_scanned": 0,
                    "receipts_created": 0
                }

            for obj in objects_to_process:
                key = obj["Key"]
                filename = os.path.basename(key)
                
                # Download object stream into memory
                obj_res = client.get_object(Bucket=self.bucket_name, Key=key)
                file_bytes = obj_res["Body"].read()

                # Validate document
                is_valid, reason = is_valid_receipt_attachment(filename, file_bytes)
                if not is_valid:
                    skipped.append({"key": key, "reason": reason})
                    continue

                # Parse metadata & employee identity
                key_meta = extract_meta_from_s3_key(key)
                emp_hint = key_meta["employee_hint"]
                
                if "@" in emp_hint:
                    emp = resolve_or_create_employee(db, emp_hint)
                    emp_id = emp.id
                else:
                    emp_id = emp_hint

                # Process through pipeline
                try:
                    res = process_single_receipt_document(
                        db=db,
                        file_bytes=file_bytes,
                        original_filename=filename,
                        employee_id=emp_id,
                        submission_channel="s3",
                        city=key_meta["city"],
                        category=key_meta["category"],
                        client_name=key_meta["client_name"],
                        attendee_count=key_meta["attendee_count"]
                    )
                    ingested.append(res)

                    # Move file from inbox/ to processed/ or quarantine/
                    target_folder = "processed/" if res["status"] in ["APPROVED", "PARTIAL"] else "quarantine/"
                    target_key = f"{target_folder}{emp_id}_{filename}"

                    try:
                        import urllib.parse
                        copy_source = f"{self.bucket_name}/{urllib.parse.quote(key)}"
                        client.copy_object(
                            Bucket=self.bucket_name,
                            CopySource=copy_source,
                            Key=target_key
                        )
                        client.delete_object(Bucket=self.bucket_name, Key=key)
                        print(f"[S3Ingest] Ingested #{res['receipt_id']} and moved {key} -> {target_key}")
                    except Exception as move_err:
                        print(f"[S3Ingest] Ingested #{res['receipt_id']}, but archive move note: {move_err}")

                except Exception as proc_err:
                    skipped.append({"key": key, "reason": f"Processing error: {str(proc_err)}"})

            return {
                "success": True,
                "message": f"Polled S3 bucket '{self.bucket_name}'. Successfully ingested {len(ingested)} receipts.",
                "files_scanned": len(objects_to_process),
                "receipts_created": len(ingested),
                "receipts": ingested,
                "skipped": skipped
            }

        except Exception as e:
            return {
                "success": False,
                "error": f"S3 sync failed: {str(e)}"
            }
