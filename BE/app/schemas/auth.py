"""Pydantic schemas for authentication."""

from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., max_length=72)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: "UserOut"


class UserOut(BaseModel):
    user_id: int
    email: str
    user_type: str
    status: str
    onboarding_completed: bool = False
    student_id: Optional[int] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    headline: Optional[str] = None
    profile_picture_url: Optional[str] = None
    # Company fields
    company_id: Optional[int] = None
    company_name: Optional[str] = None
    logo_url: Optional[str] = None


class RefreshRequest(BaseModel):
    refresh_token: str


# ── Registration ──

class StudentRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=72)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)


class CompanyRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=72)
    company_name: str = Field(..., min_length=2, max_length=255)


# ── Student Onboarding ──

class StudentOnboardingRequest(BaseModel):
    phone: Optional[str] = Field(None, max_length=20, pattern=r'^\+?[0-9\s\-]+$')
    headline: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    education: Optional[str] = None
    experience_years: Optional[int] = Field(None, ge=0, le=50)
    # Step 2: Job Preferences
    availability_status: Optional[bool] = True
    preferred_job_types: Optional[List[str]] = None
    preferred_locations: Optional[List[str]] = None
    preferred_remote_types: Optional[List[str]] = None
    salary_expectation_min: Optional[Decimal] = Field(None, ge=0)
    salary_expectation_max: Optional[Decimal] = Field(None, ge=0)
    salary_currency: Optional[str] = "INR"
    notice_period_days: Optional[int] = Field(None, ge=0, le=365)
    # Step 3: Social Links
    linkedin_url: Optional[str] = Field(None, max_length=500)
    github_url: Optional[str] = Field(None, max_length=500)
    portfolio_url: Optional[str] = Field(None, max_length=500)
    personal_website: Optional[str] = Field(None, max_length=500)


class StudentProfileOut(BaseModel):
    student_id: int
    first_name: str
    last_name: str
    bio: Optional[str] = None
    headline: Optional[str] = None
    location: Optional[str] = None
    education: Optional[str] = None
    experience_years: int = 0
    profile_picture_url: Optional[str] = None
    resume_url: Optional[str] = None
    cover_letter_url: Optional[str] = None
    availability_status: bool = True
    preferred_job_types: Optional[List[str]] = None
    preferred_locations: Optional[List[str]] = None
    preferred_remote_types: Optional[List[str]] = None
    salary_expectation_min: Optional[Decimal] = None
    salary_expectation_max: Optional[Decimal] = None
    salary_currency: str = "INR"
    notice_period_days: Optional[int] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    personal_website: Optional[str] = None
    total_courses_enrolled: int = 0
    total_courses_completed: int = 0
    total_learning_hours: Decimal = Decimal("0")
    average_quiz_score: Decimal = Decimal("0")
    streak_days: int = 0


class StudentProfileFullOut(BaseModel):
    user_id: int
    email: str
    phone: Optional[str] = None
    student_id: int
    first_name: str
    last_name: str
    bio: Optional[str] = None
    headline: Optional[str] = None
    location: Optional[str] = None
    education: Optional[str] = None
    experience_years: int = 0
    profile_picture_url: Optional[str] = None
    resume_url: Optional[str] = None
    cover_letter_url: Optional[str] = None
    availability_status: bool = True
    preferred_job_types: Optional[List[str]] = None
    preferred_locations: Optional[List[str]] = None
    preferred_remote_types: Optional[List[str]] = None
    salary_expectation_min: Optional[float] = None
    salary_expectation_max: Optional[float] = None
    salary_currency: str = "INR"
    notice_period_days: Optional[int] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    personal_website: Optional[str] = None
    total_courses_enrolled: int = 0
    total_courses_completed: int = 0
    total_learning_hours: float = 0
    average_quiz_score: float = 0
    streak_days: int = 0


class StudentProfileUpdateRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = Field(None, max_length=20, pattern=r'^\+?[0-9\s\-]+$')
    headline: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    education: Optional[str] = None
    experience_years: Optional[int] = Field(None, ge=0, le=50)
    availability_status: Optional[bool] = None
    preferred_job_types: Optional[List[str]] = None
    preferred_locations: Optional[List[str]] = None
    preferred_remote_types: Optional[List[str]] = None
    salary_expectation_min: Optional[Decimal] = Field(None, ge=0)
    salary_expectation_max: Optional[Decimal] = Field(None, ge=0)
    salary_currency: Optional[str] = None
    notice_period_days: Optional[int] = Field(None, ge=0, le=365)
    linkedin_url: Optional[str] = Field(None, max_length=500)
    github_url: Optional[str] = Field(None, max_length=500)
    portfolio_url: Optional[str] = Field(None, max_length=500)
    personal_website: Optional[str] = Field(None, max_length=500)


# ── Company Onboarding ──

class CompanyOnboardingRequest(BaseModel):
    # Step 1: Company Info
    description: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[str] = None
    founded_year: Optional[int] = Field(None, ge=1800, le=2030)
    headquarters_location: Optional[str] = None
    # Step 2: Contact
    website_url: Optional[str] = Field(None, max_length=500)
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = Field(None, max_length=20, pattern=r'^\+?[0-9\s\-]+$')
    # Step 3: Social & Billing
    linkedin_url: Optional[str] = Field(None, max_length=500)
    twitter_url: Optional[str] = Field(None, max_length=500)
    billing_email: Optional[EmailStr] = None
    gst_number: Optional[str] = Field(None, max_length=20)
    billing_address: Optional[str] = None


class CompanyProfileOut(BaseModel):
    company_id: int
    company_name: str
    description: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[str] = None
    founded_year: Optional[int] = None
    headquarters_location: Optional[str] = None
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    website_url: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    twitter_url: Optional[str] = None
    is_verified: bool = False
    billing_email: Optional[str] = None
    gst_number: Optional[str] = None
    billing_address: Optional[str] = None
    total_jobs_posted: int = 0
    total_hires: int = 0


class CompanyProfileFullOut(BaseModel):
    user_id: int
    email: str
    phone: Optional[str] = None
    company_id: int
    company_name: str
    description: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[str] = None
    founded_year: Optional[int] = None
    headquarters_location: Optional[str] = None
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    website_url: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    twitter_url: Optional[str] = None
    is_verified: bool = False
    billing_email: Optional[str] = None
    gst_number: Optional[str] = None
    billing_address: Optional[str] = None
    total_jobs_posted: int = 0
    total_hires: int = 0


class CompanyProfileUpdateRequest(BaseModel):
    company_name: Optional[str] = None
    phone: Optional[str] = Field(None, max_length=20, pattern=r'^\+?[0-9\s\-]+$')
    description: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[str] = None
    founded_year: Optional[int] = Field(None, ge=1800, le=2030)
    headquarters_location: Optional[str] = None
    website_url: Optional[str] = Field(None, max_length=500)
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = Field(None, max_length=20, pattern=r'^\+?[0-9\s\-]+$')
    linkedin_url: Optional[str] = Field(None, max_length=500)
    twitter_url: Optional[str] = Field(None, max_length=500)
    billing_email: Optional[EmailStr] = None
    gst_number: Optional[str] = Field(None, max_length=20)
    billing_address: Optional[str] = None


# ── Student Dashboard ──

class EnrolledCourseSummary(BaseModel):
    course_id: int
    title: str
    slug: str
    thumbnail_url: Optional[str] = None
    progress_percentage: float = 0
    total_lessons: int = 0
    completed_lessons: int = 0
    last_accessed_at: Optional[str] = None


class DashboardStats(BaseModel):
    enrolled_courses: int = 0
    completed_courses: int = 0
    total_learning_hours: float = 0
    average_quiz_score: float = 0
    streak_days: int = 0


class RecentActivityItem(BaseModel):
    activity_type: str
    description: str
    course_name: Optional[str] = None
    timestamp: str


class StudentDashboardResponse(BaseModel):
    first_name: str
    last_name: str
    stats: DashboardStats
    enrolled_courses: List[EnrolledCourseSummary] = []
    recent_activity: List[RecentActivityItem] = []
    learning_hours_by_month: List[dict] = []


# ── Password Reset ──

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=72)


# Rebuild model to resolve forward ref
TokenResponse.model_rebuild()
