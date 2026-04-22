"""Admin catalog endpoints — CRUD for categories, skills, instructors."""

import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.db.postgres import get_db
from app.api.dependencies import require_admin
from app.utils.time import utc_now
from app.schemas.course_builder import (
    CategoryCreateRequest, CategoryUpdateRequest, CategoryOut,
    SkillCreateRequest, SkillUpdateRequest, SkillOut,
    InstructorCreateRequest, InstructorUpdateRequest, InstructorOut,
)

router = APIRouter(prefix="/admin", tags=["Admin Catalog"])


def _slugify(name: str) -> str:
    """Convert a name to a URL-safe slug."""
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    return slug.strip("-")


# ══════════════════════════════════════════════════════════════════════════
# CATEGORIES
# ══════════════════════════════════════════════════════════════════════════

@router.get("/categories")
async def list_categories(
    admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(text(
        "SELECT category_id, name, slug, description, parent_category_id, "
        "icon_url, display_order, is_active "
        "FROM categories ORDER BY display_order, name"
    ))
    return [dict(r) for r in result.mappings().all()]


@router.post("/categories")
async def create_category(
    body: CategoryCreateRequest,
    admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    slug = body.slug or _slugify(body.name)
    result = await db.execute(text("""
        INSERT INTO categories (name, slug, description, parent_category_id, icon_url, display_order, is_active, created_at)
        VALUES (:name, :slug, :description, :parent_category_id, :icon_url, :display_order, true, :now)
        RETURNING category_id
    """), {
        "name": body.name, "slug": slug, "description": body.description,
        "parent_category_id": body.parent_category_id, "icon_url": body.icon_url,
        "display_order": body.display_order, "now": utc_now(),
    })
    category_id = result.scalar_one()
    await db.commit()
    return {"category_id": category_id, "slug": slug}


@router.put("/categories/{category_id}")
async def update_category(
    category_id: int,
    body: CategoryUpdateRequest,
    admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    sets, params = [], {"cid": category_id}
    for field in ["name", "slug", "description", "parent_category_id", "icon_url", "display_order", "is_active"]:
        val = getattr(body, field, None)
        if val is not None:
            sets.append(f"{field} = :{field}")
            params[field] = val
    if not sets:
        raise HTTPException(400, "No fields to update")
    sql = f"UPDATE categories SET {', '.join(sets)} WHERE category_id = :cid RETURNING category_id"
    result = await db.execute(text(sql), params)
    if not result.scalar():
        raise HTTPException(404, "Category not found")
    await db.commit()
    return {"success": True}


@router.delete("/categories/{category_id}")
async def delete_category(
    category_id: int,
    admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        text("DELETE FROM categories WHERE category_id = :cid RETURNING category_id"),
        {"cid": category_id},
    )
    if not result.scalar():
        raise HTTPException(404, "Category not found")
    await db.commit()
    return {"success": True}


# ══════════════════════════════════════════════════════════════════════════
# SKILLS
# ══════════════════════════════════════════════════════════════════════════

@router.get("/skills")
async def list_skills(
    search: str = Query(""),
    admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    if search:
        result = await db.execute(text(
            "SELECT skill_id, name, slug, category, description, icon_url, is_active "
            "FROM skills WHERE name ILIKE :q ORDER BY name"
        ), {"q": f"%{search}%"})
    else:
        result = await db.execute(text(
            "SELECT skill_id, name, slug, category, description, icon_url, is_active "
            "FROM skills ORDER BY name"
        ))
    return [dict(r) for r in result.mappings().all()]


@router.post("/skills")
async def create_skill(
    body: SkillCreateRequest,
    admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    slug = body.slug or _slugify(body.name)
    result = await db.execute(text("""
        INSERT INTO skills (name, slug, category, description, icon_url, is_active, created_at)
        VALUES (:name, :slug, :category, :description, :icon_url, true, :now)
        RETURNING skill_id
    """), {
        "name": body.name, "slug": slug, "category": body.category,
        "description": body.description, "icon_url": body.icon_url, "now": utc_now(),
    })
    skill_id = result.scalar_one()
    await db.commit()
    return {"skill_id": skill_id, "slug": slug}


@router.put("/skills/{skill_id}")
async def update_skill(
    skill_id: int,
    body: SkillUpdateRequest,
    admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    sets, params = [], {"sid": skill_id}
    for field in ["name", "slug", "category", "description", "icon_url", "is_active"]:
        val = getattr(body, field, None)
        if val is not None:
            sets.append(f"{field} = :{field}")
            params[field] = val
    if not sets:
        raise HTTPException(400, "No fields to update")
    sql = f"UPDATE skills SET {', '.join(sets)} WHERE skill_id = :sid RETURNING skill_id"
    result = await db.execute(text(sql), params)
    if not result.scalar():
        raise HTTPException(404, "Skill not found")
    await db.commit()
    return {"success": True}


@router.delete("/skills/{skill_id}")
async def delete_skill(
    skill_id: int,
    admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        text("DELETE FROM skills WHERE skill_id = :sid RETURNING skill_id"),
        {"sid": skill_id},
    )
    if not result.scalar():
        raise HTTPException(404, "Skill not found")
    await db.commit()
    return {"success": True}


# ══════════════════════════════════════════════════════════════════════════
# INSTRUCTORS
# ══════════════════════════════════════════════════════════════════════════

@router.get("/instructors")
async def list_instructors(
    admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(text(
        "SELECT instructor_id, user_id, first_name, last_name, bio, headline, "
        "expertise_areas, profile_picture_url, is_active, "
        "(SELECT COUNT(*) FROM courses c WHERE c.instructor_id = i.instructor_id) AS course_count "
        "FROM instructors i ORDER BY first_name, last_name"
    ))
    return [dict(r) for r in result.mappings().all()]


@router.post("/instructors")
async def create_instructor(
    body: InstructorCreateRequest,
    admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    # If user_id is not provided, auto-create a user first
    user_id = body.user_id
    if user_id is None:
        # Generate a temporary email based on name
        temp_email = f"{body.first_name.lower()}.{body.last_name.lower()}@temp.instructor"
        # Check if this email already exists
        existing_user = await db.execute(text("SELECT user_id FROM users WHERE email = :email"), {"email": temp_email})
        if existing_user.scalar_one_or_none():
            # User already exists, use their user_id
            user_id = existing_user.scalar_one()
        else:
            # Create a new user (only fields that exist in the users table)
            result = await db.execute(text("""
                INSERT INTO users (email, password_hash, user_type, status, created_at, updated_at)
                VALUES (:email, :password_hash, 'instructor', 'active', :now, :now)
                RETURNING user_id
            """), {
                "email": temp_email,
                "password_hash": "",  # Empty password for now
                "now": utc_now(),
            })
            user_id = result.scalar_one()
    else:
        # Verify the provided user exists
        user_check = await db.execute(text("SELECT user_id FROM users WHERE user_id = :user_id"), {"user_id": user_id})
        if user_check.scalar_one_or_none() is None:
            raise HTTPException(status_code=400, detail=f"User with user_id={user_id} does not exist")

    result = await db.execute(text("""
        INSERT INTO instructors (user_id, first_name, last_name, bio, headline,
            expertise_areas, profile_picture_url, is_active, created_at, updated_at)
        VALUES (:user_id, :first_name, :last_name, :bio, :headline,
            :expertise_areas, :profile_picture_url, true, :now, :now)
        RETURNING instructor_id
    """), {
        "user_id": user_id, "first_name": body.first_name, "last_name": body.last_name,
        "bio": body.bio, "headline": body.headline, "expertise_areas": body.expertise_areas,
        "profile_picture_url": body.profile_picture_url, "now": utc_now(),
    })
    instructor_id = result.scalar_one()
    await db.commit()
    return {"instructor_id": instructor_id}


@router.put("/instructors/{instructor_id}")
async def update_instructor(
    instructor_id: int,
    body: InstructorUpdateRequest,
    admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    sets, params = ["updated_at = :now"], {"iid": instructor_id, "now": utc_now()}
    for field in ["first_name", "last_name", "bio", "headline", "expertise_areas", "profile_picture_url", "is_active"]:
        val = getattr(body, field, None)
        if val is not None:
            sets.append(f"{field} = :{field}")
            params[field] = val
    sql = f"UPDATE instructors SET {', '.join(sets)} WHERE instructor_id = :iid RETURNING instructor_id"
    result = await db.execute(text(sql), params)
    if not result.scalar():
        raise HTTPException(404, "Instructor not found")
    await db.commit()
    return {"success": True}


@router.delete("/instructors/{instructor_id}")
async def delete_instructor(
    instructor_id: int,
    admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        text("DELETE FROM instructors WHERE instructor_id = :iid RETURNING instructor_id"),
        {"iid": instructor_id},
    )
    if not result.scalar():
        raise HTTPException(404, "Instructor not found")
    await db.commit()
    return {"success": True}
