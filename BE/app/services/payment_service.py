"""
Razorpay Payment Service â€” handles order creation, signature verification,
payment recording, and enrollment linking.

Uses Razorpay Python SDK in TEST MODE.
"""

from app.utils.time import utc_now
import hmac
import hashlib
import logging
import os
from datetime import datetime
from decimal import Decimal

import razorpay
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.payment import Payment, PaymentStatus, PaymentType
from app.models.course import Course, Enrollment, EnrollmentStatus
from app.models.user import Student

logger = logging.getLogger(__name__)

# â”€â”€ Razorpay client (test mode) â”€â”€
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")

razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))


class PaymentService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    # 1. CREATE ORDER
    # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    async def create_order(self, user_id: int, course_id: int) -> dict:
        """
        Create a Razorpay order + pending payment row in DB.
        Returns data needed by frontend to open Razorpay Checkout.
        """
        # 1. Get student record
        student = (await self.db.execute(
            select(Student).where(Student.user_id == user_id)
        )).scalar_one_or_none()
        if not student:
            raise ValueError("Student profile not found")

        # 2. Get course and validate it's paid
        course = (await self.db.execute(
            select(Course).where(Course.course_id == course_id)
        )).scalar_one_or_none()
        if not course:
            raise ValueError("Course not found")
        if not course.is_published:
            raise ValueError("Course is not available")

        # Check if already enrolled
        existing = (await self.db.execute(
            select(Enrollment).where(
                Enrollment.student_id == student.student_id,
                Enrollment.course_id == course_id,
            )
        )).scalar_one_or_none()
        if existing:
            raise ValueError("Already enrolled in this course")

        # 3. Calculate pricing
        price = float(course.discount_price or course.price or 0)
        if price <= 0:
            raise ValueError("This is a free course â€” enroll directly without payment")

        tax_pct = 18.0  # GST
        tax_amount = round(price * tax_pct / 100, 2)
        total_amount = round(price + tax_amount, 2)
        amount_paise = int(total_amount * 100)  # Razorpay uses paise

        # 4. Create Razorpay order
        try:
            rz_order = razorpay_client.order.create({
                "amount": amount_paise,
                "currency": course.currency or "INR",
                "receipt": f"course_{course_id}_user_{user_id}",
                "notes": {
                    "course_id": str(course_id),
                    "course_title": course.title,
                    "user_id": str(user_id),
                    "student_id": str(student.student_id),
                    "environment": "test",
                },
            })
        except Exception as e:
            logger.error(f"Razorpay order creation failed: {e}")
            raise ValueError(f"Payment gateway error: {str(e)}")

        # 5. Generate invoice number
        count_result = await self.db.execute(select(func.count(Payment.payment_id)))
        count = count_result.scalar() or 0
        invoice_number = f"INV-{utc_now().strftime('%Y%m')}-{count + 1:04d}"

        # 6. Create pending payment row
        payment = Payment(
            user_id=user_id,
            payment_type=PaymentType.course_purchase,
            amount=Decimal(str(price)),
            currency=course.currency or "INR",
            tax_amount=Decimal(str(tax_amount)),
            tax_percentage=Decimal(str(tax_pct)),
            total_amount=Decimal(str(total_amount)),
            status=PaymentStatus.pending,
            gateway_name="razorpay",
            gateway_order_id=rz_order["id"],
            invoice_number=invoice_number,
            reference_type="course",
            reference_id=course_id,
            billing_name=f"{student.first_name} {student.last_name}",
            billing_email=None,  # Will be set on verify
        )
        self.db.add(payment)
        await self.db.commit()
        await self.db.refresh(payment)

        logger.info(
            f"Payment order created: payment_id={payment.payment_id}, "
            f"razorpay_order={rz_order['id']}, amount={total_amount}"
        )

        return {
            "order_id": rz_order["id"],
            "amount": amount_paise,
            "currency": course.currency or "INR",
            "key_id": RAZORPAY_KEY_ID,
            "payment_id": payment.payment_id,
            "course_title": course.title,
            "course_id": course_id,
        }

    # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    # 2. VERIFY PAYMENT
    # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    async def verify_payment(
        self,
        user_id: int,
        razorpay_payment_id: str,
        razorpay_order_id: str,
        razorpay_signature: str,
    ) -> dict:
        """
        Verify Razorpay signature, mark payment completed, create enrollment.
        """
        # 1. Verify HMAC signature
        message = f"{razorpay_order_id}|{razorpay_payment_id}"
        expected_signature = hmac.new(
            RAZORPAY_KEY_SECRET.encode("utf-8"),
            message.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        if expected_signature != razorpay_signature:
            logger.warning(
                f"Payment signature mismatch for order {razorpay_order_id}: "
                f"expected={expected_signature}, got={razorpay_signature}"
            )
            # Mark payment as failed
            payment = (await self.db.execute(
                select(Payment).where(Payment.gateway_order_id == razorpay_order_id)
            )).scalar_one_or_none()
            if payment:
                payment.status = PaymentStatus.failed
                payment.gateway_response = {"error": "signature_mismatch"}
                await self.db.commit()
            raise ValueError("Payment verification failed â€” signature mismatch")

        # 2. Find the pending payment
        payment = (await self.db.execute(
            select(Payment).where(
                Payment.gateway_order_id == razorpay_order_id,
                Payment.user_id == user_id,
            )
        )).scalar_one_or_none()
        if not payment:
            raise ValueError("Payment record not found")
        if payment.status == PaymentStatus.completed:
            raise ValueError("Payment already verified")

        # 3. Fetch payment details from Razorpay for full audit
        try:
            rz_payment = razorpay_client.payment.fetch(razorpay_payment_id)
        except Exception as e:
            logger.warning(f"Could not fetch Razorpay payment details: {e}")
            rz_payment = {}

        # 4. Update payment record
        payment.status = PaymentStatus.completed
        payment.gateway_payment_id = razorpay_payment_id
        payment.gateway_signature = razorpay_signature
        payment.gateway_response = rz_payment if isinstance(rz_payment, dict) else {}
        payment.completed_at = utc_now()
        payment.billing_email = rz_payment.get("email", "")

        # 5. Create enrollment
        student = (await self.db.execute(
            select(Student).where(Student.user_id == user_id)
        )).scalar_one_or_none()
        if not student:
            raise ValueError("Student not found")

        course_id = payment.reference_id

        # Check if already enrolled (edge case: double submit)
        existing = (await self.db.execute(
            select(Enrollment).where(
                Enrollment.student_id == student.student_id,
                Enrollment.course_id == course_id,
            )
        )).scalar_one_or_none()

        if existing:
            enrollment = existing
        else:
            enrollment = Enrollment(
                student_id=student.student_id,
                course_id=course_id,
                status=EnrollmentStatus.in_progress,
                payment_id=payment.payment_id,
            )
            self.db.add(enrollment)

            # Increment course enrollment count
            course = (await self.db.execute(
                select(Course).where(Course.course_id == course_id)
            )).scalar_one_or_none()
            if course:
                course.total_enrollments = (course.total_enrollments or 0) + 1

        await self.db.commit()
        await self.db.refresh(enrollment)

        # Get course slug for redirect
        course = (await self.db.execute(
            select(Course).where(Course.course_id == course_id)
        )).scalar_one_or_none()

        logger.info(
            f"Payment verified: payment_id={payment.payment_id}, "
            f"enrollment_id={enrollment.enrollment_id}, "
            f"razorpay_payment={razorpay_payment_id}"
        )

        # 6. Trigger embedding regeneration (non-blocking)
        try:
            from app.services.embedding_service import generate_student_embedding
            result = await generate_student_embedding(student.student_id)
            logger.info(f"Payment enrollment embedding: {result.get('status') if result else 'no_data'}")
        except Exception as e:
            logger.warning(f"Payment embedding trigger failed: {e}")

        # 7. Create notification for student
        try:
            from app.api.v1.endpoints.notifications import create_notification
            await create_notification(
                self.db,
                user_id=user_id,
                title="Payment Successful! ðŸŽ‰",
                message=f"Your payment of â‚¹{payment.total_amount} for \"{course.title}\" was successful. You can now start learning!",
                notification_type="payment_confirmation",
                reference_type="course",
                reference_id=course_id,
            )
        except Exception as e:
            logger.warning(f"Payment notification failed: {e}")

        return {
            "success": True,
            "message": "Payment verified and enrollment created",
            "payment_id": payment.payment_id,
            "enrollment_id": enrollment.enrollment_id,
            "course_slug": course.slug if course else "",
        }

    # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    # 3. PAYMENT HISTORY
    # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    async def get_payment_history(self, user_id: int) -> dict:
        """Get all payments for a user with course title lookups."""
        result = await self.db.execute(
            select(Payment)
            .where(Payment.user_id == user_id)
            .order_by(desc(Payment.created_at))
        )
        payments = result.scalars().all()

        items = []
        for p in payments:
            # Lookup reference title
            ref_title = None
            if p.reference_type == "course" and p.reference_id:
                course = (await self.db.execute(
                    select(Course.title).where(Course.course_id == p.reference_id)
                )).scalar_one_or_none()
                ref_title = course

            items.append({
                "payment_id": p.payment_id,
                "payment_type": p.payment_type.value if p.payment_type else "",
                "amount": p.amount,
                "currency": p.currency,
                "tax_amount": p.tax_amount,
                "tax_percentage": p.tax_percentage,
                "total_amount": p.total_amount,
                "status": p.status.value if p.status else "",
                "gateway_name": p.gateway_name,
                "gateway_payment_id": p.gateway_payment_id,
                "gateway_order_id": p.gateway_order_id,
                "invoice_number": p.invoice_number,
                "reference_type": p.reference_type,
                "reference_id": p.reference_id,
                "created_at": p.created_at,
                "completed_at": p.completed_at,
                "reference_title": ref_title,
            })

        return {"payments": items, "total": len(items)}
