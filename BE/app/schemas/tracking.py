"""Pydantic schemas for learning analytics & xAPI tracking.

These models define the request/response contracts for all tracking endpoints.
"""

from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
import uuid


# ── Enums ──────────────────────────────────────────────────────────────────

class ActivityType(str, Enum):
    """All trackable learning activity types."""
    LESSON_STARTED = "lesson_started"
    LESSON_COMPLETED = "lesson_completed"
    VIDEO_WATCHED = "video_watched"
    VIDEO_PAUSED = "video_paused"
    VIDEO_SEEKED = "video_seeked"
    DOCUMENT_VIEWED = "document_viewed"
    AUDIO_PLAYED = "audio_played"
    QUIZ_STARTED = "quiz_started"
    QUIZ_SUBMITTED = "quiz_submitted"
    FLASHCARD_INTERACTION = "flashcard_interaction"
    NOTE_TAKEN = "note_taken"
    RESOURCE_DOWNLOADED = "resource_downloaded"
    PAGE_VIEWED = "page_viewed"
    COURSE_ENROLLED = "course_enrolled"
    COURSE_COMPLETED = "course_completed"


# ── Device / Context ───────────────────────────────────────────────────────

class DeviceInfo(BaseModel):
    """Client device metadata."""
    device_type: Optional[str] = None          # desktop | mobile | tablet
    browser: Optional[str] = None
    os: Optional[str] = None
    screen_resolution: Optional[str] = None


# ── Activity Detail sub-schemas ────────────────────────────────────────────

class VideoProgress(BaseModel):
    """Video-specific progress data."""
    current_time_seconds: int = 0
    total_duration_seconds: int = 0
    percentage_watched: float = 0.0
    playback_rate: float = 1.0
    is_completed: bool = False


class QuizResult(BaseModel):
    """Quiz attempt result details."""
    quiz_id: int
    attempt_id: Optional[int] = None
    score: float = 0.0
    percentage: float = 0.0
    passed: bool = False
    time_taken_seconds: int = 0
    answers: Optional[List[Dict[str, Any]]] = None


class FlashcardSession(BaseModel):
    """Flashcard review details."""
    deck_id: int
    card_id: Optional[int] = None
    mastery_level: int = 0                     # 0-5
    is_correct: Optional[bool] = None
    response_time_ms: Optional[int] = None
    next_review_date: Optional[datetime] = None


class ActivityDetails(BaseModel):
    """Container for activity-type-specific details."""
    video_progress: Optional[VideoProgress] = None
    quiz_result: Optional[QuizResult] = None
    flashcard_session: Optional[FlashcardSession] = None
    time_spent_seconds: Optional[int] = None
    scroll_depth_percentage: Optional[float] = None


# ── SCORM data ─────────────────────────────────────────────────────────────

class ScormData(BaseModel):
    """SCORM 1.2 / 2004 data model values."""
    cmi_core_lesson_status: Optional[str] = None
    cmi_core_lesson_location: Optional[str] = None
    cmi_core_score_raw: Optional[float] = None
    cmi_core_score_min: Optional[float] = None
    cmi_core_score_max: Optional[float] = None
    cmi_core_total_time: Optional[str] = None
    cmi_suspend_data: Optional[str] = None


# ──────────────────────────────────────────────────────────────────────────
# REQUEST MODELS (Frontend → Backend)
# ──────────────────────────────────────────────────────────────────────────

class TrackActivityRequest(BaseModel):
    """Single learning-activity event sent by the frontend."""
    student_id: int
    course_id: int
    module_id: Optional[int] = None
    lesson_id: Optional[int] = None
    activity_type: ActivityType
    session_id: Optional[str] = None
    user_id: Optional[int] = None
    details: Optional[ActivityDetails] = None
    scorm_data: Optional[ScormData] = None
    device_info: Optional[DeviceInfo] = None


class TrackBatchRequest(BaseModel):
    """Batch of activity events (for offline-then-sync scenarios)."""
    events: List[TrackActivityRequest]


class StartSessionRequest(BaseModel):
    """Start a new learning session."""
    user_id: int
    device_info: Optional[DeviceInfo] = None
    location_info: Optional[Dict[str, str]] = None


class EndSessionRequest(BaseModel):
    """End an active learning session."""
    session_id: str
    logout_type: Optional[str] = "manual"      # manual | timeout | forced


