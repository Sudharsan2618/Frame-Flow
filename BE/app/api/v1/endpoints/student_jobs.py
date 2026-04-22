"""Student-facing job endpoints: browse jobs, recommendations, apply."""

from app.utils.time import utc_now
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Header, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from datetime import datetime

from app.db.postgres import get_db
from app.services.matching_service import MatchingService, COMPOSITE_THRESHOLD
from app.services.notification_service import create_notification
from app.api.dependencies import require_student
from app.schemas.student_jobs import (
    JobListItem, JobListResponse, RecommendedJobsResponse,
    JobDetail, CompanyBrief, CompanyDetail, SkillBrief,
    ApplyRequest, ApplicationOut, MyApplicationsResponse,
    MatchBreakdown, MatchedSkill, MissingSkill, SkillSummary, GapCourse,
)

router = APIRouter(prefix="/student-jobs", tags=["Student Jobs"])



def _build_job_list_item(job: dict) -> JobListItem:
    """Convert a raw query dict to a JobListItem schema."""
    # Build match breakdown if available
    breakdown_data = job.get("match_breakdown")
    match_breakdown = None
    if breakdown_data and isinstance(breakdown_data, dict):
        match_breakdown = MatchBreakdown(**breakdown_data)

    # Build matched/missing skills
    matched_skills = [MatchedSkill(**s) for s in job.get("matched_skills", [])]
    missing_skills = [MissingSkill(**s) for s in job.get("missing_skills", [])]

    return JobListItem(
        job_id=job["job_id"],
        title=job["title"],
        slug=job["slug"],
        description=job["description"][:300] + "..." if len(job.get("description", "") or "") > 300 else job.get("description", ""),
        employment_type=job["employment_type"],
        remote_type=job["remote_type"],
        location=job.get("location"),
        salary_min=job.get("salary_min"),
        salary_max=job.get("salary_max"),
        salary_currency=job.get("salary_currency", "INR"),
        salary_is_visible=job.get("salary_is_visible", False),
        experience_min_years=job.get("experience_min_years", 0),
        experience_max_years=job.get("experience_max_years"),
        benefits=job.get("benefits"),
        posted_at=job.get("posted_at"),
        deadline=job.get("deadline"),
        department=job.get("department"),
        applications_count=job.get("applications_count", 0),
        match_score=job.get("match_score"),
        match_breakdown=match_breakdown,
        matched_skills=matched_skills,
        missing_skills=missing_skills,
        skills=[SkillBrief(**s) for s in job.get("skills", [])],
        company=CompanyBrief(
            company_id=job["company_id"],
            company_name=job["company_name"],
            logo_url=job.get("logo_url"),
            industry=job.get("industry"),
            company_location=job.get("company_location"),
        ),
    )


# ── GET /student-jobs/recommended ────────────────────────────────────────

@router.get("/recommended", response_model=RecommendedJobsResponse)
async def get_recommended_jobs(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user: dict = Depends(require_student),
    db: AsyncSession = Depends(get_db),
):
    """
    Get AI-recommended jobs using hybrid matching.
    Returns ALL jobs whose composite score >= 65% (vector 35% + skills 35% + experience 20% + preferences 10%).
    """
    student_id = user["student_id"]
    svc = MatchingService(db)
    jobs = await svc.get_recommended_jobs_for_student(student_id, limit=limit, offset=offset)
    items = [_build_job_list_item(j) for j in jobs]
    return RecommendedJobsResponse(
        jobs=items,
        threshold=COMPOSITE_THRESHOLD,
        total=len(items),
    )


# ── GET /student-jobs ────────────────────────────────────────────────────

@router.get("", response_model=JobListResponse)
async def get_all_jobs(
    search: str = Query("", max_length=200),
    employment_type: str = Query(""),
    remote_type: str = Query(""),
    location: str = Query(""),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: dict = Depends(require_student),
    db: AsyncSession = Depends(get_db),
):
    """Browse all active jobs with optional filters. Includes composite match score if student has embedding."""
    student_id = user["student_id"]
    svc = MatchingService(db)
    jobs = await svc.get_all_active_jobs(
        student_id=student_id,
        search=search,
        employment_type=employment_type,
        remote_type=remote_type,
        location=location,
        limit=limit,
        offset=offset,
    )
    items = [_build_job_list_item(j) for j in jobs]
    return JobListResponse(jobs=items, total=len(items))


