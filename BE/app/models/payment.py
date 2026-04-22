"""
SQLAlchemy model for the payments table.
Maps exactly to DB/001_postgresql_schema.sql SECTION (payments).
"""

from app.utils.time import utc_now
import enum
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    Boolean, DateTime, Enum, ForeignKey, Integer,
    Numeric, String, Text, JSON,
)
from sqlalchemy.orm import Mapped, mapped_column
from app.db.postgres import Base


class PaymentStatus(str, enum.Enum):
    pending = "pending"
    completed = "completed"
    failed = "failed"
    refunded = "refunded"
    cancelled = "cancelled"


class PaymentType(str, enum.Enum):
    course_purchase = "course_purchase"
    webinar_purchase = "webinar_purchase"
    material_purchase = "material_purchase"
    mentor_session = "mentor_session"
    referral_package = "referral_package"
    placement_package = "placement_package"
    subscription = "subscription"
    company_candidate_fee = "company_candidate_fee"


class Payment(Base):
    __tablename__ = "payments"

    payment_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.user_id"), nullable=False
    )

    # Payment Details
    payment_type: Mapped[PaymentType] = mapped_column(
        Enum(PaymentType, name="payment_type", create_type=False),
        nullable=False,
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR")

    # Tax
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    tax_percentage: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=18.00)

    # Total
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    # Status
    status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus, name="payment_status", create_type=False),
        default=PaymentStatus.pending,
    )

    # Gateway Details
    gateway_name: Mapped[Optional[str]] = mapped_column(String(50))
    gateway_payment_id: Mapped[Optional[str]] = mapped_column(String(255))
    gateway_order_id: Mapped[Optional[str]] = mapped_column(String(255))
    gateway_signature: Mapped[Optional[str]] = mapped_column(String(255))
    gateway_response: Mapped[Optional[dict]] = mapped_column(JSON)

    # Invoice
    invoice_number: Mapped[Optional[str]] = mapped_column(String(50), unique=True)
    invoice_url: Mapped[Optional[str]] = mapped_column(String(500))

    # Reference (what was purchased)
    reference_type: Mapped[Optional[str]] = mapped_column(String(50))
    reference_id: Mapped[Optional[int]] = mapped_column(Integer)

    # Billing Info Snapshot
    billing_name: Mapped[Optional[str]] = mapped_column(String(255))
    billing_email: Mapped[Optional[str]] = mapped_column(String(255))
    billing_address: Mapped[Optional[str]] = mapped_column(Text)
    billing_gst: Mapped[Optional[str]] = mapped_column(String(50))

    # Dates
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    refunded_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    refund_reason: Mapped[Optional[str]] = mapped_column(Text)
