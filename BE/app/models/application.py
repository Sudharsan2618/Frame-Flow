"""
SQLAlchemy model for the applications table.
Maps to DB/001_postgresql_schema.sql — applications.
"""

from app.utils.time import utc_now
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    DateTime, Enum, Integer, Numeric, String, Text, ForeignKey,
)
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.db.postgres import Base


class Application(Base):
    __tablename__ = "applications"

    application_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    student_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("students.student_id", ondelete="CASCADE"), nullable=False
    )
    job_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("jobs.job_id", ondelete="CASCADE"), nullable=False
    )

    # Status
    status: Mapped[str] = mapped_column(
        Enum(
            'pending_admin_review', 'admin_shortlisted', 'rejected_by_admin',
            'forwarded_to_company', 'under_company_review',
            'interview_scheduled', 'interview_completed',
            'offer_extended', 'offer_accepted', 'offer_rejected',
            'hired', 'rejected_by_company', 'withdrawn',
            name='application_status', create_type=False,
        ),
        default='pending_admin_review',
    )

    # Student's Application
    cover_letter: Mapped[Optional[str]] = mapped_column(Text)
    resume_url: Mapped[Optional[str]] = mapped_column(String(500))
    expected_salary: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2))
    notice_period_days: Mapped[Optional[int]] = mapped_column(Integer)

    # Admin Review
    admin_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("admins.admin_id")
    )
    admin_notes: Mapped[Optional[str]] = mapped_column(Text)
    admin_reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    admin_match_score: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2))
    forwarded_at: Mapped[Optional[datetime]] = mapped_column(DateTime)

    # Company Review
    company_notes: Mapped[Optional[str]] = mapped_column(Text)
    company_reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    company_stage: Mapped[Optional[str]] = mapped_column(
        Enum(
            'new_candidates', 'under_review', 'interviewing',
            'offer_extended', 'hired', 'rejected',
            name='candidate_stage', create_type=False,
        ),
    )

    # Interview
    interview_scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    interview_completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    interview_feedback: Mapped[Optional[str]] = mapped_column(Text)
    interview_rating: Mapped[Optional[int]] = mapped_column(Integer)

    # Offer
    offer_extended_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    offer_salary: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2))
    offer_details: Mapped[Optional[str]] = mapped_column(Text)
    offer_response_at: Mapped[Optional[datetime]] = mapped_column(DateTime)

    # Final Outcome
    hired_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    rejected_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text)
    withdrawn_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    withdrawal_reason: Mapped[Optional[str]] = mapped_column(Text)

    # Dates
    applied_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utc_now, onupdate=utc_now
    )

    # Relationships
    job: Mapped["Job"] = relationship("Job", lazy="joined")
