"""Certificate API — issue and retrieve course completion certificates."""

from app.utils.time import utc_now
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Header, Query
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.db.postgres import get_db
from app.services.embedding_service import generate_student_embedding
from app.api.dependencies import require_student

import logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/certificates", tags=["Certificates"])



# ── POST /certificates/issue/{enrollment_id} ────────────────────────────

@router.post("/issue/{enrollment_id}")
async def issue_certificate(
    enrollment_id: int,
    student: dict = Depends(require_student),
    db: AsyncSession = Depends(get_db),
):
    """Issue a certificate for a completed enrollment."""
    user_id = student["user_id"]
    # Get enrollment with student + course info
    result = await db.execute(
        text("""
            SELECT e.enrollment_id, e.student_id, e.course_id, e.status,
                   e.progress_percentage, e.completed_at,
                   e.certificate_issued, e.certificate_url,
                   s.user_id, s.first_name, s.last_name,
                   c.title AS course_title
            FROM enrollments e
            JOIN students s ON s.student_id = e.student_id
            JOIN courses c ON c.course_id = e.course_id
            WHERE e.enrollment_id = :eid AND s.user_id = :uid
        """),
        {"eid": enrollment_id, "uid": user_id},
    )
    row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Enrollment not found")

    if row["status"] != "completed" and float(row["progress_percentage"]) < 100:
        raise HTTPException(status_code=400, detail="Course not yet completed. Finish all lessons first.")

    # If already issued, return existing
    if row["certificate_issued"]:
        return {
            "success": True,
            "already_issued": True,
            "certificate_url": row["certificate_url"],
        }

    # Generate certificate URL (points to our view endpoint)
    cert_url = f"/certificates/view/{enrollment_id}"
    now = utc_now()

    # Mark as completed if not already
    await db.execute(
        text("""
            UPDATE enrollments
            SET certificate_issued = true,
                certificate_url = :url,
                certificate_issued_at = :now,
                status = 'completed',
                completed_at = COALESCE(completed_at, :now)
            WHERE enrollment_id = :eid
        """),
        {"eid": enrollment_id, "url": cert_url, "now": now},
    )

    # Increment total_completions on the course
    await db.execute(
        text("UPDATE courses SET total_completions = total_completions + 1 WHERE course_id = :cid"),
        {"cid": row["course_id"]},
    )
    await db.commit()

    # ── Regenerate student embedding (includes completed courses now) ────
    student_id = row["student_id"]
    embedding_status = None
    try:
        embedding_result = await generate_student_embedding(student_id)
        embedding_status = embedding_result.get("status") if embedding_result else "no_resume"
        logger.info(f"Student {student_id} embedding after cert: {embedding_status}")
    except Exception as e:
        logger.warning(f"Embedding generation failed for student {student_id}: {e}")
        embedding_status = "error"

    # ── Find top job matches and notify the student ──────────────────────
    if embedding_status == "generated":
        try:
            matches_q = await db.execute(
                text("""
                    SELECT j.job_id, j.title, c.company_name,
                           ROUND((1.0 - (je.embedding <=> se.embedding))::numeric, 4) AS score
                    FROM job_embeddings je
                    JOIN student_embeddings se ON se.student_id = :sid
                    JOIN jobs j ON j.job_id = je.job_id AND j.status = 'active'
                    JOIN companies c ON c.company_id = j.company_id
                    WHERE (1.0 - (je.embedding <=> se.embedding)) > 0.5
                    ORDER BY score DESC
                    LIMIT 3
                """),
                {"sid": student_id},
            )
            top_matches = matches_q.mappings().all()

            if top_matches:
                match_titles = ", ".join(m["title"] for m in top_matches[:3])
                from app.services.notification_service import create_notification
                await create_notification(
                    user_id, "job_match",
                    "New Job Matches!",
                    f"Based on your completed course \"{row['course_title']}\", we found matching jobs: {match_titles}.",
                    action_url="/student/jobs",
                    action_text="View Jobs",
                    reference_type="course", reference_id=row["course_id"],
                )
                await db.commit()
        except Exception as e:
            logger.warning(f"Job matching notification failed for student {student_id}: {e}")

    return {
        "success": True,
        "already_issued": False,
        "certificate_url": cert_url,
        "issued_at": now.isoformat(),
        "embedding_status": embedding_status,
    }


