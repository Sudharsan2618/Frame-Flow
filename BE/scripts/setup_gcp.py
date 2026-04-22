"""
GCP Cloud Storage Setup Script
===============================
Run this ONCE to create the GCS bucket and configure it.

Usage:
    python -m scripts.setup_gcp

Prerequisites:
    1. GCP service account key JSON file
    2. GOOGLE_APPLICATION_CREDENTIALS set in .env
    3. GCS_PROJECT_ID and GCS_BUCKET_NAME set in .env
"""

import sys
import os

# Add parent dir to path so we can import app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from google.cloud import storage
from google.oauth2 import service_account
from app.config import settings


def get_client():
    """Create a GCS client using the service account key file."""
    creds_path = settings.GOOGLE_APPLICATION_CREDENTIALS
    if creds_path and os.path.isfile(creds_path):
        credentials = service_account.Credentials.from_service_account_file(creds_path)
        return storage.Client(project=settings.GCS_PROJECT_ID, credentials=credentials)

    # Try common locations
    common_paths = [
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), creds_path or ""),
        os.path.expanduser(f"~/Downloads/{creds_path}") if creds_path else "",
    ]
    for path in common_paths:
        if path and os.path.isfile(path):
            credentials = service_account.Credentials.from_service_account_file(path)
            return storage.Client(project=settings.GCS_PROJECT_ID, credentials=credentials)

    # Fall back to default credentials (gcloud auth)
    return storage.Client(project=settings.GCS_PROJECT_ID)


def setup_bucket():
    """Create GCS bucket with public read access for course assets."""
    print(f"[GCP] Setting up GCS bucket: {settings.GCS_BUCKET_NAME}")
    print(f"      Project: {settings.GCS_PROJECT_ID}")

    client = get_client()

    # Check if bucket exists
    bucket = client.bucket(settings.GCS_BUCKET_NAME)
    if bucket.exists():
        print(f"[OK]  Bucket '{settings.GCS_BUCKET_NAME}' already exists")
    else:
        # Create bucket in asia-south1 (Mumbai)
        bucket = client.create_bucket(
            settings.GCS_BUCKET_NAME,
            location="asia-south1",
        )
        print(f"[OK]  Bucket '{settings.GCS_BUCKET_NAME}' created in asia-south1")

    # Set CORS for frontend access
    bucket.cors = [
        {
            "origin": [
                settings.FRONTEND_URL,
                "http://localhost:3000",
                "http://localhost:3001",
            ],
            "method": ["GET", "HEAD"],
            "responseHeader": ["Content-Type", "Content-Length"],
            "maxAgeSeconds": 3600,
        }
    ]
    bucket.patch()
    print("[OK]  CORS configured for frontend access")

    # Grant public read access to all objects (for course assets and resumes)
    try:
        policy = bucket.get_iam_policy(requested_policy_version=3)
        policy.bindings.append({
            "role": "roles/storage.objectViewer",
            "members": {"allUsers"}
        })
        bucket.set_iam_policy(policy)
        print("[OK]  Bucket made public-readable (allUsers as Storage Object Viewer)")
    except Exception as e:
        print(f"[WARN] Could not make bucket public-readable: {e}")
        print("       You may need to manually grant 'Storage Object Viewer' to 'allUsers' in GCP Console.")

    # Create folder structure
    folders = [
        "courses/thumbnails/",
        "courses/previews/",
        "materials/pdfs/",
        "materials/images/",
        "profiles/",
        "resumes/",
        "certificates/",
    ]
    for folder in folders:
        blob = bucket.blob(folder)
        if not blob.exists():
            blob.upload_from_string("", content_type="application/x-empty")
            print(f"      Created: {folder}")

    print("")
    print("[DONE] GCS bucket setup complete!")
    print(f"       Bucket URL: https://storage.googleapis.com/{settings.GCS_BUCKET_NAME}/")
    print("")
    print("[NEXT] Steps:")
    print("   1. Run: python -m scripts.seed_courses  (to seed course data)")
    print("   2. Run: python -m scripts.upload_seed_assets  (to upload PDFs/images)")


if __name__ == "__main__":
    setup_bucket()
