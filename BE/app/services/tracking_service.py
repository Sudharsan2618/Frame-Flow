"""Tracking Service — orchestrates learning analytics and xAPI logging.

This service handles:
  1. Recording activities to MongoDB `learning_progress` collection
  2. Delegating to XAPIService for xAPI statement generation
  3. Session lifecycle management (start / heartbeat / end)
  4. Analytics aggregation queries
  5. Course engagement tracking

It does NOT update PostgreSQL `lesson_progress` — that is handled by the
existing progress endpoint in course_service.py.  The two systems work in
parallel as defined in COURSE_CONTENT_ARCHITECTURE.md §10.5.
"""

from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
import uuid

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db.mongodb import strip_none, to_bson_datetime
from app.schemas.tracking import (
    ActivityType,
    TrackActivityRequest,
    TrackActivityResponse,
    TrackBatchRequest,
    TrackBatchResponse,
    StartSessionRequest,
    EndSessionRequest,
    SessionResponse,
    HeartbeatRequest,
    HeartbeatResponse,
    StudentActivitySummary,
    CourseEngagementSummary,
    XAPIStatementRequest,
)
from app.services.xapi_service import XAPIService


class TrackingService:
    """Orchestrates learning-analytics recording."""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.xapi = XAPIService(db)
        self.lp_collection = db["learning_progress"]
        self.session_collection = db["user_sessions"]
        self.engagement_collection = db["course_engagement"]

    # ──────────────────────────────────────────────────────────────────
    # 1.  Single Activity
    # ──────────────────────────────────────────────────────────────────

    async def track_activity(
        self,
        event: TrackActivityRequest,
    ) -> TrackActivityResponse:
        """Record a single learning activity.

        Flow:
          1. Insert into `learning_progress` (MongoDB)  — awaited
          2-5. xAPI, engagement, flashcard, notifications — fire-and-forget
        """
        now = to_bson_datetime(datetime.now(timezone.utc))

        # 1. Build the learning_progress document (must await — we need the ID)
        lp_doc = strip_none(self._build_lp_document(event, now))
        insert_result = await self.lp_collection.insert_one(lp_doc)
        activity_id = str(insert_result.inserted_id)

        # 2-5. Fire-and-forget background tasks for non-critical work
        import asyncio
        asyncio.create_task(self._background_tracking(event, now))

        return TrackActivityResponse(
            success=True,
            activity_id=activity_id,
            xapi_statement_id=None,
            message=f"Activity '{event.activity_type.value}' recorded",
        )

    async def _background_tracking(
        self, event: TrackActivityRequest, now: datetime,
    ) -> None:
        """Run xAPI, engagement, flashcard, and notification updates in background."""
        try:
            await self.xapi.record_statement(event)
        except Exception:
            pass
        try:
            await self._update_engagement(event, now)
        except Exception:
            pass
        try:
            if event.activity_type == ActivityType.FLASHCARD_INTERACTION:
                await self._update_flashcard_progress(event, now)
        except Exception:
            pass
        try:
            await self._trigger_notifications(event)
        except Exception:
            pass

    # ──────────────────────────────────────────────────────────────────
    # 2.  Batch Activities
    # ──────────────────────────────────────────────────────────────────

    async def track_batch(
        self,
        batch: TrackBatchRequest,
    ) -> TrackBatchResponse:
        """Record multiple activities at once (offline → sync scenario)."""
        recorded = 0
        failed = 0
        for event in batch.events:
            try:
                await self.track_activity(event)
                recorded += 1
            except Exception:
                failed += 1

        return TrackBatchResponse(
            success=failed == 0,
            recorded_count=recorded,
            failed_count=failed,
            message=f"Batch: {recorded} recorded, {failed} failed",
        )

    # ──────────────────────────────────────────────────────────────────
    # 3.  Session Management
    # ──────────────────────────────────────────────────────────────────

    async def start_session(
        self,
        req: StartSessionRequest,
    ) -> SessionResponse:
        """Create a new learning session."""
        now = to_bson_datetime(datetime.now(timezone.utc))
        session_id = str(uuid.uuid4())

        doc = {
            "session_id": session_id,
            "user_id": req.user_id,
            "started_at": now,
            "last_activity_at": now,
            "is_active": True,
            "pages_visited": 0,
            "duration_seconds": 0,
            "device_info": strip_none(req.device_info.model_dump(mode="json")) if req.device_info else None,
            "location_info": strip_none(req.location_info) if req.location_info else None,
        }
        await self.session_collection.insert_one(strip_none(doc))

        return SessionResponse(
            session_id=session_id,
            started_at=now,
            message="Session started",
        )

    async def heartbeat(
        self,
        req: HeartbeatRequest,
    ) -> HeartbeatResponse:
        """Update session last-activity timestamp."""
        now = to_bson_datetime(datetime.now(timezone.utc))
        update_doc: Dict[str, Any] = {"$set": {"last_activity_at": now}}
        if req.current_page:
            # Increment pages_visited counter vs adding to a list (per schema)
            update_doc["$inc"] = {"pages_visited": 1}

        await self.session_collection.update_one(
            {"session_id": req.session_id, "is_active": True},
            update_doc,
        )
        return HeartbeatResponse(
            success=True,
            session_id=req.session_id,
            last_activity_at=now,
        )

    async def end_session(
        self,
        req: EndSessionRequest,
    ) -> SessionResponse:
        """End a session and compute total duration."""
        now = to_bson_datetime(datetime.now(timezone.utc))
        session = await self.session_collection.find_one(
            {"session_id": req.session_id}
        )
        duration = 0
        if session and session.get("started_at"):
            # Ensure session['started_at'] is offset-aware for subtraction
            started_at = session["started_at"]
            if started_at.tzinfo is None:
                started_at = started_at.replace(tzinfo=timezone.utc)
            duration = int((now - started_at).total_seconds())

        await self.session_collection.update_one(
            {"session_id": req.session_id},
            {"$set": {
                "is_active": False,
                "ended_at": now,
                "logout_type": req.logout_type,
                "duration_seconds": duration,
            }},
        )
        return SessionResponse(
            session_id=req.session_id,
            message=f"Session ended (duration: {duration}s)",
        )

    # ──────────────────────────────────────────────────────────────────
    # 4.  xAPI Pass-through
    # ──────────────────────────────────────────────────────────────────

    async def store_xapi_statement(
        self,
        req: XAPIStatementRequest,
    ) -> str:
        """Accept and store a pre-built xAPI statement (for external LRS compat)."""
        return await self.xapi.record_raw_statement(
            student_id=req.student_id,
            statement=req.statement,
            course_id=req.course_id,
        )

    # ──────────────────────────────────────────────────────────────────
    # 5.  Analytics Queries
    # ──────────────────────────────────────────────────────────────────

    async def get_student_activity_summary(
        self,
        student_id: int,
        course_id: int,
    ) -> StudentActivitySummary:
        """Get aggregated activity summary for a student in a course."""
        pipeline = [
            {"$match": {"student_id": student_id, "course_id": course_id}},
            {"$group": {
                "_id": "$activity_type",
                "count": {"$sum": 1},
                "unique_lessons": {"$addToSet": "$lesson_id"},
                "total_time": {"$sum": {"$ifNull": ["$details.time_spent_seconds", 0]}},
                "last_at": {"$max": "$timestamp"},
            }},
        ]
        results = await self.lp_collection.aggregate(pipeline).to_list(100)

        summary = StudentActivitySummary(
            student_id=student_id,
            course_id=course_id,
        )
        latest = None
        for row in results:
            at = row["_id"]
            count = row["count"]
            unique_lessons = len([l for l in row.get("unique_lessons", []) if l]) # Count unique valid lesson_ids
            
            summary.total_time_spent_seconds += row["total_time"]
            if row["last_at"] and (latest is None or row["last_at"] > latest):
                latest = row["last_at"]

            if at == ActivityType.LESSON_STARTED.value:
                summary.lessons_started = count
            elif at == ActivityType.LESSON_COMPLETED.value:
                summary.lessons_completed = count
            elif at == ActivityType.VIDEO_WATCHED.value:
                # Use unique lessons watched instead of raw ping count
                summary.videos_watched = unique_lessons
            elif at in (ActivityType.QUIZ_STARTED.value, ActivityType.QUIZ_SUBMITTED.value):
                summary.quizzes_taken += count
            elif at == ActivityType.FLASHCARD_INTERACTION.value:
                summary.flashcards_reviewed = count
            elif at == ActivityType.RESOURCE_DOWNLOADED.value:
                summary.resources_downloaded = count

        summary.last_activity_at = latest
        return summary

    async def get_course_engagement(
        self,
        course_id: int,
        period_days: int = 30,
    ) -> CourseEngagementSummary:
        """Get course-level engagement metrics for the last N days."""
        since = datetime.now(timezone.utc) - timedelta(days=period_days)
        pipeline = [
            {"$match": {"course_id": course_id, "timestamp": {"$gte": since}}},
            {"$facet": {
                "by_type": [
                    {"$group": {"_id": "$activity_type", "count": {"$sum": 1}}},
                ],
                "unique_students": [
                    {"$group": {"_id": "$student_id"}},
                    {"$count": "total"},
                ],
                "total_time": [
                    {"$group": {
                        "_id": None,
                        "sum": {"$sum": {"$ifNull": ["$details.time_spent_seconds", 0]}},
                    }},
                ],
            }},
        ]
        results = await self.lp_collection.aggregate(pipeline).to_list(1)
        if not results:
            return CourseEngagementSummary(course_id=course_id)

        data = results[0]
        breakdown: Dict[str, int] = {}
        total_activities = 0
        for item in data.get("by_type", []):
            breakdown[item["_id"]] = item["count"]
            total_activities += item["count"]

        unique_students = 0
        if data.get("unique_students"):
            unique_students = data["unique_students"][0].get("total", 0)

        total_time = 0
        if data.get("total_time") and data["total_time"]:
            total_time = data["total_time"][0].get("sum", 0)

        # Completion rate approximation
        completed = breakdown.get(ActivityType.COURSE_COMPLETED.value, 0)
        enrolled = breakdown.get(ActivityType.COURSE_ENROLLED.value, 0)
        completion_rate = round(completed / enrolled, 2) if enrolled > 0 else 0.0

        avg_minutes = round(total_time / (unique_students * 60), 1) if unique_students > 0 else 0.0

        return CourseEngagementSummary(
            course_id=course_id,
            active_students=unique_students,
            total_activities=total_activities,
            avg_time_spent_minutes=avg_minutes,
            completion_rate=completion_rate,
            activity_breakdown=breakdown,
        )

    async def get_recent_activities(
        self,
        student_id: int,
        course_id: Optional[int] = None,
        limit: int = 20,
    ) -> List[Dict[str, Any]]:
        """Get recent activities for a student, optionally filtered by course."""
        query: Dict[str, Any] = {"student_id": student_id}
        if course_id is not None:
            query["course_id"] = course_id

        cursor = (
            self.lp_collection
            .find(query, {"_id": 0})
            .sort("timestamp", -1)
            .limit(limit)
        )
        return await cursor.to_list(length=limit)

    async def get_xapi_statements(
        self,
        student_id: Optional[int] = None,
        course_id: Optional[int] = None,
        verb_id: Optional[str] = None,
        since: Optional[datetime] = None,
        until: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """Proxy to XAPIService.get_statements (for API exposure)."""
        return await self.xapi.get_statements(
            student_id=student_id,
            course_id=course_id,
            verb_id=verb_id,
            since=since,
            until=until,
            limit=limit,
            offset=offset,
        )

    # ──────────────────────────────────────────────────────────────────
    # PRIVATE HELPERS
    # ──────────────────────────────────────────────────────────────────

    @staticmethod
    def _build_lp_document(
        event: TrackActivityRequest,
        timestamp: datetime,
    ) -> Dict[str, Any]:
        """Convert a TrackActivityRequest into a learning_progress MongoDB doc."""
        doc: Dict[str, Any] = {
            "student_id": event.student_id,
            "course_id": event.course_id,
            "activity_type": event.activity_type.value,
            "timestamp": timestamp,
        }
        if event.module_id:
            doc["module_id"] = event.module_id
        if event.lesson_id:
            doc["lesson_id"] = event.lesson_id
        if event.session_id:
            doc["session_id"] = event.session_id

        # Flatten details into the `details` sub-doc
        if event.details:
            details: Dict[str, Any] = {}
            d = event.details
            if d.video_progress:
                details["video_progress"] = d.video_progress.model_dump(mode="json")
            if d.quiz_result:
                details["quiz_result"] = d.quiz_result.model_dump(mode="json")
            if d.flashcard_session:
                details["flashcard_session"] = d.flashcard_session.model_dump(mode="json")
            if d.time_spent_seconds is not None:
                details["time_spent_seconds"] = d.time_spent_seconds
            if d.scroll_depth_percentage is not None:
                details["scroll_depth_percentage"] = d.scroll_depth_percentage
            if details:
                doc["details"] = details

        # Device info
        if event.device_info:
            doc["device_info"] = event.device_info.model_dump(mode="json", exclude_none=True)

        # SCORM data
        if event.scorm_data:
            doc["scorm_data"] = event.scorm_data.model_dump(mode="json", exclude_none=True)

        return doc

    async def _update_engagement(
        self,
        event: TrackActivityRequest,
        timestamp: datetime,
    ) -> None:
        """Increment engagement counters for the lesson (best-effort)."""
        if not event.lesson_id:
            return

        update: Dict[str, Any] = {
            "$inc": {"total_views": 1},
            "$set": {"last_updated": timestamp},
            "$setOnInsert": {
                "course_id": event.course_id,
                "lesson_id": event.lesson_id,
                "unique_viewers": 0,
                "avg_time_spent_seconds": 0.0,
                "completion_rate": 0.0,
                "drop_off_rate": 0.0,
            },
        }

        await self.engagement_collection.update_one(
            {"lesson_id": event.lesson_id},
            update,
            upsert=True,
        )

    # ──────────────────────────────────────────────────────────────────
    # Flashcard Progress (SM-2 Spaced Repetition)
    # ──────────────────────────────────────────────────────────────────

    async def _update_flashcard_progress(
        self,
        event: TrackActivityRequest,
        timestamp: datetime,
    ) -> None:
        """Update flashcard_progress using SM-2 spaced repetition."""
        details = event.details
        if not details or not details.flashcard_session:
            return

        fc = details.flashcard_session
        is_correct = fc.is_correct if fc.is_correct is not None else False
        card_id = fc.card_id if hasattr(fc, 'card_id') and fc.card_id else 0
        deck_id = fc.deck_id if hasattr(fc, 'deck_id') and fc.deck_id else 0

        # Fetch existing progress
        existing = await self.db["flashcard_progress"].find_one({
            "student_id": event.student_id,
            "card_id": card_id,
        })

        if existing:
            mastery = existing.get("mastery_level", 0)
            correct_count = existing.get("correct_count", 0)
            incorrect_count = existing.get("incorrect_count", 0)
        else:
            mastery = 0
            correct_count = 0
            incorrect_count = 0

        # SM-2 update
        if is_correct:
            correct_count += 1
            mastery = min(mastery + 1, 5)  # Cap at 5
        else:
            incorrect_count += 1
            mastery = max(mastery - 1, 0)

        # Compute next review interval based on mastery level
        intervals = [1, 1, 3, 7, 14, 30]  # days
        interval_days = intervals[mastery] if mastery < len(intervals) else 30
        next_review = timestamp + timedelta(days=interval_days)

        # Review history entry
        review_entry = {
            "is_correct": is_correct,
            "at": timestamp,
        }

        await self.db["flashcard_progress"].update_one(
            {"student_id": event.student_id, "card_id": card_id},
            {
                "$set": {
                    "deck_id": deck_id,
                    "mastery_level": mastery,
                    "correct_count": correct_count,
                    "incorrect_count": incorrect_count,
                    "last_reviewed_at": timestamp,
                    "next_review_at": next_review,
                },
                "$push": {"review_history": review_entry},
                "$setOnInsert": {
                    "student_id": event.student_id,
                    "card_id": card_id,
                    "created_at": timestamp,
                },
            },
            upsert=True,
        )

    # ──────────────────────────────────────────────────────────────────
    # Notification Triggers
    # ──────────────────────────────────────────────────────────────────

    async def _trigger_notifications(
        self,
        event: TrackActivityRequest,
    ) -> None:
        """Create notification queue entries for important activities."""
        from app.services.notification_service import create_notification

        # Use user_id from event if frontend passed it (avoids cross-region PG lookup)
        user_id = getattr(event, "user_id", None)
        email = None

        if not user_id:
            # Fallback: resolve from PG (expensive — opens a new session)
            try:
                from app.db.postgres import async_session_factory
                from app.models.user import Student, User
                from sqlalchemy import select
                async with async_session_factory() as session:
                    q = await session.execute(
                        select(Student.user_id, User.email)
                        .join(User, User.user_id == Student.user_id)
                        .where(Student.student_id == event.student_id)
                    )
                    row = q.first()
                    if row:
                        user_id, email = row
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(f"Could not resolve user_id/email for notification: {e}")
                user_id = event.student_id

        if not user_id:
            return

        if event.activity_type == ActivityType.COURSE_COMPLETED:
            await create_notification(
                user_id=user_id,
                email=email,
                notification_type="course_completed",
                title="🎉 Course Completed!",
                body="Congratulations! You've completed a course. Keep up the great work!",
                metadata={"course_id": event.course_id},
            )
        elif event.activity_type == ActivityType.QUIZ_SUBMITTED:
            score = None
            passed = None
            if event.details and event.details.quiz_result:
                score = event.details.quiz_result.score
                passed = event.details.quiz_result.passed
            if passed:
                await create_notification(
                    user_id=user_id,
                    email=email,
                    notification_type="quiz_passed",
                    title="✅ Quiz Passed!",
                    body=f"Great job! You scored {score}% on the quiz.",
                    metadata={
                        "course_id": event.course_id,
                        "lesson_id": event.lesson_id,
                        "score": score,
                    },
                )
