import os

BE_DIR = r"c:\Users\WELCOME\Desktop\Recruit\BE"

def read_file(path):
    with open(os.path.join(BE_DIR, path), "r", encoding="utf-8") as f:
        return f.read()

def write_file(path, content):
    with open(os.path.join(BE_DIR, path), "w", encoding="utf-8") as f:
        f.write(content)

# Define Dashboard Service (Fixes N+1 and MongoDB import)
DASHBOARD_SERVICE = """from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.user import User
from app.utils.time import utc_now
import logging

logger = logging.getLogger(__name__)

def _format_activity(act: dict) -> str:
    \"\"\"Format a MongoDB learning activity into a human-readable description.\"\"\"
    atype = act.get("activity_type", "")
    mapping = {
        "course_started": "Started exploring",
        "lesson_completed": "Completed a lesson in",
        "quiz_passed": "Aced a quiz in",
        "course_completed": "Graduated from",
    }
    action = mapping.get(atype, "Engaged with")
    course_name = act.get("course_title", "a course")
    return f"{action} {course_name}"

class DashboardService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_student_dashboard(self, user_id: int) -> dict:
        \"\"\"Get aggregated dashboard data for a student from real DB with optimized N+1 queries.\"\"\"
        result = await self.db.execute(
            select(User).options(selectinload(User.student)).where(User.user_id == user_id)
        )
        user = result.scalar_one_or_none()
        if not user or not user.student:
            raise ValueError("Student not found")

        student = user.student

        # N+1 Fix: Batched SQL query
        query = text(\"\"\"
            SELECT
                e.course_id, c.title, c.slug, c.thumbnail_url,
                COUNT(CASE WHEN lp.is_completed THEN 1 END) AS completed_lessons,
                COUNT(l.lesson_id) AS total_lessons,
                e.last_accessed_at, e.status as enrollment_status
            FROM enrollments e
            JOIN courses c ON c.course_id = e.course_id
            LEFT JOIN modules m ON m.course_id = c.course_id
            LEFT JOIN lessons l ON l.module_id = m.module_id
            LEFT JOIN lesson_progress lp ON lp.lesson_id = l.lesson_id AND lp.student_id = :sid
            WHERE e.student_id = :sid
            GROUP BY e.course_id, c.title, c.slug, c.thumbnail_url, e.last_accessed_at, e.status
            ORDER BY e.last_accessed_at DESC NULLS LAST
        \"\"\")
        
        rows = await self.db.execute(query, {"sid": student.student_id})
        enrollments_data = rows.mappings().all()

        enrolled_courses = []
        completed_count = 0
        for row in enrollments_data:
            if row["enrollment_status"] == "completed":
                completed_count += 1
                
            enrolled_courses.append({
                "course_id": row["course_id"],
                "title": row["title"],
                "slug": row["slug"],
                "thumbnail_url": row["thumbnail_url"],
                "progress_percentage": round(row["completed_lessons"] / row["total_lessons"] * 100, 1) if row["total_lessons"] > 0 else 0,
                "total_lessons": row["total_lessons"],
                "completed_lessons": row["completed_lessons"],
                "last_accessed_at": row["last_accessed_at"].isoformat() if row["last_accessed_at"] else None,
            })

        # Get recent activity from MongoDB
        recent_activity = []
        try:
            from app.db.mongodb import get_mongodb
            mongo_db = get_mongodb()
            activities = await mongo_db.learning_activities.find(
                {"student_id": student.student_id}
            ).sort("timestamp", -1).limit(10).to_list(10)

            for act in activities:
                recent_activity.append({
                    "activity_type": act.get("activity_type", ""),
                    "description": _format_activity(act),
                    "course_name": act.get("course_title", ""),
                    "timestamp": act.get("timestamp", utc_now()).isoformat() if act.get("timestamp") else "",
                })
        except Exception:
            pass  # MongoDB may not have data yet

        # Get learning hours by month from MongoDB
        learning_hours_by_month = []
        try:
            from app.db.mongodb import get_mongodb
            mongo_db = get_mongodb()
            pipeline = [
                {"$match": {"student_id": student.student_id}},
                {"$group": {
                    "_id": {"$dateToString": {"format": "%Y-%m", "date": "$timestamp"}},
                    "total_seconds": {"$sum": "$details.time_spent_seconds"}
                }},
                {"$sort": {"_id": 1}},
                {"$limit": 6},
            ]
            results = await mongo_db.learning_activities.aggregate(pipeline).to_list(6)
            for r in results:
                month_str = r["_id"] if r["_id"] else ""
                hours = round((r.get("total_seconds") or 0) / 3600, 1)
                learning_hours_by_month.append({"month": month_str, "hours": hours})
        except Exception:
            pass

        return {
            "first_name": student.first_name,
            "last_name": student.last_name,
            "stats": {
                "enrolled_courses": len(enrollments_data),
                "completed_courses": completed_count,
                "total_learning_hours": float(student.total_learning_hours or 0),
                "average_quiz_score": float(student.average_quiz_score or 0),
                "streak_days": student.streak_days or 0,
            },
            "enrolled_courses": enrolled_courses,
            "recent_activity": recent_activity,
            "learning_hours_by_month": learning_hours_by_month,
        }
"""

