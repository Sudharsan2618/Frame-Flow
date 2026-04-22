"""Course repository — all database queries for course content."""

from app.utils.time import utc_now
from typing import List, Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, joinedload

from app.models.course import (
    Course, Module, Lesson, Quiz, QuizQuestion,
    Enrollment, LessonProgress, QuizAttempt,
    Category, CourseSkill, Material, FlashcardDeck,
)


class CourseRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Course Listing ──

    async def get_courses(
        self,
        page: int = 1,
        page_size: int = 12,
        category_slug: Optional[str] = None,
        difficulty: Optional[str] = None,
        pricing: Optional[str] = None,
        search: Optional[str] = None,
    ) -> tuple[List[Course], int]:
        """Get paginated, filtered course list."""
        query = (
            select(Course)
            .where(Course.is_published == True)
            .options(
                joinedload(Course.category),
                joinedload(Course.instructor),
                selectinload(Course.course_skills).joinedload(CourseSkill.skill),
            )
        )

        # Filters
        if category_slug:
            query = query.join(Category).where(Category.slug == category_slug)
        if difficulty:
            query = query.where(Course.difficulty_level == difficulty)
        if pricing:
            query = query.where(Course.pricing_model == pricing)
        if search:
            query = query.where(
                Course.title.ilike(f"%{search}%")
                | Course.short_description.ilike(f"%{search}%")
            )

        # Count
        count_query = select(func.count()).select_from(
            query.with_only_columns(Course.course_id).subquery()
        )
        total = (await self.db.execute(count_query)).scalar() or 0

        # Paginate & order
        query = query.order_by(Course.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.db.execute(query)
        courses = result.unique().scalars().all()
        return list(courses), total

    # ── Course Detail ──

    async def get_course_by_slug(self, slug: str) -> Optional[Course]:
        """Get full course detail with modules, lessons, and skills."""
        query = (
            select(Course)
            .where(Course.slug == slug, Course.is_published == True)
            .options(
                joinedload(Course.category),
                joinedload(Course.instructor),
                selectinload(Course.course_skills).joinedload(CourseSkill.skill),
                selectinload(Course.modules).selectinload(Module.lessons),
                selectinload(Course.materials),
            )
        )
        result = await self.db.execute(query)
        return result.unique().scalars().first()

    async def get_course_by_id(self, course_id: int) -> Optional[Course]:
        query = (
            select(Course)
            .where(Course.course_id == course_id)
            .options(
                joinedload(Course.category),
                joinedload(Course.instructor),
                selectinload(Course.modules).selectinload(Module.lessons),
            )
        )
        result = await self.db.execute(query)
        return result.unique().scalars().first()

    # ── Lesson Content ──

    async def get_lesson(self, lesson_id: int) -> Optional[Lesson]:
        query = (
            select(Lesson)
            .where(Lesson.lesson_id == lesson_id)
            .options(selectinload(Lesson.quizzes).selectinload(Quiz.questions))
        )
        result = await self.db.execute(query)
        return result.unique().scalars().first()

    # ── Quiz ──

    async def get_quiz(self, quiz_id: int) -> Optional[Quiz]:
        query = (
            select(Quiz)
            .where(Quiz.quiz_id == quiz_id)
            .options(selectinload(Quiz.questions))
        )
        result = await self.db.execute(query)
        return result.unique().scalars().first()

    # ── Enrollment ──

    async def get_enrollment(
        self, student_id: int, course_id: int
    ) -> Optional[Enrollment]:
        query = select(Enrollment).where(
            Enrollment.student_id == student_id,
            Enrollment.course_id == course_id,
        )
        result = await self.db.execute(query)
        return result.scalars().first()

    async def get_student_enrollments(self, student_id: int) -> List[Enrollment]:
        query = (
            select(Enrollment)
            .where(Enrollment.student_id == student_id)
            .options(
                joinedload(Enrollment.course).joinedload(Course.category),
                joinedload(Enrollment.course).joinedload(Course.instructor),
            )
            .order_by(Enrollment.enrolled_at.desc())
        )
        result = await self.db.execute(query)
        return list(result.unique().scalars().all())

    async def create_enrollment(self, student_id: int, course_id: int) -> Enrollment:
        enrollment = Enrollment(student_id=student_id, course_id=course_id)
        self.db.add(enrollment)
        await self.db.flush()
        await self.db.refresh(enrollment)
        return enrollment

    # ── Lesson Progress ──

    async def get_lesson_progress(
        self, enrollment_id: int, lesson_id: int
    ) -> Optional[LessonProgress]:
        query = select(LessonProgress).where(
            LessonProgress.enrollment_id == enrollment_id,
            LessonProgress.lesson_id == lesson_id,
        )
        result = await self.db.execute(query)
        return result.scalars().first()

    async def get_all_progress(self, enrollment_id: int) -> List[LessonProgress]:
        query = select(LessonProgress).where(
            LessonProgress.enrollment_id == enrollment_id
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def upsert_lesson_progress(
        self,
        enrollment_id: int,
        lesson_id: int,
        progress_percentage: float,
        time_spent_seconds: int,
        video_position_seconds: int,
        is_completed: bool,
    ) -> LessonProgress:
        existing = await self.get_lesson_progress(enrollment_id, lesson_id)
        if existing:
            existing.progress_percentage = max(
                float(existing.progress_percentage), progress_percentage
            )
            from datetime import datetime
            existing.time_spent_seconds += time_spent_seconds
            if video_position_seconds > 0:
                existing.video_position_seconds = video_position_seconds
            if is_completed:
                existing.is_completed = True
                existing.completed_at = utc_now()
            existing.last_accessed_at = utc_now()
            await self.db.flush()
            return existing
        else:
            from datetime import datetime
            progress = LessonProgress(
                enrollment_id=enrollment_id,
                lesson_id=lesson_id,
                progress_percentage=progress_percentage,
                time_spent_seconds=time_spent_seconds,
                video_position_seconds=video_position_seconds,
                is_completed=is_completed,
                started_at=utc_now(),
                completed_at=utc_now() if is_completed else None,
            )
            self.db.add(progress)
            await self.db.flush()
            await self.db.refresh(progress)
            return progress

    # ── Quiz Attempts ──

    async def create_quiz_attempt(self, attempt: QuizAttempt) -> QuizAttempt:
        self.db.add(attempt)
        await self.db.flush()
        await self.db.refresh(attempt)
        return attempt

    # ── Update enrollment progress ──

    async def update_enrollment_progress(self, enrollment_id: int):
        """Recalculate enrollment progress percentage from lesson completions."""
        enrollment = await self.db.get(Enrollment, enrollment_id)
        if not enrollment:
            return

        # Lightweight count — avoids loading full course ORM tree
        total_q = await self.db.execute(
            select(func.count(Lesson.lesson_id))
            .join(Module, Module.module_id == Lesson.module_id)
            .where(Module.course_id == enrollment.course_id)
        )
        total_lessons = total_q.scalar() or 0
        if total_lessons == 0:
            return

        completed_q = await self.db.execute(
            select(func.count())
            .select_from(LessonProgress)
            .where(
                LessonProgress.enrollment_id == enrollment_id,
                LessonProgress.is_completed == True,
            )
        )
        completed = completed_q.scalar() or 0

        enrollment.progress_percentage = round((completed / total_lessons) * 100, 2)
        if enrollment.progress_percentage >= 100:
            enrollment.status = "completed"
            enrollment.completed_at = utc_now()
        await self.db.flush()

    # ── Materials ──

    async def get_course_materials(self, course_id: int) -> List[Material]:
        query = (
            select(Material)
            .where(Material.course_id == course_id, Material.is_published == True)
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    # ── Flashcard Decks ──

    async def get_flashcard_deck(self, deck_id: int) -> Optional[FlashcardDeck]:
        query = (
            select(FlashcardDeck)
            .where(FlashcardDeck.deck_id == deck_id)
            .options(selectinload(FlashcardDeck.flashcards))
        )
        result = await self.db.execute(query)
        return result.unique().scalars().first()

    # ── Categories ──

    async def get_categories(self) -> List[Category]:
        from app.utils.cache import get_category_cache
        cache = get_category_cache()
        if "all" in cache:
            return cache["all"]

        query = select(Category).where(Category.is_active == True).order_by(Category.display_order)
        result = await self.db.execute(query)
        categories = list(result.scalars().all())
        cache["all"] = categories
        return categories

    async def get_all_student_materials(self, student_id: int):
        query = (
            select(Material, Course.title.label("course_title"))
            .select_from(Enrollment)
            .join(Course, Course.course_id == Enrollment.course_id)
            .join(Material, Material.course_id == Course.course_id)
            .where(Enrollment.student_id == student_id)
        )
        result = await self.db.execute(query)
        rows = result.all()
        return rows

    async def get_all_user_materials(self, user_id: int):
        from app.models.user import Student
        query = (
            select(Material, Course.title.label("course_title"))
            .select_from(Student)
            .join(Enrollment, Enrollment.student_id == Student.student_id)
            .join(Course, Course.course_id == Enrollment.course_id)
            .join(Material, Material.course_id == Course.course_id)
            .where(Student.user_id == user_id)
        )
        result = await self.db.execute(query)
        rows = result.all()
        return rows
