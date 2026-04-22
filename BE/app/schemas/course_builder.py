"""Pydantic schemas for the admin course builder API."""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


# ══════════════════════════════════════════════════════════════════════════
# UPLOAD
# ══════════════════════════════════════════════════════════════════════════

class SignedUploadRequest(BaseModel):
    filename: str
    content_type: str
    course_slug: Optional[str] = None


class SignedUploadResponse(BaseModel):
    upload_url: str
    blob_name: str
    public_url: str


# ══════════════════════════════════════════════════════════════════════════
# CATEGORY
# ══════════════════════════════════════════════════════════════════════════

class CategoryCreateRequest(BaseModel):
    name: str
    slug: Optional[str] = None
    description: Optional[str] = None
    parent_category_id: Optional[int] = None
    icon_url: Optional[str] = None
    display_order: int = 0


class CategoryUpdateRequest(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    parent_category_id: Optional[int] = None
    icon_url: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    category_id: int
    name: str
    slug: str
    description: Optional[str] = None
    parent_category_id: Optional[int] = None
    icon_url: Optional[str] = None
    display_order: int = 0
    is_active: bool = True


# ══════════════════════════════════════════════════════════════════════════
# SKILL
# ══════════════════════════════════════════════════════════════════════════

class SkillCreateRequest(BaseModel):
    name: str
    slug: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    icon_url: Optional[str] = None


class SkillUpdateRequest(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    icon_url: Optional[str] = None
    is_active: Optional[bool] = None


class SkillOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    skill_id: int
    name: str
    slug: str
    category: Optional[str] = None
    description: Optional[str] = None
    icon_url: Optional[str] = None
    is_active: bool = True


# ══════════════════════════════════════════════════════════════════════════
# INSTRUCTOR
# ══════════════════════════════════════════════════════════════════════════

class InstructorCreateRequest(BaseModel):
    first_name: str
    last_name: str
    user_id: Optional[int] = None  # If not provided, a user will be auto-created
    bio: Optional[str] = None
    headline: Optional[str] = None
    expertise_areas: Optional[str] = None
    profile_picture_url: Optional[str] = None


class InstructorUpdateRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    bio: Optional[str] = None
    headline: Optional[str] = None
    expertise_areas: Optional[str] = None
    profile_picture_url: Optional[str] = None
    is_active: Optional[bool] = None


class InstructorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    instructor_id: int
    first_name: str
    last_name: str
    bio: Optional[str] = None
    headline: Optional[str] = None
    expertise_areas: Optional[str] = None
    profile_picture_url: Optional[str] = None
    is_active: bool = True


# ══════════════════════════════════════════════════════════════════════════
# COURSE
# ══════════════════════════════════════════════════════════════════════════

class CourseCreateRequest(BaseModel):
    title: str
    slug: Optional[str] = None
    description: Optional[str] = None
    short_description: Optional[str] = None
    category_id: Optional[int] = None
    difficulty_level: str = "beginner"
    instructor_id: Optional[int] = None
    pricing_model: str = "free"
    price: float = 0
    currency: str = "INR"
    discount_price: Optional[float] = None
    duration_hours: Optional[float] = None
    thumbnail_url: Optional[str] = None
    preview_video_url: Optional[str] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    skill_ids: List[int] = []


class CourseUpdateRequest(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    short_description: Optional[str] = None
    category_id: Optional[int] = None
    difficulty_level: Optional[str] = None
    instructor_id: Optional[int] = None
    pricing_model: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    discount_price: Optional[float] = None
    duration_hours: Optional[float] = None
    thumbnail_url: Optional[str] = None
    preview_video_url: Optional[str] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    skill_ids: Optional[List[int]] = None


# ══════════════════════════════════════════════════════════════════════════
# MODULE
# ══════════════════════════════════════════════════════════════════════════

class ModuleCreateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    is_preview: bool = False


class ModuleUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    is_preview: Optional[bool] = None


class ReorderRequest(BaseModel):
    ordered_ids: List[int]


# ══════════════════════════════════════════════════════════════════════════
# LESSON
# ══════════════════════════════════════════════════════════════════════════

class LessonCreateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    content_type: str
    duration_minutes: Optional[int] = None
    content_url: Optional[str] = None
    video_external_id: Optional[str] = None
    video_external_platform: Optional[str] = None
    text_content: Optional[str] = None
    is_preview: bool = False
    is_mandatory: bool = True


class LessonUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    content_type: Optional[str] = None
    duration_minutes: Optional[int] = None
    content_url: Optional[str] = None
    video_external_id: Optional[str] = None
    video_external_platform: Optional[str] = None
    text_content: Optional[str] = None
    is_preview: Optional[bool] = None
    is_mandatory: Optional[bool] = None


# ══════════════════════════════════════════════════════════════════════════
# QUIZ
# ══════════════════════════════════════════════════════════════════════════

class QuizQuestionInput(BaseModel):
    question_text: str
    question_type: str = "multiple_choice"
    options: Optional[list] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    points: int = 1


class QuizCreateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    instructions: Optional[str] = None
    pass_percentage: float = 70.0
    time_limit_minutes: Optional[int] = None
    max_attempts: Optional[int] = None
    shuffle_questions: bool = False
    shuffle_options: bool = False
    show_correct_answers: bool = True
    questions: List[QuizQuestionInput] = []


class QuizQuestionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    question_id: int
    question_text: str
    question_type: str
    options: Optional[list] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    points: int = 1
    order_index: int = 0


class QuizOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    quiz_id: int
    title: str
    description: Optional[str] = None
    instructions: Optional[str] = None
    pass_percentage: float = 70.0
    time_limit_minutes: Optional[int] = None
    max_attempts: Optional[int] = None
    shuffle_questions: bool = False
    shuffle_options: bool = False
    show_correct_answers: bool = True
    total_questions: int = 0
    questions: List[QuizQuestionOut] = []


# ══════════════════════════════════════════════════════════════════════════
# FLASHCARD
# ══════════════════════════════════════════════════════════════════════════

class FlashcardInput(BaseModel):
    front_content: str
    back_content: str
    front_image_url: Optional[str] = None
    back_image_url: Optional[str] = None


class FlashcardDeckCreateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    cards: List[FlashcardInput] = []


class FlashcardItemOut(BaseModel):
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
    total_cards: int = 0
    cards: List[FlashcardItemOut] = []


# ══════════════════════════════════════════════════════════════════════════
# BUILDER COMPOSITE RESPONSES
# ══════════════════════════════════════════════════════════════════════════

class LessonBuilderOut(BaseModel):
    lesson_id: int
    title: str
    description: Optional[str] = None
    content_type: str
    order_index: int
    duration_minutes: Optional[int] = None
    content_url: Optional[str] = None
    video_external_id: Optional[str] = None
    video_external_platform: Optional[str] = None
    text_content: Optional[str] = None
    is_preview: bool = False
    is_mandatory: bool = True


class ModuleBuilderOut(BaseModel):
    module_id: int
    title: str
    description: Optional[str] = None
    order_index: int
    duration_minutes: Optional[int] = None
    is_preview: bool = False
    lessons: List[LessonBuilderOut] = []


class CourseBuilderOut(BaseModel):
    course_id: int
    title: str
    slug: str
    description: Optional[str] = None
    short_description: Optional[str] = None
    category_id: Optional[int] = None
    difficulty_level: str = "beginner"
    instructor_id: Optional[int] = None
    pricing_model: str = "free"
    price: float = 0
    currency: str = "INR"
    discount_price: Optional[float] = None
    duration_hours: Optional[float] = None
    thumbnail_url: Optional[str] = None
    preview_video_url: Optional[str] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    is_published: bool = False
    total_modules: int = 0
    total_lessons: int = 0
    skill_ids: List[int] = []
    modules: List[ModuleBuilderOut] = []
