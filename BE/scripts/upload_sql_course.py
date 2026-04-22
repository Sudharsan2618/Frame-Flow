"""
SQL Course Asset Upload Script
================================
Uploads all SQL course video files (.mp4), PDFs, and study materials
from the local folder to Google Cloud Storage.

Usage:
    python -m scripts.upload_sql_course

Prerequisites:
    1. GCP service account key JSON file
    2. GOOGLE_APPLICATION_CREDENTIALS set in .env
    3. GCS_PROJECT_ID and GCS_BUCKET_NAME set in .env
    4. SQL course folder at the expected path
"""

import sys
import os
import mimetypes

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from google.cloud import storage
from google.oauth2 import service_account
from app.config import settings

# ── Path to the SQL course folder ──
SQL_COURSE_ROOT = r"C:\Users\WELCOME\Downloads\IC Leaf - SQL Course-20260213T123427Z-1-002\IC Leaf - SQL Course"

# ── GCS destination prefix ──
GCS_PREFIX = "courses/sql-masterclass"


def get_client():
    """Create a GCS client using the service account key file."""
    creds_path = settings.GOOGLE_APPLICATION_CREDENTIALS
    if creds_path and os.path.isfile(creds_path):
        credentials = service_account.Credentials.from_service_account_file(creds_path)
        return storage.Client(project=settings.GCS_PROJECT_ID, credentials=credentials)
    return storage.Client(project=settings.GCS_PROJECT_ID)


def upload_file(bucket, local_path: str, gcs_blob_name: str) -> str:
    """Upload a single file to GCS and return the public URL."""
    blob = bucket.blob(gcs_blob_name)

    # Detect content type
    content_type, _ = mimetypes.guess_type(local_path)
    if not content_type:
        ext = os.path.splitext(local_path)[1].lower()
        content_type = {
            ".mp4": "video/mp4",
            ".pdf": "application/pdf",
            ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        }.get(ext, "application/octet-stream")

    file_size = os.path.getsize(local_path)
    size_mb = file_size / (1024 * 1024)

    print(f"  Uploading: {os.path.basename(local_path)} ({size_mb:.1f} MB) -> {gcs_blob_name}")

    blob.upload_from_filename(local_path, content_type=content_type)

    try:
        blob.make_public()
    except Exception:
        pass  # Bucket-level IAM may already handle this

    url = f"https://storage.googleapis.com/{settings.GCS_BUCKET_NAME}/{gcs_blob_name}"
    return url


def sanitize_name(name: str) -> str:
    """Sanitize a filename for GCS blob name — keep alphanumeric, dots, hyphens, underscores."""
    return "".join(c if c.isalnum() or c in (".", "-", "_") else "_" for c in name)


