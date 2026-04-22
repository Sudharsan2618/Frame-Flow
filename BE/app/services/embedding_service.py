"""Embedding service â€” generates text embeddings via Gemini REST API and stores in PostgreSQL pgvector."""

from app.utils.time import utc_now
import hashlib
import logging
import requests
from datetime import datetime
from typing import Optional

from app.config import settings
from app.db.mongodb import get_mongodb

logger = logging.getLogger(__name__)

# â”€â”€ Config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIM = 1536
GEMINI_EMBED_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{EMBEDDING_MODEL}:embedContent"


# â”€â”€ Core embedding function â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def generate_embedding(text: str, task_type: str = "RETRIEVAL_DOCUMENT") -> list[float]:
    """
    Generate a 1536-dimension embedding for the given text using Gemini REST API.

    Args:
        text: Input text to embed (will be truncated to 8000 chars)
        task_type: Gemini task type (RETRIEVAL_DOCUMENT, RETRIEVAL_QUERY, etc.)

    Returns:
        List of 1536 floats representing the text embedding
    """
    text = text[:8000]

    payload = {
        "model": f"models/{EMBEDDING_MODEL}",
        "content": {"parts": [{"text": text}]},
        "taskType": task_type,
        "output_dimensionality": EMBEDDING_DIM,
    }

    resp = requests.post(
        GEMINI_EMBED_URL,
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": settings.GEMINI_API_KEY,
        },
        json=payload,
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    return data["embedding"]["values"]


