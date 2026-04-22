"""xAPI (Experience API) Service — generates xAPI-compliant statements.

Translates internal learning activity events into the xAPI specification format
and persists them to MongoDB's `xapi_statements` collection.

Reference:
  - xAPI Spec: https://github.com/adlnet/xAPI-Spec
  - ADL verbs: http://adlnet.gov/expapi/verbs/
  - Activity types: http://adlnet.gov/expapi/activities/
"""

from datetime import datetime, timezone
from typing import Any, Dict, Optional
import uuid
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db.mongodb import strip_none, to_bson_datetime
from app.schemas.tracking import (
    ActivityType,
    TrackActivityRequest,
    XAPIStatement,
    XAPIActor,
    XAPIVerb,
    XAPIObject,
    XAPIResult,
    XAPIContext,
)


# ──────────────────────────────────────────────────────────────────────────
# VERB MAPPING — Internal activity_type → xAPI verb IRI
# ──────────────────────────────────────────────────────────────────────────

_VERB_MAP: Dict[ActivityType, Dict[str, Any]] = {
    ActivityType.LESSON_STARTED: {
        "id": "http://adlnet.gov/expapi/verbs/initialized",
        "display": {"en-US": "initialized"},
    },
    ActivityType.LESSON_COMPLETED: {
        "id": "http://adlnet.gov/expapi/verbs/completed",
        "display": {"en-US": "completed"},
    },
    ActivityType.VIDEO_WATCHED: {
        "id": "https://w3id.org/xapi/video/verbs/played",
        "display": {"en-US": "played"},
    },
    ActivityType.VIDEO_PAUSED: {
        "id": "https://w3id.org/xapi/video/verbs/paused",
        "display": {"en-US": "paused"},
    },
    ActivityType.VIDEO_SEEKED: {
        "id": "https://w3id.org/xapi/video/verbs/seeked",
        "display": {"en-US": "seeked"},
    },
    ActivityType.DOCUMENT_VIEWED: {
        "id": "http://id.tincanapi.com/verb/viewed",
        "display": {"en-US": "viewed"},
    },
    ActivityType.AUDIO_PLAYED: {
        "id": "https://w3id.org/xapi/video/verbs/played",
        "display": {"en-US": "played"},
    },
    ActivityType.QUIZ_STARTED: {
        "id": "http://adlnet.gov/expapi/verbs/attempted",
        "display": {"en-US": "attempted"},
    },
    ActivityType.QUIZ_SUBMITTED: {
        "id": "http://adlnet.gov/expapi/verbs/answered",
        "display": {"en-US": "answered"},
    },
    ActivityType.FLASHCARD_INTERACTION: {
        "id": "http://adlnet.gov/expapi/verbs/interacted",
        "display": {"en-US": "interacted"},
    },
    ActivityType.NOTE_TAKEN: {
        "id": "http://id.tincanapi.com/verb/annotated",
        "display": {"en-US": "annotated"},
    },
    ActivityType.RESOURCE_DOWNLOADED: {
        "id": "http://id.tincanapi.com/verb/downloaded",
        "display": {"en-US": "downloaded"},
    },
    ActivityType.PAGE_VIEWED: {
        "id": "http://id.tincanapi.com/verb/viewed",
        "display": {"en-US": "viewed"},
    },
    ActivityType.COURSE_ENROLLED: {
        "id": "http://adlnet.gov/expapi/verbs/registered",
        "display": {"en-US": "registered"},
    },
    ActivityType.COURSE_COMPLETED: {
        "id": "http://adlnet.gov/expapi/verbs/completed",
        "display": {"en-US": "completed"},
    },
}

# ──────────────────────────────────────────────────────────────────────────
# ACTIVITY TYPE MAPPING — Internal content → xAPI activity-type IRI
# ──────────────────────────────────────────────────────────────────────────

_ACTIVITY_TYPE_MAP: Dict[ActivityType, str] = {
    ActivityType.LESSON_STARTED: "http://adlnet.gov/expapi/activities/lesson",
    ActivityType.LESSON_COMPLETED: "http://adlnet.gov/expapi/activities/lesson",
    ActivityType.VIDEO_WATCHED: "https://w3id.org/xapi/video/activity-type/video",
    ActivityType.VIDEO_PAUSED: "https://w3id.org/xapi/video/activity-type/video",
    ActivityType.VIDEO_SEEKED: "https://w3id.org/xapi/video/activity-type/video",
    ActivityType.DOCUMENT_VIEWED: "http://id.tincanapi.com/activitytype/document",
    ActivityType.AUDIO_PLAYED: "http://adlnet.gov/expapi/activities/media",
    ActivityType.QUIZ_STARTED: "http://adlnet.gov/expapi/activities/assessment",
    ActivityType.QUIZ_SUBMITTED: "http://adlnet.gov/expapi/activities/assessment",
    ActivityType.FLASHCARD_INTERACTION: "http://adlnet.gov/expapi/activities/interaction",
    ActivityType.NOTE_TAKEN: "http://id.tincanapi.com/activitytype/note",
    ActivityType.RESOURCE_DOWNLOADED: "http://id.tincanapi.com/activitytype/resource",
    ActivityType.PAGE_VIEWED: "http://activitystrea.ms/schema/1.0/page",
    ActivityType.COURSE_ENROLLED: "http://adlnet.gov/expapi/activities/course",
    ActivityType.COURSE_COMPLETED: "http://adlnet.gov/expapi/activities/course",
}