PROFILE_SERVICE = """from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.user import User
from app.utils.time import utc_now

def _build_user_data(user: User) -> dict:
    \"\"\"Build the standard user data dict from a User ORM object.\"\"\"
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
        \"\"\"Get user data by user_id (for token validation).\"\"\"
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
"""

REGISTRATION_SERVICE = """from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User, Student, Company
from app.services.auth_service import hash_password
from app.services.profile_service import _build_user_data
import logging

logger = logging.getLogger(__name__)

class RegistrationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def register_student(self, email: str, password: str, first_name: str, last_name: str) -> dict:
        existing = await self.db.execute(select(User).where(User.email == email))
        if existing.scalar_one_or_none():
            raise ValueError("Email already registered")

        user = User(
            email=email,
            password_hash=hash_password(password),
            user_type="student",
            status="active",
            email_verified=False,
            onboarding_completed=False,
        )
        self.db.add(user)
        await self.db.flush()

        student = Student(
            user_id=user.user_id,
            first_name=first_name,
            last_name=last_name,
        )
        self.db.add(student)
        await self.db.flush()

        try:
            from app.services.notification_service import create_notification
            await create_notification(
                user_id=user.user_id,
                email=email,
                notification_type="welcome",
                title="Welcome to SkillBridge! 🎉",
                body=f"Hi {first_name}, thank you for joining our platform. We're excited to help you grow your career!",
                workflow_id="onboarding-demo-workflow"
            )
        except Exception as e:
            logger.warning(f"Registration notification failed: {e}")

        await self.db.refresh(user, ["student", "company"])
        return _build_user_data(user)

    async def register_company(self, email: str, password: str, company_name: str) -> dict:
        existing = await self.db.execute(select(User).where(User.email == email))
        if existing.scalar_one_or_none():
            raise ValueError("Email already registered")

        existing_company = await self.db.execute(
            select(Company).where(Company.company_name == company_name)
        )
        if existing_company.scalar_one_or_none():
            raise ValueError("Company name already taken")

        user = User(
            email=email,
            password_hash=hash_password(password),
            user_type="company",
            status="active",
            email_verified=False,
            onboarding_completed=False,
        )
        self.db.add(user)
        await self.db.flush()

        company = Company(
            user_id=user.user_id,
            company_name=company_name,
        )
        self.db.add(company)
        await self.db.flush()

        try:
            from app.services.notification_service import create_notification
            await create_notification(
                user_id=user.user_id,
                email=email,
                notification_type="welcome",
                title="Welcome to SkillBridge for Business! 🏢",
                body=f"Hi {company_name}, thank you for joining. Start posting jobs and finding top talent today!",
                workflow_id="onboarding-demo-workflow"
            )
        except Exception as e:
            logger.warning(f"Registration notification failed: {e}")

        await self.db.refresh(user, ["student", "company"])
        return _build_user_data(user)
"""