def upload_all():
    """Upload all SQL course assets to GCS."""
    print(f"[SQL COURSE] Uploading assets to GCS bucket: {settings.GCS_BUCKET_NAME}")
    print(f"             Source: {SQL_COURSE_ROOT}")
    print(f"             Prefix: {GCS_PREFIX}/")
    print()

    if not os.path.isdir(SQL_COURSE_ROOT):
        print(f"[ERROR] Source folder not found: {SQL_COURSE_ROOT}")
        return

    client = get_client()
    bucket = client.bucket(settings.GCS_BUCKET_NAME)

    uploaded = {}  # Maps "module/filename" -> GCS URL for reference
    stats = {"videos": 0, "pdfs": 0, "docs": 0, "total_mb": 0}

    # ── Module folders (numbered 1-7) ──
    module_folders = [
        "1. Module_ Introduction to RDBMS Concepts",
        "2. Basics of SQL",
        "3. Advanced Queries",
        "4. OLAP ,OLTP and Recursion",
        "5. Relational Database",
        "6. Databases_ Index, transactions, Constraints, triggers, views, Authorization",
        "7. NoSQL",
    ]

    module_slugs = [
        "mod1-intro-rdbms",
        "mod2-basics-sql",
        "mod3-advanced-queries",
        "mod4-olap-oltp-recursion",
        "mod5-relational-database",
        "mod6-indexes-transactions",
        "mod7-nosql",
    ]

    for folder_name, mod_slug in zip(module_folders, module_slugs):
        folder_path = os.path.join(SQL_COURSE_ROOT, folder_name)
        if not os.path.isdir(folder_path):
            print(f"[WARN] Folder not found: {folder_name}")
            continue

        print(f"[MODULE] {folder_name}")

        # Walk all files in this module folder (recursively)
        for root, dirs, files in os.walk(folder_path):
            for fname in sorted(files):
                local_path = os.path.join(root, fname)
                ext = os.path.splitext(fname)[1].lower()

                if ext == ".mp4":
                    subfolder = "videos"
                    stats["videos"] += 1
                elif ext == ".pdf":
                    subfolder = "materials"
                    stats["pdfs"] += 1
                elif ext in (".docx", ".pptx"):
                    subfolder = "documents"
                    stats["docs"] += 1
                else:
                    continue  # Skip unknown file types

                safe_name = sanitize_name(fname)
                gcs_path = f"{GCS_PREFIX}/{mod_slug}/{subfolder}/{safe_name}"

                file_size = os.path.getsize(local_path)
                stats["total_mb"] += file_size / (1024 * 1024)

                url = upload_file(bucket, local_path, gcs_path)
                key = f"{mod_slug}/{subfolder}/{safe_name}"
                uploaded[key] = url

    # ── Study Materials ──
    study_path = os.path.join(SQL_COURSE_ROOT, "STUDY MATERIALS")
    if os.path.isdir(study_path):
        print(f"\n[STUDY MATERIALS]")
        for fname in sorted(os.listdir(study_path)):
            local_path = os.path.join(study_path, fname)
            if not os.path.isfile(local_path):
                continue
            ext = os.path.splitext(fname)[1].lower()
            if ext not in (".docx", ".pptx", ".pdf"):
                continue

            safe_name = sanitize_name(fname)
            gcs_path = f"{GCS_PREFIX}/study-materials/{safe_name}"

            file_size = os.path.getsize(local_path)
            stats["total_mb"] += file_size / (1024 * 1024)
            stats["docs"] += 1

            url = upload_file(bucket, local_path, gcs_path)
            uploaded[f"study-materials/{safe_name}"] = url

    # ── Extra Assignments ──
    assignments_path = os.path.join(SQL_COURSE_ROOT, "Extra Assignments")
    if os.path.isdir(assignments_path):
        print(f"\n[EXTRA ASSIGNMENTS]")
        for fname in sorted(os.listdir(assignments_path)):
            local_path = os.path.join(assignments_path, fname)
            if not os.path.isfile(local_path):
                continue

            safe_name = sanitize_name(fname)
            gcs_path = f"{GCS_PREFIX}/assignments/{safe_name}"

            file_size = os.path.getsize(local_path)
            stats["total_mb"] += file_size / (1024 * 1024)
            stats["docs"] += 1

            url = upload_file(bucket, local_path, gcs_path)
            uploaded[f"assignments/{safe_name}"] = url

    # ── Summary ──
    print()
    print("=" * 60)
    print("[DONE] SQL Course Upload Complete!")
    print(f"   Videos:    {stats['videos']} files")
    print(f"   PDFs:      {stats['pdfs']} files")
    print(f"   Documents: {stats['docs']} files")
    print(f"   Total:     {stats['total_mb']:.1f} MB uploaded")
    print()

    # Print URL manifest for use in seed script
    print("=" * 60)
    print("GCS URL Manifest (for seed_sql_course.py):")
    print("=" * 60)
    for key, url in sorted(uploaded.items()):
        print(f"  {key}")
        print(f"    -> {url}")
    print()


if __name__ == "__main__":
    upload_all()
