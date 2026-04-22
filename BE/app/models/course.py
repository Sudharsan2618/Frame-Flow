"""
SQLAlchemy models for course-related tables.
Maps exactly to DB/001_postgresql_schema.sql SECTION 3, 4, 5, 6.
"""

from app.utils.time import utc_now
import enum
from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import (
    Boolean, Column, DateTime, Enum, ForeignKey, Index, Integer,
    Numeric, String, Text, UniqueConstraint, JSON,
)
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.db.postgres import Base


# ── Enums matching PostgreSQL ENUM types ──

class DifficultyLevel(str, enum.Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"


class ContentType(str, enum.Enum):
    video = "video"
    text = "text"
    pdf = "pdf"
    audio = "audio"
    image = "image"
    quiz = "quiz"
    flashcard = "flashcard"
    scorm_package = "scorm_package"
    external_link = "external_link"


class QuestionType(str, enum.Enum):
    multiple_choice = "multiple_choice"
    true_false = "true_false"
    short_answer = "short_answer"
    multiple_select = "multiple_select"


class PricingModel(str, enum.Enum):
    free = "free"
    one_time = "one_time"
    subscription = "subscription"


class EnrollmentStatus(str, enum.Enum):
    in_progress = "in_progress"
    completed = "completed"
    dropped = "dropped"
    expired = "expired"


# ── Categories ──

class Category(Base):
    __tablename__ = "categories"

    category_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    parent_category_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("categories.category_id")
    )
    icon_url: Mapped[Optional[str]] = mapped_column(String(500))
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    # Relationships
    courses: Mapped[List["Course"]] = relationship(back_populates="category")


# ── Skills ──

class Skill(Base):
    __tablename__ = "skills"

    skill_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    category: Mapped[Optional[str]] = mapped_column(String(100))
    description: Mapped[Optional[str]] = mapped_column(Text)
    icon_url: Mapped[Optional[str]] = mapped_column(String(500))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)


# ── Course Skills (junction) ──

class CourseSkill(Base):
    __tablename__ = "course_skills"

    course_skill_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    course_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("courses.course_id", ondelete="CASCADE"), nullable=False
    )
    skill_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("skills.skill_id", ondelete="CASCADE"), nullable=False
    )
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)

    __table_args__ = (UniqueConstraint("course_id", "skill_id"),)

    # Relationships
    skill: Mapped["Skill"] = relationship()


# ── Instructors (minimal for now) ──

class Instructor(Base):
    __tablename__ = "instructors"

    instructor_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, unique=True, nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    bio: Mapped[Optional[str]] = mapped_column(Text)
    headline: Mapped[Optional[str]] = mapped_column(String(255))
    expertise_areas: Mapped[Optional[str]] = mapped_column(Text)  # JSONB in real schema
    profile_picture_url: Mapped[Optional[str]] = mapped_column(String(500))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)

    # Relationships
    courses: Mapped[List["Course"]] = relationship(back_populates="instructor")


# ── Courses ──

class Course(Base):
    __tablename__ = "courses"

    course_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    short_description: Mapped[Optional[str]] = mapped_column(String(500))

    # Categorization
    category_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("categories.category_id")
    )
    difficulty_level: Mapped[DifficultyLevel] = mapped_column(
        Enum(DifficultyLevel, name="difficulty_level", create_type=False),
        default=DifficultyLevel.beginner,
    )

    # Instructor
    instructor_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("instructors.instructor_id")
    )

    # Pricing
    pricing_model: Mapped[PricingModel] = mapped_column(
        Enum(PricingModel, name="pricing_model", create_type=False),
        default=PricingModel.free,
    )
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    discount_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2))
    discount_valid_until: Mapped[Optional[datetime]] = mapped_column(DateTime)

    # Content Info
    duration_hours: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2))
    total_modules: Mapped[int] = mapped_column(Integer, default=0)
    total_lessons: Mapped[int] = mapped_column(Integer, default=0)

    # Assets (GCS URLs)
    thumbnail_url: Mapped[Optional[str]] = mapped_column(String(500))
    preview_video_url: Mapped[Optional[str]] = mapped_column(String(500))

    # Publishing
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime)

    # Stats
    total_enrollments: Mapped[int] = mapped_column(Integer, default=0)
    total_completions: Mapped[int] = mapped_column(Integer, default=0)
    average_rating: Mapped[Decimal] = mapped_column(Numeric(3, 2), default=0)
    total_reviews: Mapped[int] = mapped_column(Integer, default=0)

    # SEO
    meta_title: Mapped[Optional[str]] = mapped_column(String(255))
    meta_description: Mapped[Optional[str]] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)

    # Relationships
    category: Mapped[Optional["Category"]] = relationship(back_populates="courses")
    instructor: Mapped[Optional["Instructor"]] = relationship(back_populates="courses")
    modules: Mapped[List["Module"]] = relationship(
        back_populates="course", order_by="Module.order_index"
    )
    course_skills: Mapped[List["CourseSkill"]] = relationship()
    enrollments: Mapped[List["Enrollment"]] = relationship(back_populates="course")
    materials: Mapped[List["Material"]] = relationship(back_populates="course")


