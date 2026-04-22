from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.user import User
from app.utils.time import utc_now

def _build_user_data(user: User) -> dict:
    """Build the standard user data dict from a User ORM object."""
    user_data = {
        "user_id": user.user_id,
        "email": user.email,
        "user_type": user.user_type,
        "status": user.status,
        "onboarding_completed": user.onboarding_completed,
        "student_id": None,
        "first_name": None,
        "last_name": None,
        "headline": None,
        "profile_picture_url": None,
        "company_id": None,
        "company_name": None,
        "logo_url": None,
    }

    if user.student:
        user_data["student_id"] = user.student.student_id
        user_data["first_name"] = user.student.first_name
        user_data["last_name"] = user.student.last_name
        user_data["headline"] = user.student.headline
        user_data["profile_picture_url"] = user.student.profile_picture_url

    if user.company:
        user_data["company_id"] = user.company.company_id
        user_data["company_name"] = user.company.company_name
        user_data["logo_url"] = user.company.logo_url

    return user_data

class ProfileService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user_by_id(self, user_id: int) -> Optional[dict]:
        """Get user data by user_id (for token validation)."""
        result = await self.db.execute(
            select(User)
            .options(selectinload(User.student), selectinload(User.company))
            .where(User.user_id == user_id)
        )
        user = result.scalar_one_or_none()
        if not user:
            return None
        return _build_user_data(user)

    async def update_student_onboarding(self, user_id: int, data: dict) -> dict:
        result = await self.db.execute(
            select(User)
            .options(selectinload(User.student), selectinload(User.company))
            .where(User.user_id == user_id)
        )
        user = result.scalar_one_or_none()
        if not user or not user.student:
            raise ValueError("Student not found")

        student = user.student

        if data.get("phone"):
            user.phone = data["phone"]

        student_fields = [
            "headline", "bio", "location", "education", "experience_years",
            "availability_status", "preferred_job_types", "preferred_locations",
            "preferred_remote_types", "salary_expectation_min", "salary_expectation_max",
            "salary_currency", "notice_period_days",
            "linkedin_url", "github_url", "portfolio_url", "personal_website",
        ]
        for field in student_fields:
            if field in data and data[field] is not None:
                setattr(student, field, data[field])

        user.onboarding_completed = True
        user.updated_at = utc_now()
        student.updated_at = utc_now()
        await self.db.flush()
        await self.db.refresh(user, ["student", "company"])
        return _build_user_data(user)

    async def update_company_onboarding(self, user_id: int, data: dict) -> dict:
        result = await self.db.execute(
            select(User)
            .options(selectinload(User.student), selectinload(User.company))
            .where(User.user_id == user_id)
        )
        user = result.scalar_one_or_none()
        if not user or not user.company:
            raise ValueError("Company not found")

        company = user.company
        company_fields = [
            "description", "industry", "company_size", "founded_year",
            "headquarters_location", "website_url", "contact_email", "contact_phone",
            "linkedin_url", "twitter_url", "billing_email", "gst_number", "billing_address",
        ]
        for field in company_fields:
            if field in data and data[field] is not None:
                setattr(company, field, data[field])

        user.onboarding_completed = True
        user.updated_at = utc_now()
        company.updated_at = utc_now()
        await self.db.flush()
        await self.db.refresh(user, ["student", "company"])
        return _build_user_data(user)

    async def get_student_profile(self, user_id: int) -> dict:
        result = await self.db.execute(
            select(User)
            .options(selectinload(User.student), selectinload(User.company))
            .where(User.user_id == user_id)
        )
        user = result.scalar_one_or_none()
        if not user or not user.student:
            raise ValueError("Student not found")

        s = user.student
        return {
            "user_id": user.user_id,
            "email": user.email,
            "phone": user.phone,
            "student_id": s.student_id,
            "first_name": s.first_name,
            "last_name": s.last_name,
            "bio": s.bio,
            "headline": s.headline,
            "location": s.location,
            "education": s.education,
            "experience_years": s.experience_years,
            "profile_picture_url": s.profile_picture_url,
            "resume_url": s.resume_url,
            "cover_letter_url": s.cover_letter_url,
            "availability_status": s.availability_status,
            "preferred_job_types": s.preferred_job_types or [],
            "preferred_locations": s.preferred_locations or [],
            "preferred_remote_types": s.preferred_remote_types or [],
            "salary_expectation_min": float(s.salary_expectation_min) if s.salary_expectation_min else None,
            "salary_expectation_max": float(s.salary_expectation_max) if s.salary_expectation_max else None,
            "salary_currency": s.salary_currency,
            "notice_period_days": s.notice_period_days,
            "linkedin_url": s.linkedin_url,
            "github_url": s.github_url,
            "portfolio_url": s.portfolio_url,
            "personal_website": s.personal_website,
            "total_courses_enrolled": s.total_courses_enrolled,
            "total_courses_completed": s.total_courses_completed,
            "total_learning_hours": float(s.total_learning_hours or 0),
            "average_quiz_score": float(s.average_quiz_score or 0),
            "streak_days": s.streak_days or 0,
        }

    async def update_student_profile(self, user_id: int, data: dict) -> dict:
        result = await self.db.execute(
            select(User)
            .options(selectinload(User.student), selectinload(User.company))
            .where(User.user_id == user_id)
        )
        user = result.scalar_one_or_none()
        if not user or not user.student:
            raise ValueError("Student not found")

        student = user.student

        if "phone" in data and data["phone"] is not None:
            user.phone = data["phone"]

        student_fields = [
            "first_name", "last_name", "headline", "bio", "location", "education",
            "experience_years", "availability_status",
            "preferred_job_types", "preferred_locations", "preferred_remote_types",
            "salary_expectation_min", "salary_expectation_max", "salary_currency",
            "notice_period_days",
            "linkedin_url", "github_url", "portfolio_url", "personal_website",
        ]
        for field in student_fields:
            if field in data and data[field] is not None:
                setattr(student, field, data[field])

        user.updated_at = utc_now()
        student.updated_at = utc_now()
        await self.db.flush()

        return await self.get_student_profile(user_id)

    async def get_company_profile(self, user_id: int) -> dict:
        result = await self.db.execute(
            select(User)
            .options(selectinload(User.student), selectinload(User.company))
            .where(User.user_id == user_id)
        )
        user = result.scalar_one_or_none()
        if not user or not user.company:
            raise ValueError("Company not found")

        c = user.company
        return {
            "user_id": user.user_id,
            "email": user.email,
            "phone": user.phone,
            "company_id": c.company_id,
            "company_name": c.company_name,
            "description": c.description,
            "industry": c.industry,
            "company_size": c.company_size,
            "founded_year": c.founded_year,
            "headquarters_location": c.headquarters_location,
            "logo_url": c.logo_url,
            "banner_url": c.banner_url,
            "website_url": c.website_url,
            "contact_email": c.contact_email,
            "contact_phone": c.contact_phone,
            "linkedin_url": c.linkedin_url,
            "twitter_url": c.twitter_url,
            "is_verified": c.is_verified,
            "billing_email": c.billing_email,
            "gst_number": c.gst_number,
            "billing_address": c.billing_address,
            "total_jobs_posted": c.total_jobs_posted,
            "total_hires": c.total_hires,
        }

    async def update_company_profile(self, user_id: int, data: dict) -> dict:
        result = await self.db.execute(
            select(User)
            .options(selectinload(User.student), selectinload(User.company))
            .where(User.user_id == user_id)
        )
        user = result.scalar_one_or_none()
        if not user or not user.company:
            raise ValueError("Company not found")

        company = user.company

        if "phone" in data and data["phone"] is not None:
            user.phone = data["phone"]

        company_fields = [
            "company_name", "description", "industry", "company_size",
            "founded_year", "headquarters_location",
            "website_url", "contact_email", "contact_phone",
            "linkedin_url", "twitter_url",
            "billing_email", "gst_number", "billing_address",
        ]
        for field in company_fields:
            if field in data and data[field] is not None:
                setattr(company, field, data[field])

        user.updated_at = utc_now()
        company.updated_at = utc_now()
        await self.db.flush()

        return await self.get_company_profile(user_id)
