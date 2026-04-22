"""GCS Storage service — upload, delete, and manage files in Google Cloud Storage."""

import os
from datetime import datetime, timezone
from typing import Optional

from google.cloud import storage
from google.oauth2 import service_account

from app.config import settings


# ── Lazy-init client ──────────────────────────────────────────────────────

_storage_client: Optional[storage.Client] = None


def _get_client() -> storage.Client:
    """Lazy-init the GCS client using service account credentials."""
    global _storage_client
    if _storage_client is not None:
        return _storage_client

    creds_path = settings.GOOGLE_APPLICATION_CREDENTIALS
    if creds_path and os.path.isfile(creds_path):
        credentials = service_account.Credentials.from_service_account_file(creds_path)
        _storage_client = storage.Client(
            project=settings.GCS_PROJECT_ID, credentials=credentials
        )
    else:
        # Fallback: try default credentials
        _storage_client = storage.Client(project=settings.GCS_PROJECT_ID)

    return _storage_client


def _get_bucket() -> storage.Bucket:
    """Get the configured GCS bucket."""
    client = _get_client()
    return client.bucket(settings.GCS_BUCKET_NAME)


# ── Resume operations ─────────────────────────────────────────────────────

def _build_resume_blob_name(student_id: int, original_filename: str) -> str:
    """
    Build a unique blob name with timestamp for the resume.
    Format: resumes/student_{id}/{timestamp}_{sanitized_filename}
    """
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    # Sanitize filename — keep only alphanumeric, dots, hyphens, underscores
    safe_name = "".join(
        c if c.isalnum() or c in (".", "-", "_") else "_"
        for c in original_filename
    )
    return f"resumes/student_{student_id}/{ts}_{safe_name}"


def delete_old_resumes(student_id: int) -> int:
    """
    Delete ALL existing resume blobs for a student.

    Returns:
        Number of blobs deleted.
    """
    bucket = _get_bucket()
    prefix = f"resumes/student_{student_id}/"
    blobs = list(bucket.list_blobs(prefix=prefix))

    deleted = 0
    for blob in blobs:
        # Skip the folder placeholder
        if blob.name == prefix:
            continue
        blob.delete()
        deleted += 1

    return deleted


def upload_resume(
    student_id: int,
    file_bytes: bytes,
    original_filename: str,
    content_type: str = "application/pdf",
) -> str:
    """
    Upload a resume PDF to GCS, replacing any previous versions.

    1. Deletes all old resumes for this student
    2. Uploads the new file with a timestamped name
    3. Returns the public URL

    Args:
        student_id: Student's database ID
        file_bytes: Raw PDF bytes
        original_filename: Original filename from the upload
        content_type: MIME type (defaults to application/pdf)

    Returns:
        The public GCS URL of the uploaded resume
    """
    # 1. Delete old resume files
    deleted_count = delete_old_resumes(student_id)

    # 2. Build blob name and upload
    blob_name = _build_resume_blob_name(student_id, original_filename)
    bucket = _get_bucket()
    blob = bucket.blob(blob_name)

    blob.upload_from_string(
        file_bytes,
        content_type=content_type,
    )

    # 3. Make public (fix AccessDenied)
    try:
        blob.make_public()
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Could not make blob public: {e}")

    # 3. Build URL
    file_url = f"https://storage.googleapis.com/{settings.GCS_BUCKET_NAME}/{blob_name}"

    return file_url


def get_resume_url(student_id: int) -> Optional[str]:
    """
    Get the latest resume URL for a student by listing their resume folder.

    Returns:
        The public URL of the latest resume, or None if none exists.
    """
    bucket = _get_bucket()
    prefix = f"resumes/student_{student_id}/"
    blobs = list(bucket.list_blobs(prefix=prefix))

    # Filter out folder placeholders
    resume_blobs = [b for b in blobs if b.name != prefix and b.size > 0]

    if not resume_blobs:
        return None

    # Sort by name (timestamp prefix ensures latest is last)
    resume_blobs.sort(key=lambda b: b.name)
    latest = resume_blobs[-1]

    return f"https://storage.googleapis.com/{settings.GCS_BUCKET_NAME}/{latest.name}"
