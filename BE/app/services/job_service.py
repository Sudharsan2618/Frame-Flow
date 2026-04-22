"""Service for job creation, management, and embedding generation."""

from app.utils.time import utc_now
import re
import logging
from datetime import datetime
from typing import Optional

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.job import Job, JobSkill
from app.models.user import User, Company
from app.models.embedding import JobEmbedding
from app.services.embedding_service import generate_embedding, build_job_text, text_hash

logger = logging.getLogger(__name__)


def _slugify(title: str, job_id: int = 0) -> str:
    """Generate a URL-friendly slug from a job title."""
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    # Append a unique suffix to avoid collisions
    import time
    suffix = str(int(time.time() * 1000))[-6:]
    return f"{slug}-{suffix}"


class JobService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_company_for_user(self, user_id: int) -> Company:
        """Get the company record for a given user_id."""
        result = await self.db.execute(
            select(User)
            .options(selectinload(User.company))
            .where(User.user_id == user_id)
        )
        user = result.scalar_one_or_none()
        if not user or not user.company:
            raise ValueError("Company not found for this user")
        return user.company

    async def _get_or_create_skill(self, skill_name: str) -> int:
        """Get skill_id by name, or create a new skill if it doesn't exist."""
        name_clean = skill_name.strip()
        slug = re.sub(r"[^a-z0-9]+", "-", name_clean.lower()).strip("-")

        # Try to find existing skill
        result = await self.db.execute(
            text("SELECT skill_id FROM skills WHERE LOWER(name) = LOWER(:name)"),
            {"name": name_clean},
        )
        row = result.fetchone()
        if row:
            return row[0]

        # Create new skill
        result = await self.db.execute(
            text(
                "INSERT INTO skills (name, slug) VALUES (:name, :slug) "
                "ON CONFLICT (name) DO UPDATE SET name = skills.name "
                "RETURNING skill_id"
            ),
            {"name": name_clean, "slug": slug},
        )
        row = result.fetchone()
        return row[0]

    async def create_job(self, user_id: int, data: dict) -> dict:
        """Create a new job posting and generate its embedding."""
        company = await self._get_company_for_user(user_id)

        # Build slug
        slug = _slugify(data["title"])

        # Determine posted_at based on status
        now = utc_now()
        posted_at = now if data.get("status") == "active" else None

        # Create job
        job = Job(
            company_id=company.company_id,
            title=data["title"],
            slug=slug,
            description=data["description"],
            responsibilities=data.get("responsibilities"),
            requirements=data.get("requirements"),
            nice_to_have=data.get("nice_to_have"),
            department=data.get("department"),
            employment_type=data["employment_type"],
            remote_type=data.get("remote_type", "on_site"),
            location=data.get("location"),
            experience_min_years=data.get("experience_min_years", 0),
            experience_max_years=data.get("experience_max_years"),
            salary_min=data.get("salary_min"),
            salary_max=data.get("salary_max"),
            salary_currency=data.get("salary_currency", "INR"),
            salary_is_visible=data.get("salary_is_visible", False),
            benefits=data.get("benefits", []),
            status=data.get("status", "draft"),
            posted_at=posted_at,
            deadline=data.get("deadline"),
            created_at=now,
            updated_at=now,
        )
        self.db.add(job)
        await self.db.flush()  # Get job_id

        # Process skills
        skill_names = []
        for skill_input in data.get("skills", []):
            skill_id = await self._get_or_create_skill(skill_input["name"])
            job_skill = JobSkill(
                job_id=job.job_id,
                skill_id=skill_id,
                is_mandatory=skill_input.get("is_mandatory", True),
                min_experience_years=skill_input.get("min_experience_years"),
            )
            self.db.add(job_skill)
            skill_names.append(skill_input["name"])

        # Increment company total_jobs_posted
        company.total_jobs_posted = (company.total_jobs_posted or 0) + 1
        company.updated_at = now

        await self.db.flush()

        # Generate job embedding (async-safe: uses same session)
        embedding_status = await self._generate_job_embedding(
            job_id=job.job_id,
            title=data["title"],
            description=data["description"],
            requirements=data.get("requirements", ""),
            responsibilities=data.get("responsibilities", ""),
            nice_to_have=data.get("nice_to_have", ""),
            skills=skill_names,
            employment_type=data["employment_type"],
            location=data.get("location", ""),
        )

        await self.db.commit()

        # If job is active, notify matching students in the background
        if job.status == "active":
            try:
                await self.notify_matching_students(job.job_id, job.title, company.company_name)
            except Exception as e:
                logger.error(f"Failed to send matching alerts: {e}")

        return {
            "job_id": job.job_id,
            "company_id": company.company_id,
            "title": job.title,
            "slug": job.slug,
            "description": job.description,
            "responsibilities": job.responsibilities,
            "requirements": job.requirements,
            "nice_to_have": job.nice_to_have,
            "department": job.department,
            "employment_type": job.employment_type,
            "remote_type": job.remote_type,
            "location": job.location,
            "experience_min_years": job.experience_min_years,
            "experience_max_years": job.experience_max_years,
            "salary_min": job.salary_min,
            "salary_max": job.salary_max,
            "salary_currency": job.salary_currency,
            "salary_is_visible": job.salary_is_visible,
            "benefits": job.benefits or [],
            "status": job.status,
            "posted_at": job.posted_at.isoformat() if job.posted_at else None,
            "deadline": job.deadline.isoformat() if job.deadline else None,
            "views_count": job.views_count,
            "applications_count": job.applications_count,
            "skills": [
                {
                    "skill_id": 0,  # We don't need to re-query
                    "name": s["name"],
                    "is_mandatory": s.get("is_mandatory", True),
                    "min_experience_years": s.get("min_experience_years"),
                }
                for s in data.get("skills", [])
            ],
            "embedding_status": embedding_status,
            "created_at": job.created_at.isoformat() if job.created_at else None,
        }

    async def _generate_job_embedding(
        self,
        job_id: int,
        title: str,
        description: str,
        requirements: str,
        responsibilities: str,
        nice_to_have: str,
        skills: list[str],
        employment_type: str,
        location: str,
    ) -> str:
        """Generate and store a vector embedding for the job posting."""
        try:
            # Build rich text for embedding â€” include all relevant content
            parts = []
            if title:
                parts.append(f"Job Title: {title}")
            if description:
                parts.append(f"Description: {description}")
            if responsibilities:
                parts.append(f"Responsibilities: {responsibilities}")
            if requirements:
                parts.append(f"Requirements: {requirements}")
            if nice_to_have:
                parts.append(f"Nice to Have: {nice_to_have}")
            if skills:
                parts.append(f"Required Skills: {', '.join(skills)}")
            if employment_type:
                parts.append(f"Employment Type: {employment_type.replace('_', ' ')}")
            if location:
                parts.append(f"Location: {location}")

            embed_text = "\n".join(parts)
            if not embed_text.strip():
                return "skipped_empty"

            current_hash = text_hash(embed_text)

            # Check if embedding already exists with same hash
            existing = await self.db.execute(
                select(JobEmbedding).where(JobEmbedding.job_id == job_id)
            )
            existing_row = existing.scalar_one_or_none()
            if existing_row and existing_row.source_text_hash == current_hash:
                return "unchanged"

            # Generate embedding via Gemini
            vector = generate_embedding(embed_text)

            now = utc_now()
            if existing_row:
                existing_row.embedding = vector
                existing_row.source_text_hash = current_hash
                existing_row.embedding_model = "gemini-embedding-001"
                existing_row.updated_at = now
            else:
                emb = JobEmbedding(
                    job_id=job_id,
                    embedding=vector,
                    embedding_model="gemini-embedding-001",
                    source_text_hash=current_hash,
                    created_at=now,
                    updated_at=now,
                )
                self.db.add(emb)

            await self.db.flush()
            return "generated"

        except Exception as e:
            logger.error(f"Failed to generate job embedding for job_id={job_id}: {e}")
            return f"error: {str(e)}"

    async def get_company_jobs(self, user_id: int) -> list[dict]:
        """Get all jobs for the authenticated company user."""
        company = await self._get_company_for_user(user_id)

        result = await self.db.execute(
            select(Job)
            .options(selectinload(Job.skills))
            .where(Job.company_id == company.company_id)
            .order_by(Job.created_at.desc())
        )
        jobs = result.scalars().all()

        out = []
        for job in jobs:
            # Fetch skill names via raw query (JobSkill only has skill_id)
            skill_result = await self.db.execute(
                text(
                    "SELECT s.skill_id, s.name, js.is_mandatory, js.min_experience_years "
                    "FROM job_skills js JOIN skills s ON js.skill_id = s.skill_id "
                    "WHERE js.job_id = :job_id"
                ),
                {"job_id": job.job_id},
            )
            skill_rows = skill_result.fetchall()

            out.append({
                "job_id": job.job_id,
                "company_id": job.company_id,
                "title": job.title,
                "slug": job.slug,
                "description": job.description,
                "responsibilities": job.responsibilities,
                "requirements": job.requirements,
                "nice_to_have": job.nice_to_have,
                "department": job.department,
                "employment_type": job.employment_type,
                "remote_type": job.remote_type,
                "location": job.location,
                "experience_min_years": job.experience_min_years,
                "experience_max_years": job.experience_max_years,
                "salary_min": job.salary_min,
                "salary_max": job.salary_max,
                "salary_currency": job.salary_currency,
                "salary_is_visible": job.salary_is_visible,
                "benefits": job.benefits or [],
                "status": job.status,
                "posted_at": job.posted_at.isoformat() if job.posted_at else None,
                "deadline": job.deadline.isoformat() if job.deadline else None,
                "views_count": job.views_count,
                "applications_count": job.applications_count,
                "skills": [
                    {
                        "skill_id": r[0],
                        "name": r[1],
                        "is_mandatory": r[2],
                        "min_experience_years": r[3],
                    }
                    for r in skill_rows
                ],
                "created_at": job.created_at.isoformat() if job.created_at else None,
            })

        return out

    async def notify_matching_students(self, job_id: int, title: str, company_name: str):
        """Find students whose skills match this job and send them a Novu alert."""
        # Find students with > 0.6 vector similarity
        # We use a slightly higher threshold here to avoid spamming
        query = text("""
            SELECT s.user_id, s.first_name, u.email,
                   ROUND((1.0 - (je.embedding <=> se.embedding))::numeric, 4) AS match_score
            FROM job_embeddings je
            CROSS JOIN student_embeddings se
            JOIN students s ON s.student_id = se.student_id
            JOIN users u ON u.user_id = s.user_id
            WHERE je.job_id = :jid
              AND (1.0 - (je.embedding <=> se.embedding)) >= 0.6
            ORDER BY match_score DESC
            LIMIT 50
        """)
        
        result = await self.db.execute(query, {"jid": job_id})
        matches = result.mappings().all()
        
        if not matches:
            return

        from app.api.v1.endpoints.notifications import create_notification
        
        for m in matches:
            try:
                await create_notification(
                    self.db,
                    user_id=m["user_id"],
                    email=m["email"],
                    notification_type="job_match",
                    title="ðŸŽ¯ New Job Match!",
                    message=f"Hi {m['first_name'] or 'there'}, we found a new job at {company_name} that matches your skills: {title}",
                    action_url=f"/student/jobs/{job_id}",
                    action_text="View Match",
                    reference_type="job",
                    reference_id=job_id
                )
            except Exception as e:
                logger.warning(f"Failed to notify student {m['user_id']} for job match: {e}")
        
        await self.db.commit()
