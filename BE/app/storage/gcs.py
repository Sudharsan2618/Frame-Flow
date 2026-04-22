"""GCP Cloud Storage helper — upload, signed URLs, bucket operations."""

import os
from datetime import timedelta
from typing import Optional
from google.cloud import storage
from google.oauth2 import service_account
from app.config import settings

_gcs_client: Optional[storage.Client] = None


def get_gcs_client() -> storage.Client:
    """Get authenticated GCS client (lazy-init with service account)."""
    global _gcs_client
    if _gcs_client is not None:
        return _gcs_client
    creds_path = settings.GOOGLE_APPLICATION_CREDENTIALS
    if creds_path and os.path.isfile(creds_path):
        credentials = service_account.Credentials.from_service_account_file(creds_path)
        _gcs_client = storage.Client(project=settings.GCS_PROJECT_ID, credentials=credentials)
    else:
        _gcs_client = storage.Client(project=settings.GCS_PROJECT_ID)
    return _gcs_client


def get_bucket(client: Optional[storage.Client] = None) -> storage.Bucket:
    """Get the configured GCS bucket."""
    client = client or get_gcs_client()
    return client.bucket(settings.GCS_BUCKET_NAME)


def upload_file(
    source_path: str,
    destination_blob: str,
    content_type: str = "application/octet-stream",
) -> str:
    """Upload a local file to GCS and return the public URL."""
    bucket = get_bucket()
    blob = bucket.blob(destination_blob)
    blob.upload_from_filename(source_path, content_type=content_type)
    blob.make_public()
    return blob.public_url


def upload_bytes(
    data: bytes,
    destination_blob: str,
    content_type: str = "application/octet-stream",
) -> str:
    """Upload bytes to GCS and return the public URL."""
    bucket = get_bucket()
    blob = bucket.blob(destination_blob)
    blob.upload_from_string(data, content_type=content_type)
    blob.make_public()
    return blob.public_url


def get_signed_url(blob_name: str, expiration_minutes: int = 60) -> str:
    """Generate a time-limited signed URL for private content."""
    bucket = get_bucket()
    blob = bucket.blob(blob_name)
    return blob.generate_signed_url(
        version="v4",
        expiration=timedelta(minutes=expiration_minutes),
        method="GET",
    )


def delete_blob(blob_name: str):
    """Delete a blob from GCS."""
    bucket = get_bucket()
    blob = bucket.blob(blob_name)
    blob.delete()


def generate_signed_upload_url(
    blob_name: str,
    content_type: str = "application/octet-stream",
    expiration_minutes: int = 30,
) -> str:
    """Generate a V4 signed URL for direct browser PUT upload to GCS."""
    bucket = get_bucket()
    blob = bucket.blob(blob_name)
    return blob.generate_signed_url(
        version="v4",
        expiration=timedelta(minutes=expiration_minutes),
        method="PUT",
        content_type=content_type,
    )