class HeartbeatRequest(BaseModel):
    """Periodic heartbeat to keep the session alive."""
    session_id: str
    current_page: Optional[str] = None


# ──────────────────────────────────────────────────────────────────────────
# RESPONSE MODELS (Backend → Frontend)
# ──────────────────────────────────────────────────────────────────────────

class TrackActivityResponse(BaseModel):
    """Acknowledgement after recording an activity event."""
    success: bool = True
    activity_id: Optional[str] = None          # MongoDB _id
    xapi_statement_id: Optional[str] = None    # Corresponding xAPI statement UUID
    message: str = "Activity recorded"


class TrackBatchResponse(BaseModel):
    """Acknowledgement after recording a batch."""
    success: bool = True
    recorded_count: int = 0
    failed_count: int = 0
    message: str = "Batch recorded"


class SessionResponse(BaseModel):
    """Session lifecycle response."""
    session_id: str
    started_at: Optional[datetime] = None
    message: str = ""


class HeartbeatResponse(BaseModel):
    """Heartbeat acknowledgement."""
    success: bool = True
    session_id: str
    last_activity_at: datetime


# ──────────────────────────────────────────────────────────────────────────
# ANALYTICS QUERY MODELS (for admin dashboards later)
# ──────────────────────────────────────────────────────────────────────────

class StudentActivitySummary(BaseModel):
    """Aggregated activity summary for a student in a course."""
    student_id: int
    course_id: int
    total_time_spent_seconds: int = 0
    lessons_started: int = 0
    lessons_completed: int = 0
    videos_watched: int = 0
    quizzes_taken: int = 0
    flashcards_reviewed: int = 0
    resources_downloaded: int = 0
    last_activity_at: Optional[datetime] = None


class CourseEngagementSummary(BaseModel):
    """Engagement metrics for a course."""
    course_id: int
    active_students: int = 0
    total_activities: int = 0
    avg_time_spent_minutes: float = 0.0
    completion_rate: float = 0.0
    activity_breakdown: Dict[str, int] = {}


# ──────────────────────────────────────────────────────────────────────────
# xAPI STANDARD MODELS (for /tracking/xapi endpoint)
# ──────────────────────────────────────────────────────────────────────────

class XAPIActor(BaseModel):
    """xAPI Actor (who performed the action)."""
    objectType: str = "Agent"
    name: Optional[str] = None
    mbox: Optional[str] = None                 # mailto:user@example.com
    account: Optional[Dict[str, str]] = None   # {"homePage": "...", "name": "..."}


class XAPIVerb(BaseModel):
    """xAPI Verb (what was done)."""
    id: str                                    # IRI e.g. http://adlnet.gov/expapi/verbs/completed
    display: Optional[Dict[str, str]] = None   # e.g. {"en-US": "completed"}


class XAPIObject(BaseModel):
    """xAPI Object (what was acted upon)."""
    objectType: str = "Activity"
    id: str                                    # Activity IRI
    definition: Optional[Dict[str, Any]] = None


class XAPIResult(BaseModel):
    """xAPI Result (outcome)."""
    score: Optional[Dict[str, float]] = None   # {"scaled": 0.8, "raw": 80, "min": 0, "max": 100}
    success: Optional[bool] = None
    completion: Optional[bool] = None
    response: Optional[str] = None
    duration: Optional[str] = None             # ISO 8601 duration


class XAPIContext(BaseModel):
    """xAPI Context (additional context)."""
    registration: Optional[str] = None         # Enrollment UUID
    instructor: Optional[Dict[str, Any]] = None
    contextActivities: Optional[Dict[str, List[Dict]]] = None
    platform: Optional[str] = "RecruitLMS"
    language: Optional[str] = "en-US"
    extensions: Optional[Dict[str, Any]] = None


class XAPIStatement(BaseModel):
    """A full xAPI statement following the Experience API spec."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    actor: XAPIActor
    verb: XAPIVerb
    object: XAPIObject
    result: Optional[XAPIResult] = None
    context: Optional[XAPIContext] = None
    timestamp: Optional[str] = None
    stored: Optional[str] = None
    authority: Optional[Dict[str, Any]] = None


class XAPIStatementRequest(BaseModel):
    """Wrapper for submitting an xAPI statement with platform metadata."""
    student_id: int
    course_id: Optional[int] = None
    statement: XAPIStatement
