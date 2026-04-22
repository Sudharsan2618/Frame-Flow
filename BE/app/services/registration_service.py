from sqlalchemy import select
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
