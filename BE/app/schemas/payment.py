"""Pydantic schemas for Razorpay payment API request/response models."""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict


# ── Requests ──

class CreateOrderRequest(BaseModel):
    """Student requests to pay for a course."""
    course_id: int


class VerifyPaymentRequest(BaseModel):
    """Frontend sends Razorpay callback data for server-side verification."""
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str


# ── Responses ──

class OrderResponse(BaseModel):
    """Returned to frontend to open Razorpay Checkout popup."""
    order_id: str            # Razorpay order ID (order_xxxx)
    amount: int              # Amount in paise (₹499 = 49900)
    currency: str            # "INR"
    key_id: str              # Razorpay key_id (public, safe for frontend)
    payment_id: int          # Our internal payment row ID
    course_title: str        # For display in popup
    course_id: int


class VerifyPaymentResponse(BaseModel):
    """Returned after successful payment verification."""
    success: bool
    message: str
    payment_id: int
    enrollment_id: int
    course_slug: str


class PaymentOut(BaseModel):
    """Single payment record for history."""
    model_config = ConfigDict(from_attributes=True)

    payment_id: int
    payment_type: str
    amount: Decimal
    currency: str
    tax_amount: Decimal
    tax_percentage: Decimal
    total_amount: Decimal
    status: str
    gateway_name: Optional[str] = None
    gateway_payment_id: Optional[str] = None
    gateway_order_id: Optional[str] = None
    invoice_number: Optional[str] = None
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    # Joined info (filled by service)
    reference_title: Optional[str] = None


class PaymentHistoryResponse(BaseModel):
    """List of payment records."""
    payments: list[PaymentOut]
    total: int
