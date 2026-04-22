"""Authentication service — JWT token creation and password verification."""

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
    """
    Bcrypt has a hard limit of 72 bytes.
    Truncate to 72 bytes to avoid ValueError in bcrypt/passlib.
    """
    pw_bytes = password.encode("utf-8")
    if len(pw_bytes) > 72:
        return pw_bytes[:72].decode("utf-8", "ignore")
    return password


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against bcrypt hash.
    Bcrypt has a hard limit of 72 bytes. Passwords longer than this
    must be truncated to avoid ValueError in passlib/bcrypt.
    """
    return pwd_context.verify(_truncate_password(plain_password), hashed_password)


def hash_password(password: str) -> str:
    """Hash a password using bcrypt (truncates to 72 bytes first)."""
    return pwd_context.hash(_truncate_password(password))


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = utc_now() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT access token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("token_type") == "refresh":
            return None  # Reject refresh tokens used as access tokens
        return payload
    except JWTError:
        return None


def create_refresh_token(data: dict, user_type: str) -> str:
    """Create a JWT refresh token with role-based lifetime.

    - admin: REFRESH_TOKEN_EXPIRE_HOURS_ADMIN (default 3h)
    - student/company: REFRESH_TOKEN_EXPIRE_HOURS_USER (default 24h)
    """
    to_encode = data.copy()
    if user_type == "admin":
        hours = settings.REFRESH_TOKEN_EXPIRE_HOURS_ADMIN
    else:
        hours = settings.REFRESH_TOKEN_EXPIRE_HOURS_USER
    expire = utc_now() + timedelta(hours=hours)
    to_encode.update({"exp": expire, "token_type": "refresh"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_refresh_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT refresh token."""
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
        """Authenticate user by email and password. Returns user data or None."""
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
