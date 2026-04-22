"""Simple in-memory TTL cache for frequently-read, rarely-written data."""

from cachetools import TTLCache

# Categories: tiny table, changes rarely. Cache for 10 minutes.
_category_cache: TTLCache = TTLCache(maxsize=1, ttl=600)

# Course list pages: cache for 2 minutes.
_course_list_cache: TTLCache = TTLCache(maxsize=50, ttl=120)


def get_category_cache() -> TTLCache:
    return _category_cache


def get_course_list_cache() -> TTLCache:
    return _course_list_cache


def invalidate_course_caches() -> None:
    """Call when admin publishes/unpublishes/deletes a course."""
    _course_list_cache.clear()
    _category_cache.clear()