AUTH_SERVICE = """\"\"\"Authentication service — JWT token creation and password verification.\"\"\"

from app.utils.time import utc_now
from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.models.user import User

import logging
logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _truncate_password(password: str) -> str:
    \"\"\"
    Bcrypt has a hard limit of 72 bytes.
    Truncate to 72 bytes to avoid ValueError in bcrypt/passlib.
    \"\"\"
    pw_bytes = password.encode("utf-8")
    if len(pw_bytes) > 72:
        return pw_bytes[:72].decode("utf-8", "ignore")
    return password


def verify_password(plain_password: str, hashed_password: str) -> bool:
    \"\"\"
    Verify a plain password against bcrypt hash.
    Bcrypt has a hard limit of 72 bytes. Passwords longer than this
    must be truncated to avoid ValueError in passlib/bcrypt.
    \"\"\"
    return pwd_context.verify(_truncate_password(plain_password), hashed_password)


def hash_password(password: str) -> str:
    \"\"\"Hash a password using bcrypt (truncates to 72 bytes first).\"\"\"
    return pwd_context.hash(_truncate_password(password))


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    \"\"\"Create a JWT access token.\"\"\"
    to_encode = data.copy()
    expire = utc_now() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    \"\"\"Decode and validate a JWT access token.\"\"\"
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("token_type") == "refresh":
            return None  # Reject refresh tokens used as access tokens
        return payload
    except JWTError:
        return None


def create_refresh_token(data: dict, user_type: str) -> str:
    \"\"\"Create a JWT refresh token with role-based lifetime.

    - admin: REFRESH_TOKEN_EXPIRE_HOURS_ADMIN (default 3h)
    - student/company: REFRESH_TOKEN_EXPIRE_HOURS_USER (default 24h)
    \"\"\"
    to_encode = data.copy()
    if user_type == "admin":
        hours = settings.REFRESH_TOKEN_EXPIRE_HOURS_ADMIN
    else:
        hours = settings.REFRESH_TOKEN_EXPIRE_HOURS_USER
    expire = utc_now() + timedelta(hours=hours)
    to_encode.update({"exp": expire, "token_type": "refresh"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_refresh_token(token: str) -> Optional[dict]:
    \"\"\"Decode and validate a JWT refresh token.\"\"\"
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("token_type") != "refresh":
            return None  # Only accept refresh tokens
        return payload
    except JWTError:
        return None

class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def authenticate_user(self, email: str, password: str) -> Optional[dict]:
        \"\"\"Authenticate user by email and password. Returns user data or None.\"\"\"
        from app.services.profile_service import _build_user_data
        result = await self.db.execute(
            select(User)
            .options(selectinload(User.student), selectinload(User.company))
            .where(User.email == email)
        )
        user = result.scalar_one_or_none()

        if not user:
            return None

        if not verify_password(password, user.password_hash):
            return None

        if user.status != "active":
            return None

        # Update last login
        user.last_login_at = utc_now()
        await self.db.flush()

        return _build_user_data(user)
"""

print("Writing DashboardService...")
write_file("app/services/dashboard_service.py", DASHBOARD_SERVICE)

print("Writing ProfileService...")
write_file("app/services/profile_service.py", PROFILE_SERVICE)

print("Writing RegistrationService...")
write_file("app/services/registration_service.py", REGISTRATION_SERVICE)

print("Trimming AuthService...")
write_file("app/services/auth_service.py", AUTH_SERVICE)

print("Updating auth.py router...")
auth_router_content = read_file("app/api/v1/endpoints/auth.py")

# Replace get_service with multiple service getters
service_getters = """from app.services.registration_service import RegistrationService
from app.services.profile_service import ProfileService
from app.services.dashboard_service import DashboardService

def get_auth_service(db: AsyncSession = Depends(get_db)) -> AuthService:
    return AuthService(db)

def get_reg_service(db: AsyncSession = Depends(get_db)) -> RegistrationService:
    return RegistrationService(db)

def get_profile_service(db: AsyncSession = Depends(get_db)) -> ProfileService:
    return ProfileService(db)

def get_dashboard_service(db: AsyncSession = Depends(get_db)) -> DashboardService:
    return DashboardService(db)
"""

import re
auth_router_content = re.sub(
    r"def get_service\(db: AsyncSession = Depends\(get_db\)\) -> AuthService:[\s\S]*?return AuthService\(db\)",
    service_getters,
    auth_router_content
)

# Update endpoint definitions
endpoints = {
    "login(request: Request, body: LoginRequest, service: AuthService = Depends(get_service))": "login(request: Request, body: LoginRequest, service: AuthService = Depends(get_auth_service))",
    "register_student(request: Request, body: StudentRegisterRequest, service: AuthService = Depends(get_service))": "register_student(request: Request, body: StudentRegisterRequest, service: RegistrationService = Depends(get_reg_service))",
    "register_company(request: Request, body: CompanyRegisterRequest, service: AuthService = Depends(get_service))": "register_company(request: Request, body: CompanyRegisterRequest, service: RegistrationService = Depends(get_reg_service))",
    "complete_student_onboarding(body: StudentOnboardingRequest, user_id: int = Depends(get_current_user_id), service: AuthService = Depends(get_service))": "complete_student_onboarding(body: StudentOnboardingRequest, user_id: int = Depends(get_current_user_id), service: ProfileService = Depends(get_profile_service))",
    "complete_company_onboarding(body: CompanyOnboardingRequest, user_id: int = Depends(get_current_user_id), service: AuthService = Depends(get_service))": "complete_company_onboarding(body: CompanyOnboardingRequest, user_id: int = Depends(get_current_user_id), service: ProfileService = Depends(get_profile_service))",
    "get_student_dashboard(user_id: int = Depends(get_current_user_id), service: AuthService = Depends(get_service))": "get_student_dashboard(user_id: int = Depends(get_current_user_id), service: DashboardService = Depends(get_dashboard_service))",
    "get_student_profile(user_id: int = Depends(get_current_user_id), service: AuthService = Depends(get_service))": "get_student_profile(user_id: int = Depends(get_current_user_id), service: ProfileService = Depends(get_profile_service))",
    "update_student_profile(body: StudentProfileUpdateRequest, user_id: int = Depends(get_current_user_id), service: AuthService = Depends(get_service))": "update_student_profile(body: StudentProfileUpdateRequest, user_id: int = Depends(get_current_user_id), service: ProfileService = Depends(get_profile_service))",
    "get_company_profile(user_id: int = Depends(get_current_user_id), service: AuthService = Depends(get_service))": "get_company_profile(user_id: int = Depends(get_current_user_id), service: ProfileService = Depends(get_profile_service))",
    "update_company_profile(body: CompanyProfileUpdateRequest, user_id: int = Depends(get_current_user_id), service: AuthService = Depends(get_service))": "update_company_profile(body: CompanyProfileUpdateRequest, user_id: int = Depends(get_current_user_id), service: ProfileService = Depends(get_profile_service))",
}

