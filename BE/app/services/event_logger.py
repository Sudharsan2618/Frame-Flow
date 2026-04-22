"""Event logging service — fire-and-forget system event logger to MongoDB."""

from datetime import datetime, timezone
from typing import Any, Optional

from app.db.mongodb import get_mongodb, to_bson_datetime


async def log_event(
    event_type: str,
    *,
    user_id: Optional[int] = None,
    details: Optional[dict[str, Any]] = None,
    severity: str = "info",
) -> str:
    """
    Fire-and-forget system event logger.

    Examples:
        await log_event("user.login", user_id=1)
        await log_event("course.enrolled", user_id=1, details={"course_id": 5})
        await log_event("lesson.progress.updated", user_id=1, details={"lesson_id": 20, "progress": 80})
    """
    db = get_mongodb()
    now = to_bson_datetime(datetime.now(timezone.utc))

    doc = {
        "event_type": event_type,
        "user_id": user_id,
        "timestamp": now,
        "severity": severity,
        "details": details or {},
    }

    result = await db["event_log"].insert_one(doc)
    return str(result.inserted_id)
