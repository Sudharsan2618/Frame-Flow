"""Admin portal endpoints — dashboard, user management, course management, job matching hub."""

from app.utils.time import utc_now
from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Header, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.db.postgres import get_db
from app.services.matching_service import MatchingService
from app.services.notification_service import create_notification
from app.api.dependencies import require_admin

router = APIRouter(prefix="/admin", tags=["Admin"])



# ══════════════════════════════════════════════════════════════════════════
# DASHBOARD
# ══════════════════════════════════════════════════════════════════════════

@router.get("/dashboard")
async def get_admin_dashboard(
    admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get aggregated admin dashboard metrics."""
    q = await db.execute(text("""
        WITH student_c  AS (SELECT COUNT(*) AS v FROM students),
             company_c  AS (SELECT COUNT(*) AS v FROM companies),
             course_c   AS (SELECT COUNT(*) AS v FROM courses WHERE is_published = true),
             job_c      AS (SELECT COUNT(*) AS v FROM jobs WHERE status = 'active'),
             app_c      AS (
                 SELECT COUNT(*) AS total,
                        COUNT(*) FILTER (WHERE status = 'pending_admin_review') AS pending,
                        COUNT(*) FILTER (WHERE status = 'forwarded_to_company') AS forwarded,
                        COUNT(*) FILTER (WHERE status = 'hired') AS hired
                 FROM applications
             ),
             enroll_c   AS (SELECT COUNT(*) AS v FROM enrollments),
             new_user_c AS (SELECT COUNT(*) AS v FROM users WHERE created_at >= NOW() - INTERVAL '30 days')
        SELECT
            student_c.v  AS total_students,
            company_c.v  AS total_companies,
            course_c.v   AS active_courses,
            job_c.v      AS active_jobs,
            app_c.total  AS total_applications,
            app_c.pending AS pending_review,
            app_c.forwarded AS forwarded,
            app_c.hired  AS hired,
            enroll_c.v   AS total_enrollments,
            new_user_c.v AS new_users_30d
        FROM student_c, company_c, course_c, job_c, app_c, enroll_c, new_user_c
    """))
    row = q.mappings().first()
    return dict(row) if row else {}


@router.get("/dashboard/charts")
async def get_admin_dashboard_charts(
    admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get chart data for dashboard analytics."""

    # 1) User registrations per month (last 6 months)
    user_growth = await db.execute(text("""
        SELECT
            TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') AS month,
            EXTRACT(MONTH FROM DATE_TRUNC('month', created_at))::int AS month_num,
            COUNT(*) FILTER (WHERE user_type = 'student') AS students,
            COUNT(*) FILTER (WHERE user_type = 'company') AS companies,
            COUNT(*) AS total
        FROM users
        WHERE created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '5 months'
          AND user_type IN ('student', 'company')
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at)
    """))
    user_growth_data = [dict(r) for r in user_growth.mappings().all()]

    # 2) Applications per month (last 6 months)
    app_trend = await db.execute(text("""
        SELECT
            TO_CHAR(DATE_TRUNC('month', applied_at), 'Mon') AS month,
            COUNT(*) AS applications,
            COUNT(*) FILTER (WHERE status = 'forwarded_to_company') AS forwarded,
            COUNT(*) FILTER (WHERE status = 'hired') AS hired
        FROM applications
        WHERE applied_at >= DATE_TRUNC('month', NOW()) - INTERVAL '5 months'
        GROUP BY DATE_TRUNC('month', applied_at)
        ORDER BY DATE_TRUNC('month', applied_at)
    """))
    app_trend_data = [dict(r) for r in app_trend.mappings().all()]

    # 3) Application status distribution (pie chart)
    status_dist = await db.execute(text("""
        SELECT
            status,
            COUNT(*) AS count
        FROM applications
        GROUP BY status
        ORDER BY count DESC
    """))
    status_distribution = [dict(r) for r in status_dist.mappings().all()]

    # 4) Top jobs by application count
    top_jobs = await db.execute(text("""
        SELECT
            j.title, c.company_name,
            j.applications_count AS count,
            (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.job_id AND a.status = 'pending_admin_review') AS pending,
            (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.job_id AND a.status = 'forwarded_to_company') AS forwarded
        FROM jobs j
        JOIN companies c ON c.company_id = j.company_id
        WHERE j.status = 'active'
        ORDER BY j.applications_count DESC
        LIMIT 5
    """))
    top_jobs_data = [dict(r) for r in top_jobs.mappings().all()]

    # 5) Jobs posted per month (last 6 months)
    jobs_trend = await db.execute(text("""
        SELECT
            TO_CHAR(DATE_TRUNC('month', posted_at), 'Mon') AS month,
            COUNT(*) AS jobs_posted
        FROM jobs
        WHERE posted_at >= DATE_TRUNC('month', NOW()) - INTERVAL '5 months'
        GROUP BY DATE_TRUNC('month', posted_at)
        ORDER BY DATE_TRUNC('month', posted_at)
    """))
    jobs_trend_data = [dict(r) for r in jobs_trend.mappings().all()]

    # 6) Enrollments per month (last 6 months)
    enrollment_trend = await db.execute(text("""
        SELECT
            TO_CHAR(DATE_TRUNC('month', enrolled_at), 'Mon') AS month,
            COUNT(*) AS enrollments
        FROM enrollments
        WHERE enrolled_at >= DATE_TRUNC('month', NOW()) - INTERVAL '5 months'
        GROUP BY DATE_TRUNC('month', enrolled_at)
        ORDER BY DATE_TRUNC('month', enrolled_at)
    """))
    enrollment_trend_data = [dict(r) for r in enrollment_trend.mappings().all()]

    return {
        "user_growth": user_growth_data,
        "application_trend": app_trend_data,
        "status_distribution": status_distribution,
        "top_jobs": top_jobs_data,
        "jobs_trend": jobs_trend_data,
        "enrollment_trend": enrollment_trend_data,
    }


# ══════════════════════════════════════════════════════════════════════════
# USER MANAGEMENT
# ══════════════════════════════════════════════════════════════════════════

@router.get("/users")
async def list_users(
    search: str = Query("", description="Search by name or email"),
    role: str = Query("all", description="Filter: all, student, company"),
    status: str = Query("all", description="Filter: all, active, inactive, suspended"),
    sort_by: str = Query("created_at", description="Sort field"),
    sort_order: str = Query("desc", description="asc or desc"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all users (students + companies) with filters and search."""
    where_clauses = ["1=1"]
    params: dict = {"limit": limit, "offset": offset}

    if role == "student":
        where_clauses.append("u.user_type = 'student'")
    elif role == "company":
        where_clauses.append("u.user_type = 'company'")
    else:
        where_clauses.append("u.user_type IN ('student', 'company')")

    if status != "all":
        where_clauses.append("u.status = :status")
        params["status"] = status

    if search:
        where_clauses.append("""(
            LOWER(u.email) LIKE :search
            OR LOWER(COALESCE(s.first_name, '')) LIKE :search
            OR LOWER(COALESCE(s.last_name, '')) LIKE :search
            OR LOWER(COALESCE(c.company_name, '')) LIKE :search
        )""")
        params["search"] = f"%{search.lower()}%"

    where_sql = " AND ".join(where_clauses)

    allowed_sorts = {"created_at": "u.created_at", "email": "u.email", "last_login_at": "u.last_login_at"}
    sort_col = allowed_sorts.get(sort_by, "u.created_at")
    sort_dir = "ASC" if sort_order == "asc" else "DESC"

    # Count
    count_q = await db.execute(
        text(f"""
            SELECT COUNT(*) FROM users u
            LEFT JOIN students s ON s.user_id = u.user_id
            LEFT JOIN companies c ON c.user_id = u.user_id
            WHERE {where_sql}
        """),
        params,
    )
    total = count_q.scalar() or 0

    # Data
    data_q = await db.execute(
        text(f"""
            SELECT
                u.user_id, u.email, u.user_type, u.status,
                u.created_at, u.last_login_at, u.onboarding_completed,
                s.student_id, s.first_name, s.last_name, s.headline,
                s.profile_picture_url,
                c.company_id, c.company_name, c.logo_url, c.industry,
                (SELECT COUNT(*) FROM enrollments e WHERE e.student_id = s.student_id) AS enrollments_count,
                (SELECT COUNT(*) FROM applications a WHERE a.student_id = s.student_id) AS applications_count
            FROM users u
            LEFT JOIN students s ON s.user_id = u.user_id
            LEFT JOIN companies c ON c.user_id = u.user_id
            WHERE {where_sql}
            ORDER BY {sort_col} {sort_dir} NULLS LAST
            LIMIT :limit OFFSET :offset
        """),
        params,
    )
    rows = data_q.mappings().all()

    users = []
    for r in rows:
        user = dict(r)
        user["name"] = (
            f"{r['first_name'] or ''} {r['last_name'] or ''}".strip()
            if r["user_type"] == "student"
            else r["company_name"] or r["email"]
        )
        users.append(user)

    # Summary counts (unfiltered, for KPI cards)
    summary_q = await db.execute(text("""
        SELECT
            COUNT(*) FILTER (WHERE user_type = 'student') AS student_count,
            COUNT(*) FILTER (WHERE user_type = 'company') AS company_count,
            COUNT(*) FILTER (WHERE status = 'active' AND user_type IN ('student','company')) AS active_count
        FROM users
    """))
    summary = summary_q.mappings().first()

    return {
        "users": users,
        "total": total,
        "summary": {
            "student_count": summary["student_count"] if summary else 0,
            "company_count": summary["company_count"] if summary else 0,
            "active_count": summary["active_count"] if summary else 0,
        },
    }


@router.put("/users/{user_id}/status")
async def update_user_status(
    user_id: int,
    new_status: str = Query(..., description="active, inactive, or suspended"),
    admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Activate, deactivate, or suspend a user."""
    if new_status not in ("active", "inactive", "suspended"):
        raise HTTPException(status_code=400, detail="Invalid status. Use: active, inactive, suspended")

    # Don't allow modifying own account
    if user_id == admin["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot modify your own account status")

    result = await db.execute(
        text("UPDATE users SET status = :status, updated_at = :now WHERE user_id = :uid RETURNING user_id"),
        {"status": new_status, "now": utc_now(), "uid": user_id},
    )
    if not result.scalar():
        raise HTTPException(status_code=404, detail="User not found")
    await db.commit()
    return {"success": True, "user_id": user_id, "status": new_status}


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Permanently delete a user and all related data."""
    if user_id == admin["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    result = await db.execute(
        text("DELETE FROM users WHERE user_id = :uid AND user_type IN ('student', 'company') RETURNING user_id"),
        {"uid": user_id},
    )
    if not result.scalar():
        raise HTTPException(status_code=404, detail="User not found or cannot be deleted")
    await db.commit()
    return {"success": True, "user_id": user_id}


# ══════════════════════════════════════════════════════════════════════════
# COURSE MANAGEMENT
# ══════════════════════════════════════════════════════════════════════════

@router.get("/courses")
async def list_admin_courses(
    search: str = Query(""),
    status: str = Query("all", description="all, published, draft"),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all courses for admin management."""
    where_clauses = ["1=1"]
    params: dict = {"limit": limit, "offset": offset}

    if status == "published":
        where_clauses.append("c.is_published = true")
    elif status == "draft":
        where_clauses.append("c.is_published = false")

    if search:
        where_clauses.append("(LOWER(c.title) LIKE :search OR LOWER(c.short_description) LIKE :search)")
        params["search"] = f"%{search.lower()}%"

    where_sql = " AND ".join(where_clauses)
    allowed_sorts = {"created_at": "c.created_at", "title": "c.title", "price": "c.price"}
    sort_col = allowed_sorts.get(sort_by, "c.created_at")
    sort_dir = "ASC" if sort_order == "asc" else "DESC"

    count_q = await db.execute(text(f"SELECT COUNT(*) FROM courses c WHERE {where_sql}"), params)
    total = count_q.scalar() or 0

    data_q = await db.execute(
        text(f"""
            SELECT
                c.course_id, c.title, c.slug, c.short_description,
                c.difficulty_level, c.pricing_model, c.price, c.currency,
                c.is_published, c.created_at, c.updated_at,
                c.duration_hours, c.thumbnail_url,
                cat.name AS category_name,
                i.first_name AS instructor_first_name,
                i.last_name AS instructor_last_name,
                (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.course_id) AS enrollment_count,
                (SELECT COUNT(*) FROM modules m WHERE m.course_id = c.course_id) AS module_count,
                (SELECT COUNT(*) FROM lessons l JOIN modules m ON l.module_id = m.module_id WHERE m.course_id = c.course_id) AS lesson_count
            FROM courses c
            LEFT JOIN categories cat ON cat.category_id = c.category_id
            LEFT JOIN instructors i ON i.instructor_id = c.instructor_id
            WHERE {where_sql}
            ORDER BY {sort_col} {sort_dir} NULLS LAST
            LIMIT :limit OFFSET :offset
        """),
        params,
    )
    rows = data_q.mappings().all()

    courses = []
    for r in rows:
        course = dict(r)
        course["price"] = float(course["price"]) if course["price"] else 0
        course["instructor_name"] = f"{r['instructor_first_name'] or ''} {r['instructor_last_name'] or ''}".strip() or None
        courses.append(course)

    # Summary counts (unfiltered, for KPI cards)
    summary_q = await db.execute(text("""
        SELECT
            COUNT(*) FILTER (WHERE is_published = true) AS published_count,
            COUNT(*) FILTER (WHERE is_published = false) AS draft_count,
            COALESCE((SELECT COUNT(*) FROM enrollments), 0) AS total_enrollments
        FROM courses
    """))
    summary = summary_q.mappings().first()

    return {
        "courses": courses,
        "total": total,
        "summary": {
            "published_count": summary["published_count"] if summary else 0,
            "draft_count": summary["draft_count"] if summary else 0,
            "total_enrollments": summary["total_enrollments"] if summary else 0,
        },
    }


@router.put("/courses/{course_id}/publish")
async def toggle_course_publish(
    course_id: int,
    publish: bool = Query(...),
    admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Publish or unpublish a course."""
    result = await db.execute(
        text("UPDATE courses SET is_published = :pub, updated_at = :now WHERE course_id = :cid RETURNING course_id"),
        {"pub": publish, "now": utc_now(), "cid": course_id},
    )
    if not result.scalar():
        raise HTTPException(status_code=404, detail="Course not found")
    await db.commit()
    from app.utils.cache import invalidate_course_caches
    invalidate_course_caches()
    return {"success": True, "course_id": course_id, "is_published": publish}


@router.delete("/courses/{course_id}")
async def delete_course(
    course_id: int,
    admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete a course."""
    result = await db.execute(
        text("DELETE FROM courses WHERE course_id = :cid RETURNING course_id"),
        {"cid": course_id},
    )
    if not result.scalar():
        raise HTTPException(status_code=404, detail="Course not found")
    await db.commit()
    from app.utils.cache import invalidate_course_caches
    invalidate_course_caches()
    return {"success": True, "course_id": course_id}


# ══════════════════════════════════════════════════════════════════════════
# JOB MATCHING HUB
# ══════════════════════════════════════════════════════════════════════════

@router.get("/jobs")
async def list_admin_jobs(
    search: str = Query(""),
    status: str = Query("active"),
    sort_by: str = Query("posted_at"),
    sort_order: str = Query("desc"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all jobs for admin with application counts."""
    where_clauses = ["1=1"]
    params: dict = {"limit": limit, "offset": offset}

    if status != "all":
        where_clauses.append("j.status = :status")
        params["status"] = status

    if search:
        where_clauses.append("""(
            LOWER(j.title) LIKE :search
            OR LOWER(c.company_name) LIKE :search
            OR LOWER(j.location) LIKE :search
        )""")
        params["search"] = f"%{search.lower()}%"

    where_sql = " AND ".join(where_clauses)
    allowed_sorts = {
        "posted_at": "j.posted_at",
        "title": "j.title",
        "applications": "applications_count",
        "pending": "pending_count",
    }
    sort_col = allowed_sorts.get(sort_by, "j.posted_at")
    sort_dir = "ASC" if sort_order == "asc" else "DESC"

    count_q = await db.execute(
        text(f"""
            SELECT COUNT(*) FROM jobs j
            JOIN companies c ON c.company_id = j.company_id
            WHERE {where_sql}
        """),
        params,
    )
    total = count_q.scalar() or 0

    data_q = await db.execute(
        text(f"""
            SELECT
                j.job_id, j.title, j.slug, j.employment_type, j.remote_type,
                j.location, j.status AS job_status, j.posted_at, j.deadline,
                j.salary_min, j.salary_max, j.salary_currency,
                j.department, j.experience_min_years,
                c.company_id, c.company_name, c.logo_url, c.industry,
                j.applications_count,
                (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.job_id AND a.status = 'pending_admin_review') AS pending_count,
                (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.job_id AND a.status = 'forwarded_to_company') AS forwarded_count,
                (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.job_id AND a.status = 'hired') AS hired_count
            FROM jobs j
            JOIN companies c ON c.company_id = j.company_id
            WHERE {where_sql}
            ORDER BY {sort_col} {sort_dir} NULLS LAST
            LIMIT :limit OFFSET :offset
        """),
        params,
    )
    rows = data_q.mappings().all()

    jobs = []
    for r in rows:
        job = dict(r)
        job["salary_min"] = float(job["salary_min"]) if job["salary_min"] else None
        job["salary_max"] = float(job["salary_max"]) if job["salary_max"] else None
        jobs.append(job)

    # Summary counts (unfiltered, for KPI cards)
    summary_q = await db.execute(text("""
        SELECT
            (SELECT COUNT(*) FROM jobs) AS total_jobs,
            (SELECT COUNT(*) FROM applications WHERE status = 'pending_admin_review') AS total_pending,
            (SELECT COUNT(*) FROM applications WHERE status = 'forwarded_to_company') AS total_forwarded,
            (SELECT COUNT(*) FROM applications) AS total_applications
    """))
    summary = summary_q.mappings().first()

    return {
        "jobs": jobs,
        "total": total,
        "summary": {
            "total_jobs": summary["total_jobs"] if summary else 0,
            "total_pending": summary["total_pending"] if summary else 0,
            "total_forwarded": summary["total_forwarded"] if summary else 0,
            "total_applications": summary["total_applications"] if summary else 0,
        },
    }


@router.get("/jobs/{job_id}/applicants")
async def get_job_applicants(
    job_id: int,
    search: str = Query(""),
    status: str = Query("all", description="all, pending_admin_review, admin_shortlisted, forwarded_to_company, etc."),
    min_match: float = Query(0, ge=0, le=100, description="Minimum composite match percentage"),
    sort_by: str = Query("match_score", description="match_score, applied_at, name"),
    sort_order: str = Query("desc"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get all applicants for a specific job with composite match scores and skill breakdowns."""
    # Verify job exists and get job data for computing scores
    job_check = await db.execute(
        text("""
            SELECT j.job_id, j.title, j.experience_min_years, j.experience_max_years,
                   j.remote_type, j.employment_type, j.location
            FROM jobs j WHERE j.job_id = :jid
        """),
        {"jid": job_id},
    )
    job_row = job_check.mappings().first()
    if not job_row:
        raise HTTPException(status_code=404, detail="Job not found")

    where_clauses = ["a.job_id = :job_id"]
    params: dict = {"job_id": job_id, "limit": limit, "offset": offset}

    if status != "all":
        where_clauses.append("a.status = :app_status")
        params["app_status"] = status

    if search:
        where_clauses.append("""(
            LOWER(s.first_name) LIKE :search
            OR LOWER(s.last_name) LIKE :search
            OR LOWER(u.email) LIKE :search
        )""")
        params["search"] = f"%{search.lower()}%"

    where_sql = " AND ".join(where_clauses)

    # Count
    count_q = await db.execute(
        text(f"""
            SELECT COUNT(*)
            FROM applications a
            JOIN students s ON s.student_id = a.student_id
            JOIN users u ON u.user_id = s.user_id
            WHERE {where_sql}
        """),
        params,
    )
    total = count_q.scalar() or 0

    # Data — fetch applicants with vector score + student data for composite computation
    data_q = await db.execute(
        text(f"""
            SELECT
                a.application_id, a.student_id, a.status AS application_status,
                a.cover_letter, a.resume_url, a.expected_salary, a.notice_period_days,
                a.applied_at, a.admin_notes, a.admin_match_score,
                s.first_name, s.last_name, s.headline, s.profile_picture_url,
                s.location AS current_location, s.experience_years,
                s.resume_url AS student_resume_url,
                s.linkedin_url, s.github_url, s.portfolio_url,
                s.preferred_job_types, s.preferred_remote_types, s.preferred_locations,
                u.email, u.user_id,
                ROUND(
                    COALESCE(
                        (1.0 - (je.embedding <=> se.embedding))::numeric,
                        0
                    ), 4
                ) AS vector_score
            FROM applications a
            JOIN students s ON s.student_id = a.student_id
            JOIN users u ON u.user_id = s.user_id
            LEFT JOIN job_embeddings je ON je.job_id = a.job_id
            LEFT JOIN student_embeddings se ON se.student_id = a.student_id
            WHERE {where_sql}
            ORDER BY a.applied_at DESC
            LIMIT :limit OFFSET :offset
        """),
        params,
    )
    rows = data_q.mappings().all()

    if not rows:
        return {"applicants": [], "total": total, "job": {"job_id": job_row["job_id"], "title": job_row["title"]}}

    # Use MatchingService for skill overlap computation (batched — 2 queries total)
    svc = MatchingService(db)
    student_ids = [r["student_id"] for r in rows]
    all_skill_data = await svc.batch_compute_skill_overlap(student_ids, job_id)

    # Batch-fetch display skills for all students (1 query instead of N)
    from collections import defaultdict
    all_display_skills_q = await db.execute(
        text("""
            SELECT ss.student_id, sk.name
            FROM student_skills ss
            JOIN skills sk ON sk.skill_id = ss.skill_id
            WHERE ss.student_id = ANY(:sids)
        """),
        {"sids": student_ids},
    )
    display_skills_by_student: dict = defaultdict(list)
    for row_sk in all_display_skills_q.mappings().all():
        display_skills_by_student[row_sk["student_id"]].append(row_sk["name"])

    applicants = []
    for r in rows:
        app = dict(r)
        sid = r["student_id"]
        student_exp = r["experience_years"] or 0

        # Compute the 4 signals
        vector_score = float(r["vector_score"]) if r["vector_score"] else 0.0
        skill_data = all_skill_data.get(sid, {})
        skill_score = skill_data.get("skill_score")

        experience_score = svc._compute_experience_fit(
            student_exp, job_row["experience_min_years"], job_row["experience_max_years"],
        )
        preference_score = svc._compute_preference_fit(
            r.get("preferred_remote_types") or [],
            r.get("preferred_job_types") or [],
            r.get("preferred_locations") or [],
            job_row["remote_type"] or "",
            job_row["employment_type"] or "",
            job_row["location"],
        )
        composite = svc._compute_composite(vector_score, skill_score, experience_score, preference_score)

        # Match score in percentage (0-100)
        app["match_score"] = round(composite * 100, 1)
        app["match_breakdown"] = {
            "composite_score": round(composite, 4),
            "vector_score": round(vector_score, 4),
            "skill_score": round(skill_score, 4) if skill_score is not None else None,
            "experience_score": round(experience_score, 4),
            "preference_score": round(preference_score, 4),
        }
        app["matched_skills"] = skill_data.get("matched_skills", [])
        app["missing_skills"] = skill_data.get("missing_skills", [])
        app["total_experience_months"] = (student_exp or 0) * 12
        app["expected_salary"] = float(app["expected_salary"]) if app["expected_salary"] else None
        app["admin_match_score"] = float(app["admin_match_score"]) if app["admin_match_score"] else None
        app["name"] = f"{r['first_name'] or ''} {r['last_name'] or ''}".strip()

        app["skills"] = display_skills_by_student.get(sid, [])

        # Remove internal fields not needed in response
        for key in ["experience_years", "preferred_job_types", "preferred_remote_types", "preferred_locations", "vector_score"]:
            app.pop(key, None)

        applicants.append(app)

    # Apply min_match filter on composite score (post-compute)
    if min_match > 0:
        applicants = [a for a in applicants if a["match_score"] >= min_match]

    # Sort
    if sort_by == "match_score":
        applicants.sort(key=lambda a: a["match_score"], reverse=(sort_order == "desc"))
    elif sort_by == "applied_at":
        applicants.sort(key=lambda a: a.get("applied_at") or "", reverse=(sort_order == "desc"))
    elif sort_by == "name":
        applicants.sort(key=lambda a: a.get("name", "").lower(), reverse=(sort_order == "desc"))

    return {"applicants": applicants, "total": total, "job": {"job_id": job_row["job_id"], "title": job_row["title"]}}


@router.post("/applications/bulk-approve")
async def bulk_approve_applications(
    application_ids: List[int] = Query(..., description="List of application IDs to approve"),
    admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Bulk approve and forward applications to companies."""
    now = utc_now()

    # Get the admin_id from admins table
    admin_row = await db.execute(
        text("SELECT admin_id FROM admins WHERE user_id = :uid"),
        {"uid": admin["user_id"]},
    )
    admin_id = admin_row.scalar()

    updated = 0
    for app_id in application_ids:
        result = await db.execute(
            text("""
                UPDATE applications
                SET status = 'forwarded_to_company',
                    admin_id = :admin_id,
                    admin_reviewed_at = :now,
                    forwarded_at = :now,
                    company_stage = 'new_candidates',
                    updated_at = :now
                WHERE application_id = :app_id
                  AND status IN ('pending_admin_review', 'admin_shortlisted')
                RETURNING application_id
            """),
            {"app_id": app_id, "admin_id": admin_id, "now": now},
        )
        if result.scalar():
            # Insert status history
            await db.execute(
                text("""
                    INSERT INTO application_status_history
                    (application_id, previous_status, new_status, changed_by_user_id, notes, changed_at)
                    VALUES (:app_id, 'pending_admin_review', 'forwarded_to_company', :user_id, 'Bulk approved by admin', :now)
                """),
                {"app_id": app_id, "user_id": admin["user_id"], "now": now},
            )
            # Notify the student
            stu_q = await db.execute(
                text("""
                    SELECT u.user_id, j.title AS job_title, c.company_name
                    FROM applications a
                    JOIN students s ON s.student_id = a.student_id
                    JOIN users u ON u.user_id = s.user_id
                    JOIN jobs j ON j.job_id = a.job_id
                    JOIN companies c ON c.company_id = j.company_id
                    WHERE a.application_id = :app_id
                """),
                {"app_id": app_id},
            )
            stu = stu_q.mappings().first()
            if stu:
                await create_notification(
                    stu["user_id"], "application_update",
                    "Profile Forwarded!",
                    f"Your application for {stu['job_title']} has been forwarded to {stu['company_name']}.",
                    action_url="/student/jobs?tab=applications",
                    action_text="View Applications",
                    reference_type="application", reference_id=app_id,
                )
            updated += 1

    await db.commit()
    return {"success": True, "updated": updated, "total_requested": len(application_ids)}


@router.put("/applications/{application_id}/status")
async def update_application_status(
    application_id: int,
    new_status: str = Query(..., description="New application status"),
    notes: str = Query("", description="Admin notes"),
    admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a single application's status with optional notes."""
    valid_statuses = [
        "pending_admin_review", "admin_shortlisted", "rejected_by_admin",
        "forwarded_to_company",
    ]
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Use one of: {valid_statuses}")

    now = utc_now()
    admin_row = await db.execute(text("SELECT admin_id FROM admins WHERE user_id = :uid"), {"uid": admin["user_id"]})
    admin_id = admin_row.scalar()

    # Get current status
    cur = await db.execute(
        text("SELECT status FROM applications WHERE application_id = :aid"),
        {"aid": application_id},
    )
    old_status = cur.scalar()
    if not old_status:
        raise HTTPException(status_code=404, detail="Application not found")

    update_fields = {
        "status": new_status,
        "admin_id": admin_id,
        "admin_reviewed_at": now,
        "admin_notes": notes if notes else None,
        "updated_at": now,
    }

    if new_status == "forwarded_to_company":
        update_fields["forwarded_at"] = now
        update_fields["company_stage"] = "new_candidates"

    set_parts = ", ".join(f"{k} = :{k}" for k in update_fields)
    update_fields["aid"] = application_id

    await db.execute(
        text(f"UPDATE applications SET {set_parts} WHERE application_id = :aid"),
        update_fields,
    )

    # Insert history
    await db.execute(
        text("""
            INSERT INTO application_status_history
            (application_id, previous_status, new_status, changed_by_user_id, notes, changed_at)
            VALUES (:aid, :old, :new, :uid, :notes, :now)
        """),
        {"aid": application_id, "old": old_status, "new": new_status, "uid": admin["user_id"], "notes": notes, "now": now},
    )

    # Notify the student about status change
    status_labels = {
        "admin_shortlisted": ("Application Shortlisted", "Your application for {job} has been shortlisted."),
        "rejected_by_admin": ("Application Update", "Your application for {job} was not selected to move forward."),
        "forwarded_to_company": ("Profile Forwarded!", "Your application for {job} has been forwarded to {company}."),
    }
    if new_status in status_labels:
        stu_q = await db.execute(
            text("""
                SELECT u.user_id, u.email, j.title AS job_title, c.company_name
                FROM applications a
                JOIN students s ON s.student_id = a.student_id
                JOIN users u ON u.user_id = s.user_id
                JOIN jobs j ON j.job_id = a.job_id
                JOIN companies c ON c.company_id = j.company_id
                WHERE a.application_id = :aid
            """),
            {"aid": application_id},
        )
        stu = stu_q.mappings().first()
        if stu:
            title_tpl, msg_tpl = status_labels[new_status]
            await create_notification(
                stu["user_id"], "application_update",
                title_tpl,
                msg_tpl.format(job=stu["job_title"], company=stu["company_name"]),
                email=stu["email"],
                action_url="/student/jobs?tab=applications",
                action_text="View Applications",
                reference_type="application", reference_id=application_id,
            )

    await db.commit()
    return {"success": True, "application_id": application_id, "status": new_status}
