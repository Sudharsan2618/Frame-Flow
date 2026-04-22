"""
SQLAlchemy models for job-related tables.
Maps to DB/001_postgresql_schema.sql — jobs, job_skills.
"""

from app.utils.time import utc_now
from datetime import datetime
from decimal import Decimal
from typing import Optional, List

from sqlalchemy import (
    Boolean, DateTime, Enum, Integer, Numeric, String, Text, ForeignKey,
    ARRAY,
)
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.db.postgres import Base


class Job(Base):
    __tablename__ = "jobs"

    job_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("companies.company_id", ondelete="CASCADE"), nullable=False
    )

    # Basic Info
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    responsibilities: Mapped[Optional[str]] = mapped_column(Text)
    requirements: Mapped[Optional[str]] = mapped_column(Text)
    nice_to_have: Mapped[Optional[str]] = mapped_column(Text)

    # Categorization
    category_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("categories.category_id")
    )
    department: Mapped[Optional[str]] = mapped_column(String(100))

    # Employment Details
    employment_type: Mapped[str] = mapped_column(
        Enum('full_time', 'part_time', 'contract', 'internship', 'freelance',
             name='employment_type', create_type=False),
        nullable=False,
    )
    remote_type: Mapped[str] = mapped_column(
        Enum('remote', 'on_site', 'hybrid',
             name='remote_type', create_type=False),
        default='on_site',
    )
    location: Mapped[Optional[str]] = mapped_column(String(255))
    experience_min_years: Mapped[int] = mapped_column(Integer, default=0)
    experience_max_years: Mapped[Optional[int]] = mapped_column(Integer)

    # Salary
    salary_min: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2))
    salary_max: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2))
    salary_currency: Mapped[str] = mapped_column(String(3), default='INR')
    salary_is_visible: Mapped[bool] = mapped_column(Boolean, default=False)

    # Benefits
    benefits: Mapped[Optional[list]] = mapped_column(ARRAY(Text), default=[])

    # Status & Dates
    status: Mapped[str] = mapped_column(
        Enum('draft', 'active', 'paused', 'closed', 'filled',
             name='job_status', create_type=False),
        default='draft',
    )
    posted_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    deadline: Mapped[Optional[datetime]] = mapped_column(DateTime)
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)

    # Counts
    views_count: Mapped[int] = mapped_column(Integer, default=0)
    applications_count: Mapped[int] = mapped_column(Integer, default=0)

    # Admin Pricing
    price_per_candidate: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)

    # Relationships
    skills: Mapped[List["JobSkill"]] = relationship(back_populates="job", cascade="all, delete-orphan")


class JobSkill(Base):
    __tablename__ = "job_skills"

    job_skill_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    job_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("jobs.job_id", ondelete="CASCADE"), nullable=False
    )
    skill_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("skills.skill_id", ondelete="CASCADE"), nullable=False
    )
    is_mandatory: Mapped[bool] = mapped_column(Boolean, default=True)
    min_experience_years: Mapped[Optional[int]] = mapped_column(Integer)

    # Relationships
    job: Mapped["Job"] = relationship(back_populates="skills")