# ── Modules ──

class Module(Base):
    __tablename__ = "modules"

    module_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    course_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("courses.course_id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    duration_minutes: Mapped[Optional[int]] = mapped_column(Integer)
    is_preview: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)

    # Relationships
    course: Mapped["Course"] = relationship(back_populates="modules")
    lessons: Mapped[List["Lesson"]] = relationship(
        back_populates="module", order_by="Lesson.order_index"
    )


# ── Lessons ──

class Lesson(Base):
    __tablename__ = "lessons"

    lesson_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    module_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("modules.module_id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    content_type: Mapped[ContentType] = mapped_column(
        Enum(ContentType, name="content_type", create_type=False), nullable=False
    )
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    duration_minutes: Mapped[Optional[int]] = mapped_column(Integer)

    # Content (based on content_type)
    content_url: Mapped[Optional[str]] = mapped_column(String(500))
    video_external_id: Mapped[Optional[str]] = mapped_column(String(255))
    video_external_platform: Mapped[Optional[str]] = mapped_column(String(50))
    text_content: Mapped[Optional[str]] = mapped_column(Text)

    # Settings
    is_preview: Mapped[bool] = mapped_column(Boolean, default=False)
    is_mandatory: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)

    # Relationships
    module: Mapped["Module"] = relationship(back_populates="lessons")
    quizzes: Mapped[List["Quiz"]] = relationship(back_populates="lesson")


# ── Quizzes ──

class Quiz(Base):
    __tablename__ = "quizzes"

    quiz_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    lesson_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("lessons.lesson_id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    instructions: Mapped[Optional[str]] = mapped_column(Text)

    # Settings
    pass_percentage: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=70.00)
    time_limit_minutes: Mapped[Optional[int]] = mapped_column(Integer)
    max_attempts: Mapped[Optional[int]] = mapped_column(Integer)
    shuffle_questions: Mapped[bool] = mapped_column(Boolean, default=False)
    shuffle_options: Mapped[bool] = mapped_column(Boolean, default=False)
    show_correct_answers: Mapped[bool] = mapped_column(Boolean, default=True)

    # Stats
    total_questions: Mapped[int] = mapped_column(Integer, default=0)
    total_attempts: Mapped[int] = mapped_column(Integer, default=0)
    average_score: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)

    # Relationships
    lesson: Mapped["Lesson"] = relationship(back_populates="quizzes")
    questions: Mapped[List["QuizQuestion"]] = relationship(
        back_populates="quiz", order_by="QuizQuestion.order_index"
    )


# ── Quiz Questions ──

class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    question_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    quiz_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("quizzes.quiz_id", ondelete="CASCADE"), nullable=False
    )
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    question_type: Mapped[QuestionType] = mapped_column(
        Enum(QuestionType, name="question_type", create_type=False), nullable=False
    )
    options: Mapped[Optional[dict]] = mapped_column(JSON)  # JSONB array
    correct_answer: Mapped[Optional[str]] = mapped_column(Text)
    explanation: Mapped[Optional[str]] = mapped_column(Text)
    points: Mapped[int] = mapped_column(Integer, default=1)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    # Relationships
    quiz: Mapped["Quiz"] = relationship(back_populates="questions")


# ── Flashcard Decks ──

