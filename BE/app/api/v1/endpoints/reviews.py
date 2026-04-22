"""Course Review API endpoints — create, list, stats."""

from app.utils.time import utc_now
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Header, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.db.postgres import get_db
from app.api.dependencies import get_current_user

router = APIRouter(prefix="/courses", tags=["Course Reviews"])



async def _get_student_id(db: AsyncSession, user_id: int) -> int:
    result = await db.execute(
        text("SELECT student_id FROM students WHERE user_id = :uid"),
        {"uid": user_id},
    )
    sid = result.scalar()
    if not sid:
        raise HTTPException(status_code=403, detail="Student profile not found")
    return sid


# ── GET /courses/{course_id}/reviews ─────────────────────────────────────

@router.get("/{course_id}/reviews")
async def list_reviews(
    course_id: int,
    sort_by: str = Query("newest", description="newest, oldest, highest, lowest"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """List reviews for a course. Public endpoint — no auth required."""
    # Verify course exists
    course_check = await db.execute(
        text("SELECT course_id FROM courses WHERE course_id = :cid"),
        {"cid": course_id},
    )
    if not course_check.scalar():
        raise HTTPException(status_code=404, detail="Course not found")

    # Review stats (aggregate)
    stats_q = await db.execute(
        text("""
            SELECT
                COUNT(*) AS total_reviews,
                COALESCE(ROUND(AVG(rating)::numeric, 1), 0) AS average_rating,
                COUNT(*) FILTER (WHERE rating = 5) AS five_star,
                COUNT(*) FILTER (WHERE rating = 4) AS four_star,
                COUNT(*) FILTER (WHERE rating = 3) AS three_star,
                COUNT(*) FILTER (WHERE rating = 2) AS two_star,
                COUNT(*) FILTER (WHERE rating = 1) AS one_star
            FROM course_reviews
            WHERE course_id = :cid AND is_approved = true
        """),
        {"cid": course_id},
    )
    stats = dict(stats_q.mappings().first())
    stats["average_rating"] = float(stats["average_rating"])

    # Sort order
    sort_map = {
        "newest": "cr.created_at DESC",
        "oldest": "cr.created_at ASC",
        "highest": "cr.rating DESC, cr.created_at DESC",
        "lowest": "cr.rating ASC, cr.created_at DESC",
    }
    order_by = sort_map.get(sort_by, "cr.created_at DESC")

    # Paginated reviews
    data_q = await db.execute(
        text(f"""
            SELECT
                cr.review_id, cr.rating, cr.review_text,
                cr.helpful_count, cr.is_featured, cr.created_at,
                s.first_name, s.last_name, s.profile_picture_url, s.headline
            FROM course_reviews cr
            JOIN students s ON s.student_id = cr.student_id
            WHERE cr.course_id = :cid AND cr.is_approved = true
            ORDER BY {order_by}
            LIMIT :limit OFFSET :offset
        """),
        {"cid": course_id, "limit": limit, "offset": offset},
    )
    rows = data_q.mappings().all()

    reviews = []
    for r in rows:
        reviews.append({
            "review_id": r["review_id"],
            "rating": r["rating"],
            "review_text": r["review_text"],
            "helpful_count": r["helpful_count"],
            "is_featured": r["is_featured"],
            "created_at": r["created_at"].isoformat() if r["created_at"] else None,
            "student_name": f"{r['first_name'] or ''} {r['last_name'] or ''}".strip() or "Anonymous",
            "student_picture": r["profile_picture_url"],
            "student_headline": r["headline"],
        })

    return {"reviews": reviews, "stats": stats}


# ── GET /courses/{course_id}/reviews/me ──────────────────────────────────

@router.get("/{course_id}/reviews/me")
async def get_my_review(
    course_id: int,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Check if the current student has already reviewed this course."""
    student_id = await _get_student_id(db, user["user_id"])

    result = await db.execute(
        text("""
            SELECT review_id, rating, review_text, created_at
            FROM course_reviews
            WHERE course_id = :cid AND student_id = :sid
        """),
        {"cid": course_id, "sid": student_id},
    )
    row = result.mappings().first()
    if not row:
        return {"review": None}

    return {"review": dict(row)}


# ── POST /courses/{course_id}/reviews ────────────────────────────────────

@router.post("/{course_id}/reviews")
async def create_review(
    course_id: int,
    rating: int = Query(..., ge=1, le=5),
    review_text: str = Query(""),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit a review for a course. Student must be enrolled."""
    student_id = await _get_student_id(db, user["user_id"])

    # Check enrollment
    enroll = await db.execute(
        text("SELECT enrollment_id FROM enrollments WHERE course_id = :cid AND student_id = :sid"),
        {"cid": course_id, "sid": student_id},
    )
    enrollment_id = enroll.scalar()
    if not enrollment_id:
        raise HTTPException(status_code=403, detail="You must be enrolled in this course to leave a review")

    # Check if already reviewed
    existing = await db.execute(
        text("SELECT review_id FROM course_reviews WHERE course_id = :cid AND student_id = :sid"),
        {"cid": course_id, "sid": student_id},
    )
    if existing.scalar():
        raise HTTPException(status_code=409, detail="You have already reviewed this course")

    now = utc_now()
    result = await db.execute(
        text("""
            INSERT INTO course_reviews (course_id, student_id, enrollment_id, rating, review_text, created_at, updated_at)
            VALUES (:cid, :sid, :eid, :rating, :text, :now, :now)
            RETURNING review_id
        """),
        {
            "cid": course_id,
            "sid": student_id,
            "eid": enrollment_id,
            "rating": rating,
            "text": review_text if review_text.strip() else None,
            "now": now,
        },
    )
    review_id = result.scalar_one()

    # Update course average rating (denormalized on courses table if column exists)
    # For now we just commit
    await db.commit()

    return {
        "success": True,
        "review_id": review_id,
        "rating": rating,
        "review_text": review_text,
    }


# ── PUT /courses/{course_id}/reviews ─────────────────────────────────────

@router.put("/{course_id}/reviews")
async def update_review(
    course_id: int,
    rating: int = Query(..., ge=1, le=5),
    review_text: str = Query(""),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing review."""
    student_id = await _get_student_id(db, user["user_id"])

    result = await db.execute(
        text("""
            UPDATE course_reviews
            SET rating = :rating, review_text = :text, updated_at = :now
            WHERE course_id = :cid AND student_id = :sid
            RETURNING review_id
        """),
        {
            "cid": course_id,
            "sid": student_id,
            "rating": rating,
            "text": review_text if review_text.strip() else None,
            "now": utc_now(),
        },
    )
    review_id = result.scalar()
    if not review_id:
        raise HTTPException(status_code=404, detail="Review not found")

    await db.commit()
    return {"success": True, "review_id": review_id, "rating": rating}


# ── DELETE /courses/{course_id}/reviews ──────────────────────────────────

@router.delete("/{course_id}/reviews")
async def delete_review(
    course_id: int,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete your own review."""
    student_id = await _get_student_id(db, user["user_id"])

    result = await db.execute(
        text("""
            DELETE FROM course_reviews
            WHERE course_id = :cid AND student_id = :sid
            RETURNING review_id
        """),
        {"cid": course_id, "sid": student_id},
    )
    if not result.scalar():
        raise HTTPException(status_code=404, detail="Review not found")

    await db.commit()
    return {"success": True}