# ── GET /student-jobs/applications/me ────────────────────────────────────
# NOTE: This must come BEFORE /{job_id} to avoid "applications" being parsed as job_id

@router.get("/applications/me", response_model=MyApplicationsResponse)
async def get_my_applications(
    user: dict = Depends(require_student),
    db: AsyncSession = Depends(get_db),
):
    """Get all applications for the authenticated student."""
    student_id = user["student_id"]

    result = await db.execute(
        text("""
            SELECT
                a.application_id, a.job_id, a.status,
                a.cover_letter, a.expected_salary, a.notice_period_days,
                a.applied_at, a.updated_at, a.admin_match_score,
                j.title AS job_title,
                c.company_name, c.logo_url AS company_logo
            FROM applications a
            JOIN jobs j ON j.job_id = a.job_id
            JOIN companies c ON c.company_id = j.company_id
            WHERE a.student_id = :sid
            ORDER BY a.applied_at DESC
        """),
        {"sid": student_id},
    )
    rows = result.mappings().all()

    apps = []
    for r in rows:
        apps.append(ApplicationOut(
            application_id=r["application_id"],
            job_id=r["job_id"],
            status=r["status"],
            cover_letter=r["cover_letter"],
            expected_salary=float(r["expected_salary"]) if r["expected_salary"] else None,
            notice_period_days=r["notice_period_days"],
            applied_at=r["applied_at"],
            updated_at=r["updated_at"],
            job_title=r["job_title"],
            company_name=r["company_name"],
            company_logo=r["company_logo"],
            match_score=float(r["admin_match_score"]) if r["admin_match_score"] else None,
        ))

    return MyApplicationsResponse(applications=apps, total=len(apps))


# ── GET /student-jobs/{job_id} ───────────────────────────────────────────