def text_hash(text: str) -> str:
    """Compute SHA-256 hash of text for change detection."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


# â”€â”€ Student embedding â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def build_student_text(
    *,
    skills: list[str],
    experience_years: int = 0,
    education: list[str] | None = None,
    certifications: list[str] | None = None,
    job_titles: list[str] | None = None,
    summary: str = "",
    bio: str = "",
    completed_courses: list[str] | None = None,
) -> str:
    """Build a single text block from student data for embedding."""
    parts = []
    if summary:
        parts.append(f"Professional Summary: {summary}")
    if bio:
        parts.append(f"Bio: {bio}")
    if skills:
        parts.append(f"Skills: {', '.join(skills)}")
    if experience_years:
        parts.append(f"Experience: {experience_years} years")
    if education:
        parts.append(f"Education: {'; '.join(education)}")
    if certifications:
        parts.append(f"Certifications: {'; '.join(certifications)}")
    if job_titles:
        parts.append(f"Previous Roles: {', '.join(job_titles)}")
    if completed_courses:
        parts.append(f"Completed Courses: {'; '.join(completed_courses)}")
    return "\n".join(parts)


async def generate_student_embedding(student_id: int) -> Optional[dict]:
    """
    Generate and store an embedding for a student.

    Data sources (merged, best-effort):
      1. PostgreSQL â€” student profile (bio, headline, education, experience_years)
      2. PostgreSQL â€” student_skills table
      3. PostgreSQL â€” enrolled / completed course titles
      4. MongoDB   â€” resume_analysis extracted data (skills, certifications, job_titles, summary)

    Works even if only profile data exists (e.g. right after onboarding).

    Returns:
        dict with embedding metadata, or None if no meaningful text could be built
    """
    from app.db.postgres import async_session_factory
    from app.models.embedding import StudentEmbedding
    from sqlalchemy import select

    # â”€â”€ 1. PostgreSQL: student profile + skills + courses â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    bio = ""
    headline = ""
    education_pg = ""
    experience_years = 0
    pg_skills: list[str] = []
    completed_courses: list[str] = []
    enrolled_courses: list[str] = []
    preferred_job_types: list[str] = []

    async with async_session_factory() as session:
        from app.models.user import Student
        from sqlalchemy import text as sql_text

        student = await session.get(Student, student_id)
        if student:
            bio = student.bio or ""
            headline = student.headline or ""
            education_pg = student.education or ""
            experience_years = student.experience_years or 0
            preferred_job_types = student.preferred_job_types or []

        # Skills from student_skills join
        skills_q = await session.execute(
            sql_text("""
                SELECT s.name
                FROM student_skills ss
                JOIN skills s ON s.skill_id = ss.skill_id
                WHERE ss.student_id = :sid
            """),
            {"sid": student_id},
        )
        pg_skills = [row[0] for row in skills_q.fetchall()]

        # Completed course titles
        comp_q = await session.execute(
            sql_text("""
                SELECT c.title
                FROM enrollments e
                JOIN courses c ON c.course_id = e.course_id
                WHERE e.student_id = :sid AND (e.status = 'completed' OR e.certificate_issued = true)
                ORDER BY e.completed_at DESC
            """),
            {"sid": student_id},
        )
        completed_courses = [row[0] for row in comp_q.fetchall()]

        # Currently enrolled (in-progress) course titles
        enr_q = await session.execute(
            sql_text("""
                SELECT c.title
                FROM enrollments e
                JOIN courses c ON c.course_id = e.course_id
                WHERE e.student_id = :sid AND e.status = 'in_progress'
                ORDER BY e.enrolled_at DESC
            """),
            {"sid": student_id},
        )
        enrolled_courses = [row[0] for row in enr_q.fetchall()]

    # â”€â”€ 2. MongoDB: resume analysis (optional enrichment) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    extracted: dict = {}
    try:
        db = get_mongodb()
        analysis = await db["resume_analysis"].find_one(
            {"student_id": student_id},
            {"_id": 0},
        )
        if analysis and "extracted_data" in analysis:
            extracted = analysis["extracted_data"]
    except Exception:
        pass  # MongoDB unavailable â€” continue with PG data only

    # â”€â”€ 3. Merge data: resume analysis enriches PG data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    all_skills = list(dict.fromkeys(
        extracted.get("skills", []) + pg_skills
    ))  # deduplicated, preserving order

    education_list = extracted.get("education", [])
    if education_pg and education_pg not in education_list:
        education_list = [education_pg] + education_list

    summary = extracted.get("summary", "")
    if not summary and headline:
        summary = headline

    certifications = extracted.get("certifications", [])
    job_titles = extracted.get("job_titles", [])
    if preferred_job_types:
        job_titles = list(dict.fromkeys(job_titles + [jt.replace("_", " ") for jt in preferred_job_types]))

    all_courses = completed_courses + enrolled_courses

    # â”€â”€ 4. Build text and check hash â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    embed_text = build_student_text(
        skills=all_skills,
        experience_years=extracted.get("experience_years", experience_years),
        education=education_list,
        certifications=certifications,
        job_titles=job_titles,
        summary=summary,
        bio=bio,
        completed_courses=all_courses,
    )

    if not embed_text.strip():
        return None

    current_hash = text_hash(embed_text)

    # 4. Check if embedding already exists with same hash
    async with async_session_factory() as session:
        existing = await session.execute(
            select(StudentEmbedding).where(StudentEmbedding.student_id == student_id)
        )
        existing_row = existing.scalar_one_or_none()

        if existing_row and existing_row.source_text_hash == current_hash:
            return {
                "student_id": student_id,
                "status": "unchanged",
                "source_text_hash": current_hash,
            }

    # 5. Generate embedding
    vector = generate_embedding(embed_text)

    # 6. Upsert into PostgreSQL
    async with async_session_factory() as session:
        existing = await session.execute(
            select(StudentEmbedding).where(StudentEmbedding.student_id == student_id)
        )
        row = existing.scalar_one_or_none()

        now = utc_now()
        if row:
            row.embedding = vector
            row.source_text_hash = current_hash
            row.embedding_model = "gemini-embedding-001"
            row.updated_at = now
        else:
            row = StudentEmbedding(
                student_id=student_id,
                embedding=vector,
                embedding_model="gemini-embedding-001",
                source_text_hash=current_hash,
                created_at=now,
                updated_at=now,
            )
            session.add(row)

        await session.commit()

    return {
        "student_id": student_id,
        "status": "generated",
        "source_text_hash": current_hash,
        "dimensions": len(vector),
    }


# â”€â”€ Job embedding (for future use) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def build_job_text(
    *,
    title: str = "",
    description: str = "",
    requirements: str = "",
    skills: list[str] | None = None,
    employment_type: str = "",
    location: str = "",
) -> str:
    """Build a single text block from job data for embedding."""
    parts = []
    if title:
        parts.append(f"Job Title: {title}")
    if description:
        parts.append(f"Description: {description}")
    if requirements:
        parts.append(f"Requirements: {requirements}")
    if skills:
        parts.append(f"Required Skills: {', '.join(skills)}")
    if employment_type:
        parts.append(f"Employment Type: {employment_type}")
    if location:
        parts.append(f"Location: {location}")
    return "\n".join(parts)
