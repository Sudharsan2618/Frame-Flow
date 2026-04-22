"""Pydantic schemas for job creation and response."""

from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field


class SkillInput(BaseModel):
    name: str
    is_mandatory: bool = True
    min_experience_years: Optional[int] = None


class JobCreateRequest(BaseModel):
    # Step 1: Basic Info
    title: str = Field(..., min_length=3, max_length=255)
    description: str = Field(..., min_length=10)
    responsibilities: Optional[str] = None
    requirements: Optional[str] = None
    nice_to_have: Optional[str] = None

    # Step 2: Categorization & Employment
    department: Optional[str] = None
    employment_type: str = Field(..., pattern=r"^(full_time|part_time|contract|internship|freelance)$")
    remote_type: str = Field(default="on_site", pattern=r"^(remote|on_site|hybrid)$")
    location: Optional[str] = None
    experience_min_years: int = 0
    experience_max_years: Optional[int] = None

    # Step 3: Compensation & Benefits
    salary_min: Optional[Decimal] = None
    salary_max: Optional[Decimal] = None
    salary_currency: str = "INR"
    salary_is_visible: bool = False
    benefits: List[str] = []

    # Step 4: Skills
    skills: List[SkillInput] = []

    # Step 5: Review & Publish
    status: str = Field(default="draft", pattern=r"^(draft|active)$")
    deadline: Optional[datetime] = None


class SkillOut(BaseModel):
    skill_id: int
    name: str
    is_mandatory: bool = True
    min_experience_years: Optional[int] = None


class JobOut(BaseModel):
    job_id: int
    company_id: int
    title: str
    slug: str
    description: str
    responsibilities: Optional[str] = None
    requirements: Optional[str] = None
    nice_to_have: Optional[str] = None
    department: Optional[str] = None
    employment_type: str
    remote_type: str
    location: Optional[str] = None
    experience_min_years: int = 0
    experience_max_years: Optional[int] = None
    salary_min: Optional[Decimal] = None
    salary_max: Optional[Decimal] = None
    salary_currency: str = "INR"
    salary_is_visible: bool = False
    benefits: List[str] = []
    status: str
    posted_at: Optional[datetime] = None
    deadline: Optional[datetime] = None
    views_count: int = 0
    applications_count: int = 0
    skills: List[SkillOut] = []
    embedding_status: Optional[str] = None
    created_at: Optional[datetime] = None