class FlashcardDeck(Base):
    __tablename__ = "flashcard_decks"

    deck_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    lesson_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("lessons.lesson_id", ondelete="CASCADE")
    )
    course_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("courses.course_id", ondelete="CASCADE")
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    total_cards: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)

    # Relationships
    flashcards: Mapped[List["Flashcard"]] = relationship(back_populates="deck")


class Flashcard(Base):
    __tablename__ = "flashcards"

    flashcard_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    deck_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("flashcard_decks.deck_id", ondelete="CASCADE"), nullable=False
    )
    front_content: Mapped[str] = mapped_column(Text, nullable=False)
    back_content: Mapped[str] = mapped_column(Text, nullable=False)
    front_image_url: Mapped[Optional[str]] = mapped_column(String(500))
    back_image_url: Mapped[Optional[str]] = mapped_column(String(500))
    order_index: Mapped[Optional[int]] = mapped_column(Integer)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    # Relationships
    deck: Mapped["FlashcardDeck"] = relationship(back_populates="flashcards")


# ── Enrollments ──

class Enrollment(Base):
    __tablename__ = "enrollments"

    enrollment_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    student_id: Mapped[int] = mapped_column(Integer, nullable=False)
    course_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("courses.course_id", ondelete="CASCADE"), nullable=False
    )

    status: Mapped[EnrollmentStatus] = mapped_column(
        Enum(EnrollmentStatus, name="enrollment_status", create_type=False),
        default=EnrollmentStatus.in_progress,
    )
    progress_percentage: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=0)

    enrolled_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime)

    certificate_issued: Mapped[bool] = mapped_column(Boolean, default=False)
    certificate_url: Mapped[Optional[str]] = mapped_column(String(500))
    certificate_issued_at: Mapped[Optional[datetime]] = mapped_column(DateTime)

    payment_id: Mapped[Optional[int]] = mapped_column(Integer)

    __table_args__ = (UniqueConstraint("student_id", "course_id"),)

    # Relationships
    course: Mapped["Course"] = relationship(back_populates="enrollments")
    lesson_progress: Mapped[List["LessonProgress"]] = relationship(back_populates="enrollment")


# ── Lesson Progress ──

class LessonProgress(Base):
    __tablename__ = "lesson_progress"

    progress_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    enrollment_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("enrollments.enrollment_id", ondelete="CASCADE"), nullable=False
    )
    lesson_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("lessons.lesson_id", ondelete="CASCADE"), nullable=False
    )

    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    progress_percentage: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=0)
    time_spent_seconds: Mapped[int] = mapped_column(Integer, default=0)
    video_position_seconds: Mapped[int] = mapped_column(Integer, default=0)

    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    last_accessed_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    __table_args__ = (UniqueConstraint("enrollment_id", "lesson_id"),)

    # Relationships
    enrollment: Mapped["Enrollment"] = relationship(back_populates="lesson_progress")


# ── Quiz Attempts ──

class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    attempt_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    enrollment_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("enrollments.enrollment_id", ondelete="CASCADE"), nullable=False
    )
    quiz_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("quizzes.quiz_id", ondelete="CASCADE"), nullable=False
    )

    score: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    percentage: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    passed: Mapped[bool] = mapped_column(Boolean, nullable=False)

    started_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    completed_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    time_taken_seconds: Mapped[Optional[int]] = mapped_column(Integer)

    total_questions: Mapped[int] = mapped_column(Integer, nullable=False)
    correct_answers: Mapped[int] = mapped_column(Integer, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)


# ── Materials ──

class Material(Base):
    __tablename__ = "materials"

    material_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)

    course_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("courses.course_id", ondelete="SET NULL")
    )
    lesson_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("lessons.lesson_id", ondelete="SET NULL")
    )

    file_type: Mapped[str] = mapped_column(String(50), nullable=False)
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    file_size_bytes: Mapped[Optional[int]] = mapped_column(Integer)

    pricing_model: Mapped[PricingModel] = mapped_column(
        Enum(PricingModel, name="pricing_model", create_type=False),
        default=PricingModel.free,
    )
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    currency: Mapped[str] = mapped_column(String(3), default="INR")

    download_count: Mapped[int] = mapped_column(Integer, default=0)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)

    # Relationships
    course: Mapped[Optional["Course"]] = relationship(back_populates="materials")
