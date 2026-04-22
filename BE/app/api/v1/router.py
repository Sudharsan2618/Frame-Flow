"""V1 API router — aggregates all endpoint modules."""

from fastapi import APIRouter
from app.api.v1.endpoints.courses import router as courses_router
from app.api.v1.endpoints.courses import student_router
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.tracking import router as tracking_router
from app.api.v1.endpoints.jobs import router as jobs_router
from app.api.v1.endpoints.student_jobs import router as student_jobs_router
from app.api.v1.endpoints.admin import router as admin_router
from app.api.v1.endpoints.admin_courses import router as admin_courses_router
from app.api.v1.endpoints.admin_upload import router as admin_upload_router
from app.api.v1.endpoints.admin_catalog import router as admin_catalog_router
from app.api.v1.endpoints.notifications import router as notifications_router
from app.api.v1.endpoints.reviews import router as reviews_router
from app.api.v1.endpoints.certificates import router as certificates_router
from app.api.v1.endpoints.payments import router as payments_router

router = APIRouter()

router.include_router(auth_router)
router.include_router(courses_router)
router.include_router(student_router)
router.include_router(tracking_router)
router.include_router(jobs_router)
router.include_router(student_jobs_router)
router.include_router(admin_router)
router.include_router(admin_courses_router)
router.include_router(admin_upload_router)
router.include_router(admin_catalog_router)
router.include_router(notifications_router)
router.include_router(reviews_router)
router.include_router(certificates_router)
router.include_router(payments_router)


