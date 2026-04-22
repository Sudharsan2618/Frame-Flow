"""Admin course-builder endpoints — full CRUD for courses, modules, lessons, quizzes, flashcards."""

import json
import re
import secrets
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.db.postgres import get_db
from app.api.dependencies import require_admin
from app.utils.time import utc_now
from app.schemas.course_builder import (
    CourseCreateRequest, CourseUpdateRequest, CourseBuilderOut,
    ModuleCreateRequest, ModuleUpdateRequest, ReorderRequest,
    LessonCreateRequest, LessonUpdateRequest,
    QuizCreateRequest, QuizOut,
    FlashcardDeckCreateRequest, FlashcardDeckOut,
    ModuleBuilderOut, LessonBuilderOut,
)

import logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/courses/builder", tags=["Admin Course Builder"])


def _slugify(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    return slug.strip("-")


async def _update_course_counts(db: AsyncSession, course_id: int):
    """Refresh total_modules and total_lessons on the course row."""
    await db.execute(text("""
        UPDATE courses SET
            total_modules = (SELECT COUNT(*) FROM modules WHERE course_id = :cid),
            total_lessons = (SELECT COUNT(*) FROM lessons l JOIN modules m ON l.module_id = m.module_id WHERE m.course_id = :cid),
            updated_at = :now
        WHERE course_id = :cid
    """), {"cid": course_id, "now": utc_now()})


# ══════════════════════════════════════════════════════════════════════════
# COURSE CRUD
# ══════════════════════════════════════════════════════════════════════════

@router.post("")
async def create_course(
    body: CourseCreateRequest,
    admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new course (draft)."""
    slug = body.slug or _slugify(body.title)
    # Check slug uniqueness, append random suffix if needed
    existing = await db.execute(text("SELECT 1 FROM courses WHERE slug = :s"), {"s": slug})
    if existing.scalar():
        slug = f"{slug}-{secrets.token_hex(3)}"

    now = utc_now()
    result = await db.execute(text("""
        INSERT INTO courses (
            title, slug, description, short_description, category_id,
            difficulty_level, instructor_id, pricing_model, price, currency,
            discount_price, duration_hours, thumbnail_url, preview_video_url,
            meta_title, meta_description, is_published, created_at, updated_at
        ) VALUES (
            :title, :slug, :description, :short_description, :category_id,
            :difficulty_level, :instructor_id, :pricing_model, :price, :currency,
            :discount_price, :duration_hours, :thumbnail_url, :preview_video_url,
            :meta_title, :meta_description, false, :now, :now
        ) RETURNING course_id
    """), {
        "title": body.title, "slug": slug,
        "description": body.description, "short_description": body.short_description,
        "category_id": body.category_id, "difficulty_level": body.difficulty_level,
        "instructor_id": body.instructor_id, "pricing_model": body.pricing_model,
        "price": body.price, "currency": body.currency,
        "discount_price": body.discount_price, "duration_hours": body.duration_hours,
        "thumbnail_url": body.thumbnail_url, "preview_video_url": body.preview_video_url,
        "meta_title": body.meta_title, "meta_description": body.meta_description,
        "now": now,
    })
    course_id = result.scalar_one()

    # Link skills
    for sid in body.skill_ids:
        await db.execute(text(
            "INSERT INTO course_skills (course_id, skill_id) VALUES (:cid, :sid) ON CONFLICT DO NOTHING"
        ), {"cid": course_id, "sid": sid})

    await db.commit()
    logger.info("[BUILDER] Course created: id=%s slug=%s", course_id, slug)
    return {"course_id": course_id, "slug": slug}


@router.get("/{course_id}")
async def get_course_for_builder(
    course_id: int,
    admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get full course with nested modules → lessons for the builder UI."""
    # Course row
    cq = await db.execute(text("""
        SELECT course_id, title, slug, description, short_description,
               category_id, difficulty_level, instructor_id, pricing_model,
               price, currency, discount_price, duration_hours,
               thumbnail_url, preview_video_url, meta_title, meta_description,
               is_published, total_modules, total_lessons
        FROM courses WHERE course_id = :cid
    """), {"cid": course_id})
    course = cq.mappings().first()
    if not course:
        raise HTTPException(404, "Course not found")

    # Skills
    sq = await db.execute(text(
        "SELECT skill_id FROM course_skills WHERE course_id = :cid"
    ), {"cid": course_id})
    skill_ids = [r["skill_id"] for r in sq.mappings().all()]

    # Modules
    mq = await db.execute(text("""
        SELECT module_id, title, description, order_index, duration_minutes, is_preview
        FROM modules WHERE course_id = :cid ORDER BY order_index
    """), {"cid": course_id})
    modules_raw = mq.mappings().all()

    module_ids = [m["module_id"] for m in modules_raw]

    # Lessons for all modules in one query
    lessons_by_module: dict[int, list] = {mid: [] for mid in module_ids}
    if module_ids:
        lq = await db.execute(text("""
            SELECT lesson_id, module_id, title, description, content_type,
                   order_index, duration_minutes, content_url,
                   video_external_id, video_external_platform, text_content,
                   is_preview, is_mandatory
            FROM lessons WHERE module_id = ANY(:mids) ORDER BY order_index
        """), {"mids": module_ids})
        for l in lq.mappings().all():
            lessons_by_module[l["module_id"]].append(LessonBuilderOut(
                lesson_id=l["lesson_id"], title=l["title"],
                description=l["description"], content_type=l["content_type"],
                order_index=l["order_index"], duration_minutes=l["duration_minutes"],
                content_url=l["content_url"], video_external_id=l["video_external_id"],
                video_external_platform=l["video_external_platform"],
                text_content=l["text_content"], is_preview=l["is_preview"],
                is_mandatory=l["is_mandatory"],
            ))

    modules = [
        ModuleBuilderOut(
            module_id=m["module_id"], title=m["title"], description=m["description"],
            order_index=m["order_index"], duration_minutes=m["duration_minutes"],
            is_preview=m["is_preview"], lessons=lessons_by_module.get(m["module_id"], []),
        )
        for m in modules_raw
    ]

    return CourseBuilderOut(
        course_id=course["course_id"], title=course["title"], slug=course["slug"],
        description=course["description"], short_description=course["short_description"],
        category_id=course["category_id"], difficulty_level=course["difficulty_level"],
        instructor_id=course["instructor_id"], pricing_model=course["pricing_model"],
        price=float(course["price"] or 0), currency=course["currency"],
        discount_price=float(course["discount_price"]) if course["discount_price"] else None,
        duration_hours=float(course["duration_hours"]) if course["duration_hours"] else None,
        thumbnail_url=course["thumbnail_url"], preview_video_url=course["preview_video_url"],
        meta_title=course["meta_title"], meta_description=course["meta_description"],
        is_published=course["is_published"],
        total_modules=course["total_modules"], total_lessons=course["total_lessons"],
        skill_ids=skill_ids, modules=modules,
    )


@router.put("/{course_id}")
async def update_course(
    course_id: int,
    body: CourseUpdateRequest,
    admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update course metadata."""
    sets, params = ["updated_at = :now"], {"cid": course_id, "now": utc_now()}
    field_list = [
        "title", "slug", "description", "short_description", "category_id",
        "difficulty_level", "instructor_id", "pricing_model", "price", "currency",
        "discount_price", "duration_hours", "thumbnail_url", "preview_video_url",
        "meta_title", "meta_description",
    ]
    for field in field_list:
        val = getattr(body, field, None)
        if val is not None:
            sets.append(f"{field} = :{field}")
            params[field] = val

    sql = f"UPDATE courses SET {', '.join(sets)} WHERE course_id = :cid RETURNING course_id"
    result = await db.execute(text(sql), params)
    if not result.scalar():
        raise HTTPException(404, "Course not found")

    # Update skills if provided
    if body.skill_ids is not None:
        await db.execute(text("DELETE FROM course_skills WHERE course_id = :cid"), {"cid": course_id})
        for sid in body.skill_ids:
            await db.execute(text(
                "INSERT INTO course_skills (course_id, skill_id) VALUES (:cid, :sid) ON CONFLICT DO NOTHING"
            ), {"cid": course_id, "sid": sid})

    await db.commit()
    return {"success": True}


# ══════════════════════════════════════════════════════════════════════════
# MODULES
# ══════════════════════════════════════════════════════════════════════════

@router.post("/{course_id}/modules")
async def add_module(
    course_id: int,
    body: ModuleCreateRequest,
    admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    # Get next order_index
    oq = await db.execute(text(
        "SELECT COALESCE(MAX(order_index), -1) + 1 FROM modules WHERE course_id = :cid"
    ), {"cid": course_id})
    next_idx = oq.scalar()

    result = await db.execute(text("""
        INSERT INTO modules (course_id, title, description, order_index, is_preview, created_at, updated_at)
        VALUES (:cid, :title, :description, :order_index, :is_preview, :now, :now)
        RETURNING module_id
    """), {
        "cid": course_id, "title": body.title, "description": body.description,
        "order_index": next_idx, "is_preview": body.is_preview, "now": utc_now(),
    })
    module_id = result.scalar_one()
    await _update_course_counts(db, course_id)
    await db.commit()
    return {"module_id": module_id, "order_index": next_idx}


@router.put("/{course_id}/modules/{module_id}")
async def update_module(
    course_id: int,
    module_id: int,
    body: ModuleUpdateRequest,
    admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    sets, params = ["updated_at = :now"], {"mid": module_id, "cid": course_id, "now": utc_now()}
    for field in ["title", "description", "is_preview"]:
        val = getattr(body, field, None)
        if val is not None:
            sets.append(f"{field} = :{field}")
            params[field] = val
    sql = f"UPDATE modules SET {', '.join(sets)} WHERE module_id = :mid AND course_id = :cid RETURNING module_id"
    result = await db.execute(text(sql), params)
    if not result.scalar():
        raise HTTPException(404, "Module not found")
    await db.commit()
    return {"success": True}


@router.delete("/{course_id}/modules/{module_id}")
async def delete_module(
    course_id: int,
    module_id: int,
    admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        text("DELETE FROM modules WHERE module_id = :mid AND course_id = :cid RETURNING module_id"),
        {"mid": module_id, "cid": course_id},
    )
    if not result.scalar():
        raise HTTPException(404, "Module not found")
    await _update_course_counts(db, course_id)
    await db.commit()
    return {"success": True}


@router.put("/{course_id}/modules/reorder")
async def reorder_modules(
    course_id: int,
    body: ReorderRequest,
    admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    for idx, mid in enumerate(body.ordered_ids):
        await db.execute(text(
            "UPDATE modules SET order_index = :idx WHERE module_id = :mid AND course_id = :cid"
        ), {"idx": idx, "mid": mid, "cid": course_id})
    await db.commit()
    return {"success": True}


# ══════════════════════════════════════════════════════════════════════════
# LESSONS
# ══════════════════════════════════════════════════════════════════════════

@router.post("/{course_id}/modules/{module_id}/lessons")
async def add_lesson(
    course_id: int,
    module_id: int,
    body: LessonCreateRequest,
    admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    # Verify module belongs to course
    check = await db.execute(text(
        "SELECT 1 FROM modules WHERE module_id = :mid AND course_id = :cid"
    ), {"mid": module_id, "cid": course_id})
    if not check.scalar():
        raise HTTPException(404, "Module not found in this course")

    oq = await db.execute(text(
        "SELECT COALESCE(MAX(order_index), -1) + 1 FROM lessons WHERE module_id = :mid"
    ), {"mid": module_id})
    next_idx = oq.scalar()

    result = await db.execute(text("""
        INSERT INTO lessons (
            module_id, title, description, content_type, order_index,
            duration_minutes, content_url, video_external_id, video_external_platform,
            text_content, is_preview, is_mandatory, created_at, updated_at
        ) VALUES (
            :module_id, :title, :description, :content_type, :order_index,
            :duration_minutes, :content_url, :video_external_id, :video_external_platform,
            :text_content, :is_preview, :is_mandatory, :now, :now
        ) RETURNING lesson_id
    """), {
        "module_id": module_id, "title": body.title, "description": body.description,
        "content_type": body.content_type, "order_index": next_idx,
        "duration_minutes": body.duration_minutes, "content_url": body.content_url,
        "video_external_id": body.video_external_id,
        "video_external_platform": body.video_external_platform,
        "text_content": body.text_content, "is_preview": body.is_preview,
        "is_mandatory": body.is_mandatory, "now": utc_now(),
    })
    lesson_id = result.scalar_one()
    await _update_course_counts(db, course_id)
    await db.commit()
    return {"lesson_id": lesson_id, "order_index": next_idx}


@router.put("/{course_id}/modules/{module_id}/lessons/{lesson_id}")
async def update_lesson(
    course_id: int,
    module_id: int,
    lesson_id: int,
    body: LessonUpdateRequest,
    admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    sets, params = ["updated_at = :now"], {"lid": lesson_id, "mid": module_id, "now": utc_now()}
    for field in [
        "title", "description", "content_type", "duration_minutes", "content_url",
        "video_external_id", "video_external_platform", "text_content", "is_preview", "is_mandatory",
    ]:
        val = getattr(body, field, None)
        if val is not None:
            sets.append(f"{field} = :{field}")
            params[field] = val
    sql = f"UPDATE lessons SET {', '.join(sets)} WHERE lesson_id = :lid AND module_id = :mid RETURNING lesson_id"
    result = await db.execute(text(sql), params)
    if not result.scalar():
        raise HTTPException(404, "Lesson not found")
    await db.commit()
    return {"success": True}


@router.delete("/{course_id}/modules/{module_id}/lessons/{lesson_id}")
async def delete_lesson(
    course_id: int,
    module_id: int,
    lesson_id: int,
    admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        text("DELETE FROM lessons WHERE lesson_id = :lid AND module_id = :mid RETURNING lesson_id"),
        {"lid": lesson_id, "mid": module_id},
    )
    if not result.scalar():
        raise HTTPException(404, "Lesson not found")
    await _update_course_counts(db, course_id)
    await db.commit()
    return {"success": True}


@router.put("/{course_id}/modules/{module_id}/lessons/reorder")
async def reorder_lessons(
    course_id: int,
    module_id: int,
    body: ReorderRequest,
    admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    for idx, lid in enumerate(body.ordered_ids):
        await db.execute(text(
            "UPDATE lessons SET order_index = :idx WHERE lesson_id = :lid AND module_id = :mid"
        ), {"idx": idx, "lid": lid, "mid": module_id})
    await db.commit()
    return {"success": True}


# ══════════════════════════════════════════════════════════════════════════
# QUIZ (per lesson)
# ══════════════════════════════════════════════════════════════════════════

@router.get("/lessons/{lesson_id}/quiz")
async def get_quiz(
    lesson_id: int,
    admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    qq = await db.execute(text("""
        SELECT quiz_id, title, description, instructions, pass_percentage,
               time_limit_minutes, max_attempts, shuffle_questions, shuffle_options,
               show_correct_answers, total_questions
        FROM quizzes WHERE lesson_id = :lid
    """), {"lid": lesson_id})
    quiz = qq.mappings().first()
    if not quiz:
        return None

    questions_q = await db.execute(text("""
        SELECT question_id, question_text, question_type, options, correct_answer,
               explanation, points, order_index
        FROM quiz_questions WHERE quiz_id = :qid ORDER BY order_index
    """), {"qid": quiz["quiz_id"]})
    questions = [dict(q) for q in questions_q.mappings().all()]

    return {**dict(quiz), "questions": questions}


@router.post("/lessons/{lesson_id}/quiz")
async def save_quiz(
    lesson_id: int,
    body: QuizCreateRequest,
    admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create or replace quiz + questions for a lesson."""
    # Delete existing quiz (cascade deletes questions)
    await db.execute(text("DELETE FROM quizzes WHERE lesson_id = :lid"), {"lid": lesson_id})

    now = utc_now()
    result = await db.execute(text("""
        INSERT INTO quizzes (
            lesson_id, title, description, instructions, pass_percentage,
            time_limit_minutes, max_attempts, shuffle_questions, shuffle_options,
            show_correct_answers, total_questions, created_at, updated_at
        ) VALUES (
            :lid, :title, :description, :instructions, :pass_percentage,
            :time_limit_minutes, :max_attempts, :shuffle_questions, :shuffle_options,
            :show_correct_answers, :total_questions, :now, :now
        ) RETURNING quiz_id
    """), {
        "lid": lesson_id, "title": body.title, "description": body.description,
        "instructions": body.instructions, "pass_percentage": body.pass_percentage,
        "time_limit_minutes": body.time_limit_minutes, "max_attempts": body.max_attempts,
        "shuffle_questions": body.shuffle_questions, "shuffle_options": body.shuffle_options,
        "show_correct_answers": body.show_correct_answers,
        "total_questions": len(body.questions), "now": now,
    })
    quiz_id = result.scalar_one()

    # Insert questions
    for idx, q in enumerate(body.questions):
        await db.execute(text("""
            INSERT INTO quiz_questions (
                quiz_id, question_text, question_type, options, correct_answer,
                explanation, points, order_index, created_at
            ) VALUES (
                :qid, :question_text, :question_type, :options, :correct_answer,
                :explanation, :points, :order_index, :now
            )
        """), {
            "qid": quiz_id, "question_text": q.question_text,
            "question_type": q.question_type,
            "options": json.dumps(q.options) if q.options else None,
            "correct_answer": q.correct_answer,
            "explanation": q.explanation, "points": q.points,
            "order_index": idx, "now": now,
        })

    await db.commit()
    return {"quiz_id": quiz_id, "total_questions": len(body.questions)}


# ══════════════════════════════════════════════════════════════════════════
# FLASHCARDS (per lesson)
# ══════════════════════════════════════════════════════════════════════════

@router.get("/lessons/{lesson_id}/flashcards")
async def get_flashcards(
    lesson_id: int,
    admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    dq = await db.execute(text("""
        SELECT deck_id, title, description, total_cards
        FROM flashcard_decks WHERE lesson_id = :lid
    """), {"lid": lesson_id})
    deck = dq.mappings().first()
    if not deck:
        return None

    cards_q = await db.execute(text("""
        SELECT flashcard_id, front_content, back_content, front_image_url, back_image_url, order_index
        FROM flashcards WHERE deck_id = :did ORDER BY order_index
    """), {"did": deck["deck_id"]})
    cards = [dict(c) for c in cards_q.mappings().all()]

    return {**dict(deck), "cards": cards}


@router.post("/lessons/{lesson_id}/flashcards")
async def save_flashcards(
    lesson_id: int,
    body: FlashcardDeckCreateRequest,
    admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create or replace flashcard deck + cards for a lesson."""
    # Get course_id from lesson → module
    cq = await db.execute(text("""
        SELECT m.course_id FROM lessons l JOIN modules m ON l.module_id = m.module_id
        WHERE l.lesson_id = :lid
    """), {"lid": lesson_id})
    course_row = cq.mappings().first()
    course_id = course_row["course_id"] if course_row else None

    # Delete existing deck (cascade deletes cards)
    await db.execute(text("DELETE FROM flashcard_decks WHERE lesson_id = :lid"), {"lid": lesson_id})

    now = utc_now()
    result = await db.execute(text("""
        INSERT INTO flashcard_decks (lesson_id, course_id, title, description, total_cards, created_at, updated_at)
        VALUES (:lid, :course_id, :title, :description, :total_cards, :now, :now)
        RETURNING deck_id
    """), {
        "lid": lesson_id, "course_id": course_id, "title": body.title,
        "description": body.description, "total_cards": len(body.cards), "now": now,
    })
    deck_id = result.scalar_one()

    for idx, card in enumerate(body.cards):
        await db.execute(text("""
            INSERT INTO flashcards (deck_id, front_content, back_content,
                front_image_url, back_image_url, order_index, created_at)
            VALUES (:did, :front, :back, :front_img, :back_img, :idx, :now)
        """), {
            "did": deck_id, "front": card.front_content, "back": card.back_content,
            "front_img": card.front_image_url, "back_img": card.back_image_url,
            "idx": idx, "now": now,
        })

    await db.commit()
    return {"deck_id": deck_id, "total_cards": len(body.cards)}


# ══════════════════════════════════════════════════════════════════════════
# PUBLISH
# ══════════════════════════════════════════════════════════════════════════

@router.post("/{course_id}/publish")
async def publish_course(
    course_id: int,
    admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Validate and publish a course."""
    errors = []

    # Check course exists
    cq = await db.execute(text(
        "SELECT title, description FROM courses WHERE course_id = :cid"
    ), {"cid": course_id})
    course = cq.mappings().first()
    if not course:
        raise HTTPException(404, "Course not found")

    if not course["title"]:
        errors.append("Course must have a title")

    # Check modules
    mq = await db.execute(text(
        "SELECT module_id, title FROM modules WHERE course_id = :cid ORDER BY order_index"
    ), {"cid": course_id})
    modules = mq.mappings().all()

    if len(modules) == 0:
        errors.append("Course must have at least one module")

    for m in modules:
        lq = await db.execute(text(
            "SELECT lesson_id, title, content_type, content_url, text_content, video_external_id "
            "FROM lessons WHERE module_id = :mid ORDER BY order_index"
        ), {"mid": m["module_id"]})
        lessons = lq.mappings().all()
        if len(lessons) == 0:
            errors.append(f"Module '{m['title']}' has no lessons")
        for l in lessons:
            has_content = bool(
                l["content_url"] or l["text_content"] or l["video_external_id"]
                or l["content_type"] in ("quiz", "flashcard")
            )
            if not has_content:
                errors.append(f"Lesson '{l['title']}' in module '{m['title']}' has no content")

    if errors:
        return {"success": False, "errors": errors}

    # Publish
    await _update_course_counts(db, course_id)
    await db.execute(text(
        "UPDATE courses SET is_published = true, published_at = :now, updated_at = :now WHERE course_id = :cid"
    ), {"cid": course_id, "now": utc_now()})
    await db.commit()

    from app.utils.cache import invalidate_course_caches
    invalidate_course_caches()

    return {"success": True, "errors": []}
