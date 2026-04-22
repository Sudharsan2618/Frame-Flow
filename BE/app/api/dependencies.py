"""Shared auth dependencies — centralized RBAC guards for all endpoints."""

from typing import Optional

from fastapi import Depends, Header, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.db.postgres import get_db
from app.services.auth_service import decode_access_token


# ── Base JWT extraction ──────────────────────────────────────────────────

async def get_current_user(request: Request, authorization: Optional[str] = Header(None)) -> dict:
    """
    Extract and validate JWT token from Authorization header or cookie.
    Returns dict with user_id, email, user_type from the token payload.
    """
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
    elif request.cookies.get("auth_token"):
        token = request.cookies.get("auth_token")
        
    if not token:
        raise HTTPException(status_code=401, detail="Missing or invalid token")
        
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return {
        "user_id": int(payload.get("sub", 0)),
        "email": payload.get("email", ""),
        "user_type": payload.get("user_type", ""),
    }


async def get_current_user_id(request: Request, authorization: Optional[str] = Header(None)) -> int:
    """Extract user_id from Bearer token or cookie (convenience shorthand)."""
    user = await get_current_user(request, authorization)
    return user["user_id"]


# ── Role-specific guards ────────────────────────────────────────────────

async def require_student(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Require the caller to be a student. Returns dict with user_id and student_id.
    Raises 403 if user is not a student.
    """
    if user["user_type"] != "student":
        raise HTTPException(status_code=403, detail="Student access required")
    result = await db.execute(
        text("SELECT student_id FROM students WHERE user_id = :uid"),
        {"uid": user["user_id"]},
    )
    student_id = result.scalar_one_or_none()
    if not student_id:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return {**user, "student_id": student_id}


async def require_company(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Require the caller to be a company. Returns dict with user_id and company_id.
    Raises 403 if user is not a company.
    """
    if user["user_type"] != "company":
        raise HTTPException(status_code=403, detail="Company access required")
    result = await db.execute(
        text("SELECT company_id FROM companies WHERE user_id = :uid"),
        {"uid": user["user_id"]},
    )
    company_id = result.scalar_one_or_none()
    if not company_id:
        raise HTTPException(status_code=404, detail="Company profile not found")
    return {**user, "company_id": company_id}


async def require_admin(request: Request, authorization: Optional[str] = Header(None)) -> dict:
    """
    Require the caller to be an admin. Returns dict with user_id and user_type.
    Raises 403 if user is not an admin.
    """
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
    elif request.cookies.get("auth_token"):
        token = request.cookies.get("auth_token")
        
    if not token:
        raise HTTPException(status_code=401, detail="Missing or invalid token")
        
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    if payload.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return {"user_id": int(payload.get("sub", 0)), "user_type": "admin"}
