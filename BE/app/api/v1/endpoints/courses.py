"""Course API endpoints — student-facing course content APIs."""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.postgres import get_db
from app.services.course_service import CourseService
from app.api.dependencies import get_current_user_id
from app.schemas.course import (
    CourseListResponse, CourseDetail,
    LessonOut, EnrollRequest, EnrollmentOut,
    ProgressUpdate, LessonProgressOut,
    QuizOut, QuizSubmission, QuizResultOut,
    MaterialOut, FlashcardDeckOut, CategoryOut,
)

router = APIRouter(prefix="/courses", tags=["Courses"])


def get_service(db: AsyncSession = Depends(get_db)) -> CourseService:
    return CourseService(db)


# ── Course Discovery ──

@router.get("", response_model=CourseListResponse)
async def list_courses(
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=50),
    category: Optional[str] = Query(None, description="Filter by category slug"),
    difficulty: Optional[str] = Query(None, description="beginner|intermediate|advanced"),
    pricing: Optional[str] = Query(None, description="free|one_time|subscription"),
    search: Optional[str] = Query(None, description="Search in title/description"),
    service: CourseService = Depends(get_service),
):
    """List published courses with filters and pagination."""
    return await service.list_courses(
        page=page, page_size=page_size,
        category=category, difficulty=difficulty,
        pricing=pricing, search=search,
    )


@router.get("/categories", response_model=list[CategoryOut])
async def list_categories(service: CourseService = Depends(get_service)):
    """List all active course categories."""
    return await service.get_categories()


@router.get("/{slug}", response_model=CourseDetail)
async def get_course(slug: str, service: CourseService = Depends(get_service)):
    """Get full course detail with curriculum (modules + lessons)."""
    course = await service.get_course_detail(slug)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


# ── Lesson Content ──

@router.get("/lessons/{lesson_id}", response_model=LessonOut)
async def get_lesson(lesson_id: int, service: CourseService = Depends(get_service)):
    """Get lesson content (video, text, PDF URL, etc.)."""
    lesson = await service.get_lesson(lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return lesson


# ── Quiz ──

@router.get("/quizzes/{quiz_id}", response_model=QuizOut)
async def get_quiz(quiz_id: int, service: CourseService = Depends(get_service)):
    """Get quiz with questions (correct answers stripped)."""
    quiz = await service.get_quiz(quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return quiz


@router.post("/quizzes/{quiz_id}/submit", response_model=QuizResultOut)
async def submit_quiz(
    quiz_id: int,
    submission: QuizSubmission,
    enrollment_id: int = Query(..., description="Enrollment ID"),
    service: CourseService = Depends(get_service),
):
    """Submit quiz answers and get graded result."""
    try:
        return await service.submit_quiz(quiz_id, enrollment_id, submission)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Materials ──

@router.get("/{course_id}/materials", response_model=list[MaterialOut])
async def get_materials(course_id: int, service: CourseService = Depends(get_service)):
    """Get downloadable materials for a course."""
    return await service.get_materials(course_id)


# ── Flashcards ──

@router.get("/flashcards/{deck_id}", response_model=FlashcardDeckOut)
async def get_flashcard_deck(
    deck_id: int, service: CourseService = Depends(get_service)
):
    """Get flashcard deck with all cards."""
    deck = await service.get_flashcard_deck(deck_id)
    if not deck:
        raise HTTPException(status_code=404, detail="Flashcard deck not found")
    return deck


# ── Student Endpoints (Enrollment & Progress) ──

student_router = APIRouter(prefix="/students", tags=["Student Learning"])


@student_router.post("/enroll/{course_id}", response_model=EnrollmentOut)
async def enroll_in_course(
    course_id: int,
    body: EnrollRequest,
    service: CourseService = Depends(get_service),
):
    """Enroll a student in a course."""
    try:
        enrollment = await service.enroll_student(body.student_id, course_id)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

    # Regenerate student embedding in background (non-blocking)
    import asyncio
    async def _update_embedding(sid: int):
        try:
            from app.services.embedding_service import generate_student_embedding
            import logging
            emb = await generate_student_embedding(sid)
            logging.getLogger(__name__).info(
                f"Enrollment embedding for student {sid}: {emb.get('status') if emb else 'no_data'}"
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Enrollment embedding failed: {e}")

    asyncio.create_task(_update_embedding(body.student_id))

    return enrollment



@student_router.get("/materials/all", response_model=list[dict])
async def get_all_materials_for_user(
    user_id: int = Depends(get_current_user_id),
    service: CourseService = Depends(get_service),
):
    """Get all downloadable materials across all enrolled courses."""
    return await service.get_all_materials_by_user(user_id)

@student_router.get("/enrollments", response_model=list[EnrollmentOut])
async def get_enrollments(
    student_id: int = Query(..., description="Student ID"),
    service: CourseService = Depends(get_service),
):
    """Get all enrollments for a student."""
    return await service.get_enrollments(student_id)


@student_router.post(
    "/enrollments/{course_id}/progress",
    response_model=LessonProgressOut,
)
async def update_progress(
    course_id: int,
    body: ProgressUpdate,
    student_id: int = Query(..., description="Student ID"),
    service: CourseService = Depends(get_service),
):
    """Update lesson progress (video position, completion, time spent)."""
    try:
        return await service.update_progress(student_id, course_id, body)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@student_router.get(
    "/enrollments/{course_id}/progress",
    response_model=list[LessonProgressOut],
)
async def get_progress(
    course_id: int,
    student_id: int = Query(..., description="Student ID"),
    service: CourseService = Depends(get_service),
):
    """Get all lesson progress for a student's enrollment."""
    return await service.get_course_progress(student_id, course_id)