# ──────────────────────────────────────────────────────────────────────────
# BASE URI for constructing Activity IRIs
# ──────────────────────────────────────────────────────────────────────────

_BASE_IRI = "https://recruitlms.com"


class XAPIService:
    """Builds and persists xAPI statements from internal activity events."""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db["xapi_statements"]

    # ── Public interface ──────────────────────────────────────────────

    async def record_statement(
        self,
        event: TrackActivityRequest,
        *,
        student_name: Optional[str] = None,
        student_email: Optional[str] = None,
    ) -> str:
        """Build an xAPI statement from an internal event and store it.

        Returns the statement UUID.
        """
        statement = self._build_statement(
            event,
            student_name=student_name,
            student_email=student_email,
        )
        now = to_bson_datetime(datetime.now(timezone.utc))
        statement_id = statement.id

        # Serialize and strip all None values — MongoDB schema uses strict
        # bsonType validators that reject null for optional fields.
        stmt_dict = strip_none(statement.model_dump(mode="json", exclude_none=True))

        doc = {
            "student_id": event.student_id,
            "timestamp": now,
            "statement": stmt_dict,
            # Denormalised fields for fast queries (per the MongoDB schema)
            "verb_id": statement.verb.id,
            "object_id": statement.object.id,
            "course_id": event.course_id,
        }

        await self.collection.insert_one(doc)
        return statement_id

    async def record_raw_statement(
        self,
        student_id: int,
        statement: XAPIStatement,
        course_id: Optional[int] = None,
    ) -> str:
        """Persist an externally-constructed xAPI statement directly."""
        now = to_bson_datetime(datetime.now(timezone.utc))
        stmt_dict = strip_none(statement.model_dump(mode="json", exclude_none=True))

        doc = {
            "student_id": student_id,
            "timestamp": now,
            "statement": stmt_dict,
            "verb_id": statement.verb.id,
            "object_id": statement.object.id,
            "course_id": course_id,
        }

        await self.collection.insert_one(doc)
        return statement.id

    async def get_statements(
        self,
        *,
        student_id: Optional[int] = None,
        course_id: Optional[int] = None,
        verb_id: Optional[str] = None,
        since: Optional[datetime] = None,
        until: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list:
        """Query stored xAPI statements with optional filters."""
        query: Dict[str, Any] = {}
        if student_id is not None:
            query["student_id"] = student_id
        if course_id is not None:
            query["course_id"] = course_id
        if verb_id:
            query["verb_id"] = verb_id
        if since or until:
            ts_filter: Dict[str, Any] = {}
            if since:
                ts_filter["$gte"] = since
            if until:
                ts_filter["$lte"] = until
            query["timestamp"] = ts_filter

        cursor = (
            self.collection
            .find(query, {"_id": 0})
            .sort("timestamp", -1)
            .skip(offset)
            .limit(limit)
        )
        return await cursor.to_list(length=limit)

    # ── Private helpers ────────────────────────────────────────────────

    def _build_statement(
        self,
        event: TrackActivityRequest,
        *,
        student_name: Optional[str] = None,
        student_email: Optional[str] = None,
    ) -> XAPIStatement:
        """Map an internal TrackActivityRequest to a full xAPI statement."""
        now = datetime.now(timezone.utc).isoformat()
        stmt_id = str(uuid.uuid4())

        # Actor
        actor = XAPIActor(
            objectType="Agent",
            name=student_name or f"student_{event.student_id}",
            account={
                "homePage": _BASE_IRI,
                "name": str(event.student_id),
            },
        )
        if student_email:
            actor.mbox = f"mailto:{student_email}"

        # Verb
        verb_data = _VERB_MAP.get(event.activity_type, {
            "id": "http://adlnet.gov/expapi/verbs/experienced",
            "display": {"en-US": "experienced"},
        })
        verb = XAPIVerb(**verb_data)

        # Object (Activity)
        object_iri = self._build_activity_iri(event)
        activity_type_iri = _ACTIVITY_TYPE_MAP.get(event.activity_type, "")
        activity_object = XAPIObject(
            objectType="Activity",
            id=object_iri,
            definition={
                "type": activity_type_iri,
                "name": {"en-US": self._activity_name(event)},
            },
        )

        # Result
        result = self._build_result(event)

        # Context
        context = self._build_context(event)

        return XAPIStatement(
            id=stmt_id,
            actor=actor,
            verb=verb,
            object=activity_object,
            result=result,
            context=context,
            timestamp=now,
            stored=now,
        )

    @staticmethod
    def _build_activity_iri(event: TrackActivityRequest) -> str:
        """Construct a unique Activity IRI for the learning object."""
        base = f"{_BASE_IRI}/courses/{event.course_id}"
        if event.lesson_id:
            base += f"/lessons/{event.lesson_id}"
        if event.activity_type == ActivityType.QUIZ_SUBMITTED and event.details and event.details.quiz_result:
            base += f"/quizzes/{event.details.quiz_result.quiz_id}"
        if event.activity_type == ActivityType.FLASHCARD_INTERACTION and event.details and event.details.flashcard_session:
            base += f"/flashcards/{event.details.flashcard_session.deck_id}"
        return base

    @staticmethod
    def _activity_name(event: TrackActivityRequest) -> str:
        """Human-readable activity name for xAPI."""
        parts = []
        if event.course_id:
            parts.append(f"Course {event.course_id}")
        if event.lesson_id:
            parts.append(f"Lesson {event.lesson_id}")
        return " – ".join(parts) if parts else "Learning Activity"

    @staticmethod
    def _build_result(event: TrackActivityRequest) -> Optional[XAPIResult]:
        """Build xAPI result from activity details."""
        if not event.details:
            # For completion events, at least set completion = True
            if event.activity_type in (ActivityType.LESSON_COMPLETED, ActivityType.COURSE_COMPLETED):
                return XAPIResult(completion=True, success=True)
            return None

        d = event.details
        result = XAPIResult()
        has_data = False

        # Video progress → duration + completion
        if d.video_progress:
            vp = d.video_progress
            if vp.total_duration_seconds > 0:
                result.duration = _seconds_to_iso8601(vp.current_time_seconds)
                has_data = True
            result.completion = vp.is_completed
            has_data = True

        # Quiz result → score + success + completion
        if d.quiz_result:
            qr = d.quiz_result
            result.score = {
                "raw": qr.score,
                "scaled": round(qr.percentage / 100, 2) if qr.percentage else 0,
                "min": 0,
                "max": 100,
            }
            result.success = qr.passed
            result.completion = True
            has_data = True
            if qr.time_taken_seconds > 0:
                result.duration = _seconds_to_iso8601(qr.time_taken_seconds)

        # Flashcard → success
        if d.flashcard_session:
            fc = d.flashcard_session
            if fc.is_correct is not None:
                result.success = fc.is_correct
                has_data = True

        # Time spent → duration
        if d.time_spent_seconds and d.time_spent_seconds > 0:
            result.duration = _seconds_to_iso8601(d.time_spent_seconds)
            has_data = True

        # Completion events
        if event.activity_type in (ActivityType.LESSON_COMPLETED, ActivityType.COURSE_COMPLETED):
            result.completion = True
            result.success = True
            has_data = True

        return result if has_data else None

    @staticmethod
    def _build_context(event: TrackActivityRequest) -> XAPIContext:
        """Build xAPI context with course / module hierarchy."""
        context_activities: Dict[str, list] = {}

        # Course as "grouping" activity
        if event.course_id:
            context_activities["grouping"] = [{
                "objectType": "Activity",
                "id": f"{_BASE_IRI}/courses/{event.course_id}",
                "definition": {
                    "type": "http://adlnet.gov/expapi/activities/course",
                },
            }]

        # Module as "parent" activity
        if event.module_id:
            context_activities["parent"] = [{
                "objectType": "Activity",
                "id": f"{_BASE_IRI}/courses/{event.course_id}/modules/{event.module_id}",
                "definition": {
                    "type": "http://adlnet.gov/expapi/activities/module",
                },
            }]

        extensions: Dict[str, Any] = {}
        if event.session_id:
            extensions["https://recruitlms.com/extensions/session-id"] = event.session_id
        if event.device_info:
            di = event.device_info
            extensions["https://recruitlms.com/extensions/device-info"] = {
                "device_type": di.device_type,
                "browser": di.browser,
                "os": di.os,
                "screen_resolution": di.screen_resolution,
            }
        if event.scorm_data:
            extensions["https://recruitlms.com/extensions/scorm-data"] = event.scorm_data.model_dump(mode="json", exclude_none=True)

        return XAPIContext(
            platform="RecruitLMS",
            language="en-US",
            contextActivities=context_activities or None,
            extensions=extensions or None,
        )


# ── Utility ────────────────────────────────────────────────────────────────

def _seconds_to_iso8601(seconds: int) -> str:
    """Convert seconds to ISO 8601 duration string (PT__H__M__S)."""
    if seconds <= 0:
        return "PT0S"
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60
    parts = ["PT"]
    if hours > 0:
        parts.append(f"{hours}H")
    if minutes > 0:
        parts.append(f"{minutes}M")
    if secs > 0 or (hours == 0 and minutes == 0):
        parts.append(f"{secs}S")
    return "".join(parts)
