"""Analytics aggregation service — on-demand computed metrics with TTL caching in MongoDB."""

from datetime import datetime, timezone, timedelta
from typing import Any, Optional

from app.db.mongodb import get_mongodb, to_bson_datetime


_CACHE_TTL_SECONDS = 3600  # 1 hour


async def get_or_compute_aggregate(
    report_type: str,
    **kwargs: Any,
) -> dict:
    """
    Fetch a pre-computed aggregate report, or compute and cache it if stale/missing.

    Supported report_types:
        - "daily_platform_summary"
        - "course_performance"
        - "student_leaderboard"
        - "popular_content"
    """
    db = get_mongodb()
    now = datetime.now(timezone.utc)

    # Check cache
    cached = await db["analytics_aggregates"].find_one(
        {"report_type": report_type, "kwargs": kwargs},
        sort=[("computed_at", -1)],
    )

    if cached:
        age = (now - cached["computed_at"].replace(tzinfo=timezone.utc)).total_seconds()
        if age < _CACHE_TTL_SECONDS:
            cached.pop("_id", None)
            return cached

    # Compute fresh
    data = await _compute_report(report_type, **kwargs)

    doc = {
        "report_type": report_type,
        "kwargs": kwargs,
        "computed_at": to_bson_datetime(now),
        "expires_at": to_bson_datetime(now + timedelta(seconds=_CACHE_TTL_SECONDS)),
        "data": data,
    }
    await db["analytics_aggregates"].replace_one(
        {"report_type": report_type, "kwargs": kwargs},
        doc,
        upsert=True,
    )
    return doc


async def _compute_report(report_type: str, **kwargs: Any) -> dict:
    """Delegate to the appropriate report builder."""
    dispatch = {
        "daily_platform_summary": _daily_platform_summary,
        "course_performance": _course_performance,
        "student_leaderboard": _student_leaderboard,
        "popular_content": _popular_content,
    }
    fn = dispatch.get(report_type)
    if not fn:
        return {"error": f"Unknown report_type: {report_type}"}
    return await fn(**kwargs)


async def _daily_platform_summary(**kwargs: Any) -> dict:
    """Active users, lessons completed, total time spent today."""
    db = get_mongodb()
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    pipeline = [
        {"$match": {"timestamp": {"$gte": to_bson_datetime(today_start)}}},
        {"$group": {
            "_id": None,
            "active_users": {"$addToSet": "$student_id"},
            "total_activities": {"$sum": 1},
            "lessons_completed": {
                "$sum": {"$cond": [{"$eq": ["$activity_type", "lesson_completed"]}, 1, 0]}
            },
        }},
    ]
    results = await db["learning_progress"].aggregate(pipeline).to_list(1)
    if not results:
        return {"active_users": 0, "total_activities": 0, "lessons_completed": 0, "date": str(today_start.date())}

    r = results[0]
    return {
        "active_users": len(r.get("active_users", [])),
        "total_activities": r.get("total_activities", 0),
        "lessons_completed": r.get("lessons_completed", 0),
        "date": str(today_start.date()),
    }


async def _course_performance(**kwargs: Any) -> dict:
    """Per-course completion rate and average quiz score."""
    db = get_mongodb()
    course_id = kwargs.get("course_id")
    match_filter: dict = {}
    if course_id:
        match_filter["course_id"] = course_id

    pipeline = [
        {"$match": {**match_filter, "activity_type": {"$in": ["lesson_completed", "quiz_submitted"]}}},
        {"$group": {
            "_id": "$course_id",
            "completions": {
                "$sum": {"$cond": [{"$eq": ["$activity_type", "lesson_completed"]}, 1, 0]}
            },
            "quiz_scores": {
                "$push": {
                    "$cond": [
                        {"$eq": ["$activity_type", "quiz_submitted"]},
                        "$details.quiz_result.score",
                        "$$REMOVE",
                    ]
                }
            },
            "unique_students": {"$addToSet": "$student_id"},
        }},
        {"$project": {
            "course_id": "$_id",
            "completions": 1,
            "unique_students": {"$size": "$unique_students"},
            "avg_quiz_score": {"$avg": "$quiz_scores"},
        }},
    ]
    results = await db["learning_progress"].aggregate(pipeline).to_list(50)
    for r in results:
        r.pop("_id", None)
    return {"courses": results}


async def _student_leaderboard(**kwargs: Any) -> dict:
    """Top students by total lesson completions."""
    db = get_mongodb()
    limit = kwargs.get("limit", 10)

    pipeline = [
        {"$match": {"activity_type": "lesson_completed"}},
        {"$group": {
            "_id": "$student_id",
            "completions": {"$sum": 1},
        }},
        {"$sort": {"completions": -1}},
        {"$limit": limit},
        {"$project": {"student_id": "$_id", "completions": 1, "_id": 0}},
    ]
    results = await db["learning_progress"].aggregate(pipeline).to_list(limit)
    return {"leaderboard": results}


async def _popular_content(**kwargs: Any) -> dict:
    """Most-viewed lessons by activity count."""
    db = get_mongodb()
    limit = kwargs.get("limit", 10)

    pipeline = [
        {"$match": {"activity_type": {"$in": ["lesson_started", "video_watched"]}}},
        {"$group": {
            "_id": {"lesson_id": "$lesson_id", "course_id": "$course_id"},
            "views": {"$sum": 1},
            "unique_students": {"$addToSet": "$student_id"},
        }},
        {"$sort": {"views": -1}},
        {"$limit": limit},
        {"$project": {
            "lesson_id": "$_id.lesson_id",
            "course_id": "$_id.course_id",
            "views": 1,
            "unique_students": {"$size": "$unique_students"},
            "_id": 0,
        }},
    ]
    results = await db["learning_progress"].aggregate(pipeline).to_list(limit)
    return {"popular_content": results}
