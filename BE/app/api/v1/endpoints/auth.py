"""Auth API endpoints — login, token validation, current user."""

from fastapi import APIRouter, Depends, HTTPException, Header, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.db.postgres import get_db
from app.services.auth_service import (
    AuthService, create_access_token, create_refresh_token,
    decode_refresh_token,
)
from app.services.embedding_service import generate_student_embedding
from app.api.dependencies import get_current_user_id
from app.utils.limiter import limiter

import logging
logger = logging.getLogger(__name__)
from app.schemas.auth import (
    LoginRequest, TokenResponse, UserOut, RefreshRequest,
    StudentRegisterRequest, CompanyRegisterRequest,
    StudentOnboardingRequest, CompanyOnboardingRequest,
    StudentDashboardResponse,
    StudentProfileFullOut, StudentProfileUpdateRequest,
    CompanyProfileFullOut, CompanyProfileUpdateRequest,
    ForgotPasswordRequest, ResetPasswordRequest,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _set_auth_cookie(response: Response, token: str) -> None:
    """Set httpOnly auth cookie on the response."""
    import os
    is_prod = os.getenv("ENV", "development") == "production"
    response.set_cookie(
        key="auth_token",
        value=token,
        httponly=True,
        secure=is_prod,
        samesite="lax",
        path="/",
        max_age=60 * 60 * 24 * 7,  # 1 week
    )


def _clear_auth_cookie(response: Response) -> None:
    """Clear the httpOnly auth cookie."""
    response.delete_cookie(key="auth_token", path="/")


from app.services.registration_service import RegistrationService
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




@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(request: Request, response: Response, body: LoginRequest, service: AuthService = Depends(get_auth_service)):
    """Authenticate user and return JWT token."""
    user_data = await service.authenticate_user(body.email, body.password)
    if not user_data:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    # JWT tokens
    token_data = {
        "sub": str(user_data["user_id"]),
        "email": user_data["email"],
        "user_type": user_data["user_type"],
    }
    token = create_access_token(data=token_data)
    refresh = create_refresh_token(data=token_data, user_type=user_data["user_type"])

    # Fire-and-forget event log
    try:
        from app.services.event_logger import log_event
        await log_event("user.login", user_id=user_data["user_id"])
    except Exception:
        pass  # Non-critical

    _set_auth_cookie(response, token)
    return TokenResponse(
        access_token=token,
        refresh_token=refresh,
        user=UserOut(**user_data),
    )


@router.post("/register/student", response_model=TokenResponse)
@limiter.limit("3/minute")
async def register_student(request: Request, response: Response, body: StudentRegisterRequest, service: RegistrationService = Depends(get_reg_service)):
    """Register a new student and return JWT token."""
    try:
        user_data = await service.register_student(
            email=body.email,
            password=body.password,
            first_name=body.first_name,
            last_name=body.last_name,
        )
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

    token_data = {
        "sub": str(user_data["user_id"]),
        "email": user_data["email"],
        "user_type": user_data["user_type"],
    }
    token = create_access_token(data=token_data)
    refresh = create_refresh_token(data=token_data, user_type=user_data["user_type"])

    try:
        from app.services.event_logger import log_event
        await log_event("user.registered", user_id=user_data["user_id"])
    except Exception:
        pass

    _set_auth_cookie(response, token)
    return TokenResponse(access_token=token, refresh_token=refresh, user=UserOut(**user_data))


@router.post("/register/company", response_model=TokenResponse)
@limiter.limit("3/minute")
async def register_company(request: Request, response: Response, body: CompanyRegisterRequest, service: RegistrationService = Depends(get_reg_service)):
    """Register a new company and return JWT token."""
    try:
        user_data = await service.register_company(
            email=body.email,
            password=body.password,
            company_name=body.company_name,
        )
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

    token_data = {
        "sub": str(user_data["user_id"]),
        "email": user_data["email"],
        "user_type": user_data["user_type"],
    }
    token = create_access_token(data=token_data)
    refresh = create_refresh_token(data=token_data, user_type=user_data["user_type"])

    try:
        from app.services.event_logger import log_event
        await log_event("user.registered", user_id=user_data["user_id"])
    except Exception:
        pass

    _set_auth_cookie(response, token)
    return TokenResponse(access_token=token, refresh_token=refresh, user=UserOut(**user_data))


@router.post("/logout")
async def logout(response: Response):
    """Clear auth cookie."""
    _clear_auth_cookie(response)
    return {"detail": "Logged out"}


@router.post("/forgot-password")
@limiter.limit("5/minute")
async def forgot_password(
    request: Request,
    body: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Send a password-reset email if the account exists.

    Always returns 200 to avoid email enumeration.
    """
    from sqlalchemy import select
    from app.models.user import User
    from jose import jwt
    from datetime import timedelta
    from app.config import settings
    from app.utils.time import utc_now
    from app.utils.email import send_password_reset_email

    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if user and user.status == "active":
        # Create a short-lived reset token (30 min)
        reset_payload = {
            "sub": str(user.user_id),
            "email": user.email,
            "purpose": "password_reset",
            "exp": utc_now() + timedelta(minutes=30),
        }
        reset_token = jwt.encode(reset_payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"

        # Fire-and-forget email (don't block response)
        import asyncio
        asyncio.create_task(send_password_reset_email(user.email, reset_url))

    # Always 200 — no email enumeration
    return {"detail": "If an account with that email exists, a reset link has been sent."}


@router.post("/reset-password")
@limiter.limit("5/minute")
async def reset_password(
    request: Request,
    body: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Reset password using a valid reset token."""
    from jose import jwt, JWTError
    from sqlalchemy import select
    from app.models.user import User
    from app.services.auth_service import hash_password
    from app.config import settings

    try:
        payload = jwt.decode(body.token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    if payload.get("purpose") != "password_reset":
        raise HTTPException(status_code=400, detail="Invalid reset token")

    user_id = int(payload["sub"])
    result = await db.execute(select(User).where(User.user_id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid reset token")

    user.password_hash = hash_password(body.new_password)
    await db.commit()

    logger.info("[AUTH] Password reset for user_id=%s", user_id)
    return {"detail": "Password has been reset successfully. You can now log in."}


@router.post("/refresh")
async def refresh_access_token(body: RefreshRequest):
    """Exchange a valid refresh token for a new access token."""
    payload = decode_refresh_token(body.refresh_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    new_access = create_access_token(data={
        "sub": payload["sub"],
        "email": payload.get("email", ""),
        "user_type": payload.get("user_type", ""),
    })
    return {"access_token": new_access, "token_type": "bearer"}


@router.put("/onboarding/student", response_model=UserOut)
async def complete_student_onboarding(
    body: StudentOnboardingRequest,
    user_id: int = Depends(get_current_user_id),
    service: ProfileService = Depends(get_profile_service),
):
    """Complete student onboarding — saves profile data and marks onboarding done."""
    try:
        user_data = await service.update_student_onboarding(user_id, body.model_dump(exclude_none=True))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    # Trigger initial student embedding generation (background, non-blocking)
    if user_data.get("student_id"):
        try:
            result = await generate_student_embedding(user_data["student_id"])
            logger.info(f"Onboarding embedding for student {user_data['student_id']}: {result.get('status') if result else 'no_data'}")
        except Exception as e:
            logger.warning(f"Onboarding embedding failed for student {user_data['student_id']}: {e}")

    return UserOut(**user_data)


@router.put("/onboarding/company", response_model=UserOut)
async def complete_company_onboarding(
    body: CompanyOnboardingRequest,
    user_id: int = Depends(get_current_user_id),
    service: ProfileService = Depends(get_profile_service),
):
    """Complete company onboarding — saves company data and marks onboarding done."""
    try:
        user_data = await service.update_company_onboarding(user_id, body.model_dump(exclude_none=True))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return UserOut(**user_data)


@router.get("/me", response_model=UserOut)
async def get_current_user(
    user_id: int = Depends(get_current_user_id),
    service: ProfileService = Depends(get_profile_service),
):
    """Get current user from JWT token or cookie."""
    user_data = await service.get_user_by_id(user_id)
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    return UserOut(**user_data)


@router.get("/dashboard/student", response_model=StudentDashboardResponse)
async def get_student_dashboard(
    user_id: int = Depends(get_current_user_id),
    service: DashboardService = Depends(get_dashboard_service),
):
    """Get aggregated student dashboard data."""
    try:
        data = await service.get_student_dashboard(user_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return StudentDashboardResponse(**data)


@router.get("/profile/student", response_model=StudentProfileFullOut)
async def get_student_profile(
    user_id: int = Depends(get_current_user_id),
    service: ProfileService = Depends(get_profile_service),
):
    """Get full student profile."""
    try:
        data = await service.get_student_profile(user_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return StudentProfileFullOut(**data)


@router.put("/profile/student", response_model=StudentProfileFullOut)
async def update_student_profile(
    body: StudentProfileUpdateRequest,
    user_id: int = Depends(get_current_user_id),
    service: ProfileService = Depends(get_profile_service),
):
    """Update student profile fields."""
    try:
        data = await service.update_student_profile(user_id, body.model_dump(exclude_none=True))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return StudentProfileFullOut(**data)


@router.get("/profile/company", response_model=CompanyProfileFullOut)
async def get_company_profile(
    user_id: int = Depends(get_current_user_id),
    service: ProfileService = Depends(get_profile_service),
):
    """Get full company profile."""
    try:
        data = await service.get_company_profile(user_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return CompanyProfileFullOut(**data)


@router.put("/profile/company", response_model=CompanyProfileFullOut)
async def update_company_profile(
    body: CompanyProfileUpdateRequest,
    user_id: int = Depends(get_current_user_id),
    service: ProfileService = Depends(get_profile_service),
):
    """Update company profile fields."""
    try:
        data = await service.update_company_profile(user_id, body.model_dump(exclude_none=True))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return CompanyProfileFullOut(**data)
