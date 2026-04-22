from datetime import datetime, timezone

def utc_now() -> datetime:
    """Returns the current timezone-naive UTC datetime to fix asyncpg timezone mismatch."""
    return datetime.now(timezone.utc).replace(tzinfo=None)