# ── GET /certificates/view/{enrollment_id} ──────────────────────────────

@router.get("/view/{enrollment_id}", response_class=HTMLResponse)
async def view_certificate(
    enrollment_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Render a printable HTML certificate. No auth required (URL is the secret)."""
    result = await db.execute(
        text("""
            SELECT e.enrollment_id, e.certificate_issued, e.certificate_issued_at,
                   e.completed_at, e.enrolled_at,
                   s.first_name, s.last_name,
                   c.title AS course_title, c.duration_hours,
                   c.difficulty_level, c.slug
            FROM enrollments e
            JOIN students s ON s.student_id = e.student_id
            JOIN courses c ON c.course_id = e.course_id
            WHERE e.enrollment_id = :eid AND e.certificate_issued = true
        """),
        {"eid": enrollment_id},
    )
    row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Certificate not found")

    student_name = f"{row['first_name'] or ''} {row['last_name'] or ''}".strip() or "Student"
    course_title = row["course_title"]
    issued_date = row["certificate_issued_at"]
    date_str = issued_date.strftime("%B %d, %Y") if issued_date else "N/A"
    cert_id = f"SB-{enrollment_id:06d}"
    duration = row["duration_hours"] or "N/A"
    level = (row["difficulty_level"] or "").replace("_", " ").title()

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Certificate — {student_name}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap');

        * {{ margin: 0; padding: 0; box-sizing: border-box; }}

        body {{
            background: #f1f5f9;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 2rem;
            font-family: 'Inter', sans-serif;
        }}

        .certificate {{
            width: 900px;
            min-height: 636px;
            background: white;
            position: relative;
            padding: 60px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0,0,0,0.08);
        }}

        .border-outer {{
            position: absolute;
            inset: 12px;
            border: 2px solid #1e3a5f;
        }}

        .border-inner {{
            position: absolute;
            inset: 18px;
            border: 1px solid #c9a84c;
        }}

        .corner {{
            position: absolute;
            width: 40px;
            height: 40px;
            border: 3px solid #c9a84c;
        }}
        .corner-tl {{ top: 14px; left: 14px; border-right: 0; border-bottom: 0; }}
        .corner-tr {{ top: 14px; right: 14px; border-left: 0; border-bottom: 0; }}
        .corner-bl {{ bottom: 14px; left: 14px; border-right: 0; border-top: 0; }}
        .corner-br {{ bottom: 14px; right: 14px; border-left: 0; border-top: 0; }}

        .logo {{
            font-family: 'Inter', sans-serif;
            font-weight: 700;
            font-size: 14px;
            color: #1e3a5f;
            letter-spacing: 3px;
            text-transform: uppercase;
            margin-bottom: 8px;
        }}

        .subtitle {{
            font-family: 'Playfair Display', serif;
            font-size: 32px;
            font-weight: 600;
            color: #1e3a5f;
            letter-spacing: 4px;
            text-transform: uppercase;
            margin-bottom: 6px;
        }}

        .of-completion {{
            font-size: 13px;
            color: #6b7280;
            letter-spacing: 2px;
            text-transform: uppercase;
            margin-bottom: 28px;
        }}

        .presented {{
            font-size: 12px;
            color: #9ca3af;
            letter-spacing: 1px;
            margin-bottom: 6px;
        }}

        .student-name {{
            font-family: 'Playfair Display', serif;
            font-size: 38px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 20px;
            padding-bottom: 8px;
            border-bottom: 2px solid #c9a84c;
            display: inline-block;
        }}

        .description {{
            font-size: 14px;
            color: #4b5563;
            line-height: 1.7;
            max-width: 600px;
            margin-bottom: 32px;
        }}

        .course-title {{
            font-weight: 600;
            color: #111827;
        }}

        .footer {{
            display: flex;
            justify-content: space-between;
            width: 100%;
            max-width: 600px;
            margin-top: auto;
        }}

        .footer-item {{
            text-align: center;
        }}

        .footer-value {{
            font-size: 13px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 4px;
        }}

        .footer-label {{
            font-size: 10px;
            color: #9ca3af;
            text-transform: uppercase;
            letter-spacing: 1px;
        }}

        .footer-line {{
            width: 120px;
            border-top: 1px solid #d1d5db;
            padding-top: 8px;
        }}

        .actions {{
            margin-top: 1.5rem;
            display: flex;
            gap: 1rem;
        }}

        .btn {{
            padding: 10px 24px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            border: none;
            transition: all 0.15s;
        }}

        .btn-primary {{
            background: #1e3a5f;
            color: white;
        }}
        .btn-primary:hover {{ background: #15304f; }}

        .btn-outline {{
            background: white;
            color: #374151;
            border: 1px solid #d1d5db;
        }}
        .btn-outline:hover {{ background: #f9fafb; }}

        @media print {{
            body {{ background: white; padding: 0; }}
            .certificate {{ box-shadow: none; }}
            .actions {{ display: none; }}
        }}
    </style>
</head>
<body>
    <div class="certificate">
        <div class="border-outer"></div>
        <div class="border-inner"></div>
        <div class="corner corner-tl"></div>
        <div class="corner corner-tr"></div>
        <div class="corner corner-bl"></div>
        <div class="corner corner-br"></div>

        <div class="logo"><img src="public/logo.png" alt="SkillBridge Logo"></div>
        <div class="subtitle">Certificate</div>
        <div class="of-completion">of Completion</div>

        <div class="presented">This is proudly presented to</div>
        <div class="student-name">{student_name}</div>

        <div class="description">
            For successfully completing the <span class="course-title">{course_title}</span> course
            ({duration} hours, {level} level) on the SkillBridge learning platform.
        </div>

        <div class="footer">
            <div class="footer-item footer-line">
                <div class="footer-value">{date_str}</div>
                <div class="footer-label">Date Issued</div>
            </div>
            <div class="footer-item footer-line">
                <div class="footer-value">{cert_id}</div>
                <div class="footer-label">Certificate ID</div>
            </div>
            <div class="footer-item footer-line">
                <div class="footer-value">SkillBridge</div>
                <div class="footer-label">Platform</div>
            </div>
        </div>
    </div>

    <div class="actions">
        <button class="btn btn-primary" onclick="window.print()">🖨️ Print / Save as PDF</button>
        <button class="btn btn-outline" onclick="window.close()">Close</button>
    </div>
</body>
</html>"""

    return HTMLResponse(content=html)


# ── GET /certificates/my ─────────────────────────────────────────────────

@router.get("/my")
async def get_my_certificates(
    student: dict = Depends(require_student),
    db: AsyncSession = Depends(get_db),
):
    """List all certificates for the current student."""
    result = await db.execute(
        text("""
            SELECT e.enrollment_id, e.certificate_url, e.certificate_issued_at,
                   e.completed_at, c.title AS course_title, c.slug,
                   c.difficulty_level, c.duration_hours
            FROM enrollments e
            JOIN students s ON s.student_id = e.student_id
            JOIN courses c ON c.course_id = e.course_id
            WHERE s.user_id = :uid AND e.certificate_issued = true
            ORDER BY e.certificate_issued_at DESC
        """),
        {"uid": student["user_id"]},
    )
    rows = result.mappings().all()
    certs = []
    for r in rows:
        certs.append({
            "enrollment_id": r["enrollment_id"],
            "course_title": r["course_title"],
            "course_slug": r["slug"],
            "difficulty_level": r["difficulty_level"],
            "duration_hours": r["duration_hours"],
            "certificate_url": r["certificate_url"],
            "issued_at": r["certificate_issued_at"].isoformat() if r["certificate_issued_at"] else None,
            "completed_at": r["completed_at"].isoformat() if r["completed_at"] else None,
        })
    return {"certificates": certs, "total": len(certs)}