@router.get("/{job_id}", response_model=JobDetail)
async def get_job_detail(
    job_id: int,
    user: dict = Depends(require_student),
    db: AsyncSession = Depends(get_db),
):
    """Get full job detail with composite match breakdown, skill gaps, and course recommendations."""
    student_id = user["student_id"]
    svc = MatchingService(db)
    job = await svc.get_job_detail(job_id, student_id=student_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    has_applied = await svc.check_student_applied(student_id, job_id)

    # Build match breakdown
    breakdown_data = job.get("match_breakdown")
    match_breakdown = MatchBreakdown(**breakdown_data) if breakdown_data and isinstance(breakdown_data, dict) else None

    # Build skill summary
    summary_data = job.get("skill_summary")
    skill_summary = SkillSummary(**summary_data) if summary_data and isinstance(summary_data, dict) else None

    # Build gap courses
    gap_courses = [GapCourse(**gc) for gc in job.get("gap_courses", [])]

    return JobDetail(
        job_id=job["job_id"],
        title=job["title"],
        slug=job["slug"],
        description=job.get("description", ""),
        responsibilities=job.get("responsibilities"),
        requirements=job.get("requirements"),
        nice_to_have=job.get("nice_to_have"),
        employment_type=job["employment_type"],
        remote_type=job["remote_type"],
        location=job.get("location"),
        department=job.get("department"),
        salary_min=job.get("salary_min"),
        salary_max=job.get("salary_max"),
        salary_currency=job.get("salary_currency", "INR"),
        salary_is_visible=job.get("salary_is_visible", False),
        experience_min_years=job.get("experience_min_years", 0),
        experience_max_years=job.get("experience_max_years"),
        benefits=job.get("benefits"),
        posted_at=job.get("posted_at"),
        deadline=job.get("deadline"),
        applications_count=job.get("applications_count", 0),
        match_score=job.get("match_score"),
        match_breakdown=match_breakdown,
        matched_skills=[MatchedSkill(**s) for s in job.get("matched_skills", [])],
        missing_skills=[MissingSkill(**s) for s in job.get("missing_skills", [])],
        skill_summary=skill_summary,
        gap_courses=gap_courses,
        has_applied=has_applied,
        skills=[SkillBrief(**s) for s in job.get("skills", [])],
        company=CompanyDetail(
            company_id=job["company_id"],
            company_name=job["company_name"],
            logo_url=job.get("logo_url"),
            industry=job.get("industry"),
            company_location=job.get("company_location"),
            company_website=job.get("company_website"),
            company_size=job.get("company_size"),
            company_description=job.get("company_description"),
        ),
    )


# ── POST /student-jobs/{job_id}/apply ────────────────────────────────────

@router.post("/{job_id}/apply", response_model=ApplicationOut)
async def apply_to_job(
    job_id: int,
    body: ApplyRequest,
    user: dict = Depends(require_student),
    db: AsyncSession = Depends(get_db),
):
    """Apply to a job. Application goes to admin for review first."""
    student_id = user["student_id"]

    # Check job exists and is active
    job_result = await db.execute(
        text("SELECT job_id, title, status FROM jobs WHERE job_id = :jid"),
        {"jid": job_id},
    )
    job_row = job_result.mappings().first()
    if not job_row:
        raise HTTPException(status_code=404, detail="Job not found")
    if job_row["status"] != "active":
        raise HTTPException(status_code=400, detail="This job is no longer accepting applications")

    # Check if already applied
    existing = await db.execute(
        text("SELECT application_id FROM applications WHERE student_id = :sid AND job_id = :jid"),
        {"sid": student_id, "jid": job_id},
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="You have already applied to this job")

    # Compute composite match score for admin reference
    svc = MatchingService(db)
    composite_score = await svc.compute_composite_for_application(student_id, job_id)
    admin_match_score = round(composite_score * 100, 2) if composite_score is not None else None

    # Insert application
    now = utc_now()
    result = await db.execute(
        text("""
            INSERT INTO applications (student_id, job_id, status, cover_letter, expected_salary,
                notice_period_days, admin_match_score, applied_at, updated_at)
            VALUES (:sid, :jid, 'pending_admin_review', :cover, :salary, :notice, :match_score, :now, :now)
            RETURNING application_id
        """),
        {
            "sid": student_id,
            "jid": job_id,
            "cover": body.cover_letter,
            "salary": body.expected_salary,
            "notice": body.notice_period_days,
            "match_score": admin_match_score,
            "now": now,
        },
    )
    app_id = result.scalar_one()

    # Increment applications_count on the job
    await db.execute(
        text("UPDATE jobs SET applications_count = applications_count + 1 WHERE job_id = :jid"),
        {"jid": job_id},
    )

    # Notify the student (confirmation)
    await create_notification(
        user["user_id"], "application_update",
        "Application Submitted",
        f"Your application for {job_row['title']} has been submitted and is under review.",
        action_url="/student/jobs?tab=applications",
        action_text="View Applications",
        reference_type="application", reference_id=app_id,
    )

    # Notify all admins about the new application
    admin_users = await db.execute(
        text("SELECT user_id FROM users WHERE user_type = 'admin' AND status = 'active'")
    )
    for admin_row in admin_users.mappings().all():
        await create_notification(
            admin_row["user_id"], "application_update",
            "New Application",
            f"A student applied for {job_row['title']}. Review and take action.",
            action_url="/admin/matching",
            action_text="Review",
            reference_type="application", reference_id=app_id,
        )

    await db.commit()

    return ApplicationOut(
        application_id=app_id,
        job_id=job_id,
        status="pending_admin_review",
        cover_letter=body.cover_letter,
        expected_salary=body.expected_salary,
        notice_period_days=body.notice_period_days,
        applied_at=now,
        updated_at=now,
        job_title=job_row["title"],
        match_score=admin_match_score,
    )
