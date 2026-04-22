"""Async MongoDB connection using Motor.

Provides collection accessors for:
- learning_progress:    Granular student activity tracking
- xapi_statements:      xAPI (Experience API) compliant statements
- flashcard_progress:   Spaced repetition data
- analytics_aggregates: Pre-computed dashboard metrics
- user_sessions:        Session tracking
- course_engagement:    Content engagement heatmaps
"""

from datetime import datetime
from typing import Any
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config import settings

# Module-level references (initialised at startup)
_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


# ── Lifecycle ──────────────────────────────────────────────────────────────

async def connect_mongodb() -> None:
    """Create the Motor client and select the database.  Call once at app startup."""
    global _client, _db
    _client = AsyncIOMotorClient(
        settings.MONGODB_URL,
        serverSelectionTimeoutMS=5000,
        maxPoolSize=20,
        minPoolSize=2,
        maxIdleTimeMS=45000,
        retryWrites=True,
        retryReads=True,
        connectTimeoutMS=10000,
        socketTimeoutMS=30000,
        compressors="zstd,snappy,zlib",
    )
    _db = _client[settings.MONGODB_DB]

    # Verify connectivity
    try:
        await _client.admin.command("ping")
        print(f"[MONGO] Connected to {settings.MONGODB_DB}")
    except Exception as e:
        print(f"[MONGO] Connection warning: {e}")


async def close_mongodb() -> None:
    """Close the Motor client.  Call once at app shutdown."""
    global _client, _db
    if _client:
        _client.close()
        _client = None
        _db = None
        print("[MONGO] Connection closed")


# ── Database / Collection accessors ────────────────────────────────────────

def get_mongodb() -> AsyncIOMotorDatabase:
    """Return the database reference.  Used as a FastAPI dependency."""
    if _db is None:
        raise RuntimeError("MongoDB not initialised — call connect_mongodb() first")
    return _db


# Shorthand collection accessors for type-hinting convenience
def learning_progress():
    return get_mongodb()["learning_progress"]

def xapi_statements():
    return get_mongodb()["xapi_statements"]

def flashcard_progress():
    return get_mongodb()["flashcard_progress"]

def analytics_aggregates():
    return get_mongodb()["analytics_aggregates"]

def user_sessions():
    return get_mongodb()["user_sessions"]

def course_engagement():
    return get_mongodb()["course_engagement"]

def event_log():
    return get_mongodb()["event_log"]

def search_logs():
    return get_mongodb()["search_logs"]

def notification_queue():
    return get_mongodb()["notification_queue"]

def resume_analysis():
    return get_mongodb()["resume_analysis"]


# ── Index creation (run once on first deploy) ──────────────────────────────

async def ensure_indexes() -> None:
    """Create required indexes if they don't already exist."""
    db = get_mongodb()

    # learning_progress
    lp = db["learning_progress"]
    await lp.create_index([("student_id", 1), ("timestamp", -1)])
    await lp.create_index([("course_id", 1), ("timestamp", -1)])
    await lp.create_index([("lesson_id", 1)])
    await lp.create_index([("activity_type", 1)])
    await lp.create_index([("timestamp", -1)])
    await lp.create_index([("session_id", 1)])
    await lp.create_index([("student_id", 1), ("course_id", 1)])

    # xapi_statements
    xs = db["xapi_statements"]
    await xs.create_index([("student_id", 1), ("timestamp", -1)])
    await xs.create_index([("verb_id", 1)])
    await xs.create_index([("object_id", 1)])
    await xs.create_index([("course_id", 1)])
    await xs.create_index([("timestamp", -1)])
    await xs.create_index([("statement.id", 1)], unique=True, sparse=True)

    # user_sessions
    us = db["user_sessions"]
    await us.create_index([("user_id", 1), ("started_at", -1)])
    await us.create_index([("session_id", 1)], unique=True)
    await us.create_index([("is_active", 1)])

    # course_engagement
    ce = db["course_engagement"]
    await ce.create_index([("course_id", 1)])
    await ce.create_index([("lesson_id", 1)], unique=True)

    # analytics_aggregates
    aa = db["analytics_aggregates"]
    await aa.create_index([("report_type", 1), ("period_start", -1)])
    await aa.create_index([("report_type", 1), ("entity_type", 1), ("entity_id", 1)])
    await aa.create_index([("expires_at", 1)], expireAfterSeconds=0)  # TTL index

    # flashcard_progress
    fp = db["flashcard_progress"]
    await fp.create_index([("student_id", 1), ("card_id", 1)], unique=True)
    await fp.create_index([("student_id", 1), ("next_review_at", 1)])
    await fp.create_index([("deck_id", 1)])

    # event_log
    el = db["event_log"]
    await el.create_index([("event_type", 1), ("timestamp", -1)])
    await el.create_index([("user_id", 1), ("timestamp", -1)])

    # search_logs
    sl = db["search_logs"]
    await sl.create_index([("student_id", 1), ("timestamp", -1)])
    await sl.create_index([("query", "text")])

    # notification_queue
    nq = db["notification_queue"]
    await nq.create_index([("user_id", 1), ("created_at", -1)])
    await nq.create_index([("notification_id", 1)], unique=True)
    await nq.create_index([("user_id", 1), ("read", 1)])

    # resume_analysis
    ra = db["resume_analysis"]
    await ra.create_index([("student_id", 1)], unique=True)

    print("[MONGO] Indexes ensured")


# ── Utilities ──────────────────────────────────────────────────────────────

def strip_none(obj: Any) -> Any:
    """Recursively remove keys with None values from dicts/lists.
    Required because MongoDB's $jsonSchema validators reject null
    for fields that specify a bsonType like 'string' or 'object'.
    """
    if isinstance(obj, dict):
        return {k: strip_none(v) for k, v in obj.items() if v is not None}
    if isinstance(obj, list):
        return [strip_none(item) for item in obj]
    return obj


def to_bson_datetime(dt: datetime) -> datetime:
    """Ensure datetime is UTC for MongoDB."""
    from datetime import timezone
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)

