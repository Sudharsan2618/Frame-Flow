"""Admin upload endpoint — generates signed URLs for direct-to-GCS browser uploads."""

import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import require_admin
from app.config import settings
from app.storage.gcs import generate_signed_upload_url
from app.schemas.course_builder import SignedUploadRequest, SignedUploadResponse

router = APIRouter(prefix="/admin/upload", tags=["Admin Upload"])


def _sanitize(name: str) -> str:
    """Keep only alphanumeric, dots, hyphens, underscores."""
    return re.sub(r"[^a-zA-Z0-9._-]", "_", name)


@router.post("/signed", response_model=SignedUploadResponse)
async def get_signed_upload_url(
    body: SignedUploadRequest,
    admin: dict = Depends(require_admin),
):
    """Return a signed PUT URL so the browser can upload directly to GCS."""
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    safe_name = _sanitize(body.filename)
    folder = body.course_slug or "general"

    blob_name = f"{settings.COURSE_ASSET_PREFIX}/{folder}/{ts}_{safe_name}"

    try:
        upload_url = generate_signed_upload_url(blob_name, body.content_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate upload URL: {e}")

    public_url = f"https://storage.googleapis.com/{settings.GCS_BUCKET_NAME}/{blob_name}"

    return SignedUploadResponse(
        upload_url=upload_url,
        blob_name=blob_name,
        public_url=public_url,
    )