for old, new in endpoints.items():
    auth_router_content = auth_router_content.replace(old, new)
    
# Fix signature order (fastapi needs path/query/body first or Depends first? depends can be anywhere but usually default arg comes last)
# The replace above matches exactly, but due to python formatting we might have newlines. Let's make it more robust.

auth_router_content = re.sub(
    r"service:\s*AuthService\s*=\s*Depends\(get_service\)",
    "service: AuthService = Depends(get_auth_service)",
    auth_router_content
)

auth_router_content = auth_router_content.replace(
    "register_student(request: Request, body: StudentRegisterRequest, service: AuthService = Depends(get_auth_service))",
    "register_student(request: Request, body: StudentRegisterRequest, service: RegistrationService = Depends(get_reg_service))"
)
auth_router_content = auth_router_content.replace(
    "register_company(request: Request, body: CompanyRegisterRequest, service: AuthService = Depends(get_auth_service))",
    "register_company(request: Request, body: CompanyRegisterRequest, service: RegistrationService = Depends(get_reg_service))"
)

auth_router_content = auth_router_content.replace(
    "complete_student_onboarding(\n    body: StudentOnboardingRequest,\n    user_id: int = Depends(get_current_user_id),\n    service: AuthService = Depends(get_auth_service),\n)",
    "complete_student_onboarding(\n    body: StudentOnboardingRequest,\n    user_id: int = Depends(get_current_user_id),\n    service: ProfileService = Depends(get_profile_service),\n)"
)
auth_router_content = auth_router_content.replace(
    "complete_company_onboarding(\n    body: CompanyOnboardingRequest,\n    user_id: int = Depends(get_current_user_id),\n    service: AuthService = Depends(get_auth_service),\n)",
    "complete_company_onboarding(\n    body: CompanyOnboardingRequest,\n    user_id: int = Depends(get_current_user_id),\n    service: ProfileService = Depends(get_profile_service),\n)"
)

auth_router_content = auth_router_content.replace(
    "get_student_dashboard(\n    user_id: int = Depends(get_current_user_id),\n    service: AuthService = Depends(get_auth_service),\n)",
    "get_student_dashboard(\n    user_id: int = Depends(get_current_user_id),\n    service: DashboardService = Depends(get_dashboard_service),\n)"
)
auth_router_content = auth_router_content.replace(
    "get_student_profile(\n    user_id: int = Depends(get_current_user_id),\n    service: AuthService = Depends(get_auth_service),\n)",
    "get_student_profile(\n    user_id: int = Depends(get_current_user_id),\n    service: ProfileService = Depends(get_profile_service),\n)"
)
auth_router_content = auth_router_content.replace(
    "update_student_profile(\n    body: StudentProfileUpdateRequest,\n    user_id: int = Depends(get_current_user_id),\n    service: AuthService = Depends(get_auth_service),\n)",
    "update_student_profile(\n    body: StudentProfileUpdateRequest,\n    user_id: int = Depends(get_current_user_id),\n    service: ProfileService = Depends(get_profile_service),\n)"
)
auth_router_content = auth_router_content.replace(
    "get_company_profile(\n    user_id: int = Depends(get_current_user_id),\n    service: AuthService = Depends(get_auth_service),\n)",
    "get_company_profile(\n    user_id: int = Depends(get_current_user_id),\n    service: ProfileService = Depends(get_profile_service),\n)"
)
auth_router_content = auth_router_content.replace(
    "update_company_profile(\n    body: CompanyProfileUpdateRequest,\n    user_id: int = Depends(get_current_user_id),\n    service: AuthService = Depends(get_auth_service),\n)",
    "update_company_profile(\n    body: CompanyProfileUpdateRequest,\n    user_id: int = Depends(get_current_user_id),\n    service: ProfileService = Depends(get_profile_service),\n)"
)

write_file("app/api/v1/endpoints/auth.py", auth_router_content)
print("Done decomposing auth_service and updating endpoints.")
