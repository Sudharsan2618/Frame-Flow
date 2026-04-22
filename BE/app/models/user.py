"""
SQLAlchemy models for user-related tables.
Maps to DB/001_postgresql_schema.sql SECTION 2.
"""

from app.utils.time import utc_now
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    Boolean, DateTime, Enum, Integer, Numeric, String, Text, ForeignKey,
    ARRAY,
)
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.db.postgres import Base


class User(Base):
    __tablename__ = "users"

    user_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    user_type: Mapped[str] = mapped_column(
        Enum("student", "company", "admin", "instructor", "mentor",
             name="user_type", create_type=False),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        Enum("active", "inactive", "suspended", "pending_verification",
             name="user_status", create_type=False),
        default="pending_verification",
    )
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    phone: Mapped[Optional[str]] = mapped_column(String(20))
    phone_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime)

    # Relationships
    student: Mapped[Optional["Student"]] = relationship(back_populates="user", uselist=False)
    company: Mapped[Optional["Company"]] = relationship(back_populates="user", uselist=False)


class Student(Base):
    __tablename__ = "students"

    student_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.user_id", ondelete="CASCADE"), unique=True, nullable=False
    )
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    bio: Mapped[Optional[str]] = mapped_column(Text)
    headline: Mapped[Optional[str]] = mapped_column(String(255))
    location: Mapped[Optional[str]] = mapped_column(String(255))
    education: Mapped[Optional[str]] = mapped_column(Text)
    experience_years: Mapped[int] = mapped_column(Integer, default=0)
    profile_picture_url: Mapped[Optional[str]] = mapped_column(String(500))
    resume_url: Mapped[Optional[str]] = mapped_column(String(500))
    cover_letter_url: Mapped[Optional[str]] = mapped_column(String(500))
    availability_status: Mapped[bool] = mapped_column(Boolean, default=True)
    preferred_job_types: Mapped[Optional[list]] = mapped_column(
        ARRAY(Enum('full_time', 'part_time', 'contract', 'internship', 'freelance',
                   name='employment_type', create_type=False)),
        default=[],
    )
    preferred_locations: Mapped[Optional[list]] = mapped_column(ARRAY(String(255)), default=[])
    preferred_remote_types: Mapped[Optional[list]] = mapped_column(
        ARRAY(Enum('remote', 'on_site', 'hybrid',
                   name='remote_type', create_type=False)),
        default=[],
    )
    salary_expectation_min: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2))
    salary_expectation_max: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2))
    salary_currency: Mapped[str] = mapped_column(String(3), default="INR")
    notice_period_days: Mapped[Optional[int]] = mapped_column(Integer)
    linkedin_url: Mapped[Optional[str]] = mapped_column(String(500))
    github_url: Mapped[Optional[str]] = mapped_column(String(500))
    portfolio_url: Mapped[Optional[str]] = mapped_column(String(500))
    personal_website: Mapped[Optional[str]] = mapped_column(String(500))
    total_courses_enrolled: Mapped[int] = mapped_column(Integer, default=0)
    total_courses_completed: Mapped[int] = mapped_column(Integer, default=0)
    total_learning_hours: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    average_quiz_score: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=0)
    streak_days: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="student")


class Company(Base):
    __tablename__ = "companies"

    company_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.user_id", ondelete="CASCADE"), unique=True, nullable=False
    )
    company_name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    industry: Mapped[Optional[str]] = mapped_column(String(100))
    company_size: Mapped[Optional[str]] = mapped_column(String(50))
    founded_year: Mapped[Optional[int]] = mapped_column(Integer)
    headquarters_location: Mapped[Optional[str]] = mapped_column(String(255))
    logo_url: Mapped[Optional[str]] = mapped_column(String(500))
    banner_url: Mapped[Optional[str]] = mapped_column(String(500))
    website_url: Mapped[Optional[str]] = mapped_column(String(500))
    contact_email: Mapped[Optional[str]] = mapped_column(String(255))
    contact_phone: Mapped[Optional[str]] = mapped_column(String(20))
    linkedin_url: Mapped[Optional[str]] = mapped_column(String(500))
    twitter_url: Mapped[Optional[str]] = mapped_column(String(500))
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    verification_documents_url: Mapped[Optional[str]] = mapped_column(String(500))
    billing_email: Mapped[Optional[str]] = mapped_column(String(255))
    gst_number: Mapped[Optional[str]] = mapped_column(String(50))
    billing_address: Mapped[Optional[str]] = mapped_column(Text)
    total_jobs_posted: Mapped[int] = mapped_column(Integer, default=0)
    total_hires: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="company")
