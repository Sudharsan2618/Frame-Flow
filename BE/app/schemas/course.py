"""Pydantic schemas for course API request/response models."""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


# ── Shared ──

class SkillOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    skill_id: int
    name: str
    slug: str
    category: Optional[str] = None


class InstructorBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    instructor_id: int
    first_name: str
    last_name: str
    headline: Optional[str] = None
    profile_picture_url: Optional[str] = None

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    category_id: int
    name: str
    slug: str
    description: Optional[str] = None
    icon_url: Optional[str] = None


# ── Course Listing ──

class CourseListItem(BaseModel):
    """Used for course catalog / listing pages."""
    model_config = ConfigDict(from_attributes=True)

    course_id: int
    title: str
    slug: str
    short_description: Optional[str] = None
    difficulty_level: str
    pricing_model: str
    price: Decimal
    currency: str
    discount_price: Optional[Decimal] = None
    duration_hours: Optional[Decimal] = None
    total_modules: int
    total_lessons: int
    thumbnail_url: Optional[str] = None
    is_published: bool
    total_enrollments: int
    average_rating: Decimal
    total_reviews: int
    created_at: datetime

    # Nested
    category: Optional[CategoryOut] = None
    instructor: Optional[InstructorBrief] = None
    skills: List[str] = []


class CourseListResponse(BaseModel):
    courses: List[CourseListItem]
    total: int
    page: int
    page_size: int


# ── Lesson ──

class LessonOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    lesson_id: int
    title: str
    description: Optional[str] = None
    content_type: str
    order_index: int
    duration_minutes: Optional[int] = None
    is_preview: bool
    is_mandatory: bool

    # Content (only returned for enrolled students or preview lessons)
    content_url: Optional[str] = None
    video_external_id: Optional[str] = None
    video_external_platform: Optional[str] = None
    text_content: Optional[str] = None
    
    # Linked Quiz
    quiz_id: Optional[int] = None


class LessonBrief(BaseModel):
    """Lesson summary without content — for curriculum view."""
    model_config = ConfigDict(from_attributes=True)

    lesson_id: int
    title: str
    content_type: str
    order_index: int
    duration_minutes: Optional[int] = None
    is_preview: bool
    is_mandatory: bool


# ── Quiz ──

class QuizQuestionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    question_id: int
    question_text: str
    question_type: str
    options: Optional[list] = None  # stripped of is_correct for students
    points: int
    order_index: int


class QuizOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    quiz_id: int
    title: str
    description: Optional[str] = None
    instructions: Optional[str] = None
    pass_percentage: Decimal
    time_limit_minutes: Optional[int] = None
    max_attempts: Optional[int] = None
    total_questions: int
    questions: List[QuizQuestionOut] = []


class QuizSubmission(BaseModel):
    """Student's quiz answer submission."""
    answers: dict  # {question_id: selected_option_index_or_text}


class QuizResultOut(BaseModel):
    score: Decimal
    percentage: Decimal
    passed: bool
    total_questions: int
    correct_answers: int
    time_taken_seconds: Optional[int] = None


# ── Module (with lessons) ──

class ModuleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    module_id: int
    title: str
    description: Optional[str] = None
    order_index: int
    duration_minutes: Optional[int] = None
    is_preview: bool
    lessons: List[LessonBrief] = []


# ── Course Detail ──

class CourseDetail(BaseModel):
    """Full course detail with curriculum."""
    model_config = ConfigDict(from_attributes=True)

    course_id: int
    title: str
    slug: str
    description: Optional[str] = None
    short_description: Optional[str] = None
    difficulty_level: str
    pricing_model: str
    price: Decimal
    currency: str
    discount_price: Optional[Decimal] = None
    duration_hours: Optional[Decimal] = None
    total_modules: int
    total_lessons: int
    thumbnail_url: Optional[str] = None
    preview_video_url: Optional[str] = None
    is_published: bool
    total_enrollments: int
    average_rating: Decimal
    total_reviews: int
    created_at: datetime

    # Nested
    category: Optional[CategoryOut] = None
    instructor: Optional[InstructorBrief] = None
    skills: List[str] = []
    modules: List[ModuleOut] = []


# ── Enrollment ──

class EnrollRequest(BaseModel):
    student_id: int  # will be replaced by JWT user later


class EnrollmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    enrollment_id: int
    student_id: int
    course_id: int
    status: str
    progress_percentage: Decimal
    enrolled_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    certificate_issued: bool = False
    certificate_url: Optional[str] = None
    certificate_issued_at: Optional[datetime] = None

    course: Optional[CourseListItem] = None


# ── Lesson Progress ──

class ProgressUpdate(BaseModel):
    """Update lesson progress."""
    lesson_id: int
    progress_percentage: float = 0
    time_spent_seconds: int = 0
    video_position_seconds: int = 0
    is_completed: bool = False


class LessonProgressOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    progress_id: int
    lesson_id: int
    is_completed: bool
    progress_percentage: Decimal
    time_spent_seconds: int
    video_position_seconds: int
    last_accessed_at: datetime


# ── Material ──

class MaterialOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    material_id: int
    title: str
    description: Optional[str] = None
    file_type: str
    file_url: str
    file_size_bytes: Optional[int] = None
    pricing_model: str
    price: Decimal
    currency: str
    download_count: int
    course_id: Optional[int] = None


# ── Flashcard ──

class FlashcardOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    flashcard_id: int
    front_content: str
    back_content: str
    front_image_url: Optional[str] = None
    back_image_url: Optional[str] = None
    order_index: Optional[int] = None


class FlashcardDeckOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    deck_id: int
    title: str
    description: Optional[str] = None
    total_cards: int
    flashcards: List[FlashcardOut] = []
