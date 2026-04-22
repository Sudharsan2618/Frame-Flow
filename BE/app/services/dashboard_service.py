from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.user import User
from app.utils.time import utc_now
import logging

logger = logging.getLogger(__name__)

def _format_activity(act: dict) -> str:
    """Format a MongoDB learning activity into a human-readable description."""
    atype = act.get("activity_type", "")
    mapping = {
        "course_started": "Started exploring",
        "lesson_completed": "Completed a lesson in",
        "quiz_passed": "Aced a quiz in",
        "course_completed": "Graduated from",
    }
    action = mapping.get(atype, "Engaged with")
    course_name = act.get("course_title", "a course")
    return f"{action} {course_name}"

class DashboardService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_student_dashboard(self, user_id: int) -> dict:
        """Get aggregated dashboard data for a student from real DB with optimized N+1 queries."""
        result = await self.db.execute(
            select(User).options(selectinload(User.student)).where(User.user_id == user_id)
        )
        user = result.scalar_one_or_none()
        if not user or not user.student:
            raise ValueError("Student not found")

        student = user.student

        # N+1 Fix: Batched SQL query
        query = text("""
            SELECT
                e.course_id, c.title, c.slug, c.thumbnail_url,
                COUNT(CASE WHEN lp.is_completed THEN 1 END) AS completed_lessons,
                COUNT(l.lesson_id) AS total_lessons,
                MAX(lp.last_accessed_at) AS last_accessed_at, e.status as enrollment_status
            FROM enrollments e
            JOIN courses c ON c.course_id = e.course_id
            LEFT JOIN modules m ON m.course_id = c.course_id
            LEFT JOIN lessons l ON l.module_id = m.module_id
            LEFT JOIN lesson_progress lp ON lp.lesson_id = l.lesson_id AND lp.enrollment_id = e.enrollment_id
            WHERE e.student_id = :sid
            GROUP BY e.course_id, c.title, c.slug, c.thumbnail_url, e.status
            ORDER BY last_accessed_at DESC NULLS LAST
        """)
        
        rows = await self.db.execute(query, {"sid": student.student_id})
        enrollments_data = rows.mappings().all()

        enrolled_courses = []
        completed_count = 0
        for row in enrollments_data:
            if row["enrollment_status"] == "completed":
                completed_count += 1
                
            enrolled_courses.append({
                "course_id": row["course_id"],
                "title": row["title"],
                "slug": row["slug"],
                "thumbnail_url": row["thumbnail_url"],
                "progress_percentage": round(row["completed_lessons"] / row["total_lessons"] * 100, 1) if row["total_lessons"] > 0 else 0,
                "total_lessons": row["total_lessons"],
                "completed_lessons": row["completed_lessons"],
                "last_accessed_at": row["last_accessed_at"].isoformat() if row["last_accessed_at"] else None,
            })

        # Get recent activity from MongoDB
        recent_activity = []
        try:
            from app.db.mongodb import get_mongodb
            mongo_db = get_mongodb()
            activities = await mongo_db.learning_activities.find(
                {"student_id": student.student_id}
            ).sort("timestamp", -1).limit(10).to_list(10)

            for act in activities:
                recent_activity.append({
                    "activity_type": act.get("activity_type", ""),
                    "description": _format_activity(act),
                    "course_name": act.get("course_title", ""),
                    "timestamp": act.get("timestamp", utc_now()).isoformat() if act.get("timestamp") else "",
                })
        except Exception:
            pass  # MongoDB may not have data yet

        # Get learning hours by month from MongoDB
        learning_hours_by_month = []
        try:
            from app.db.mongodb import get_mongodb
            mongo_db = get_mongodb()
            pipeline = [
                {"$match": {"student_id": student.student_id}},
                {"$group": {
                    "_id": {"$dateToString": {"format": "%Y-%m", "date": "$timestamp"}},
                    "total_seconds": {"$sum": "$details.time_spent_seconds"}
                }},
                {"$sort": {"_id": 1}},
                {"$limit": 6},
            ]
            results = await mongo_db.learning_activities.aggregate(pipeline).to_list(6)
            for r in results:
                month_str = r["_id"] if r["_id"] else ""
                hours = round((r.get("total_seconds") or 0) / 3600, 1)
                learning_hours_by_month.append({"month": month_str, "hours": hours})
        except Exception:
            pass

        return {
            "first_name": student.first_name,
            "last_name": student.last_name,
            "stats": {
                "enrolled_courses": len(enrollments_data),
                "completed_courses": completed_count,
                "total_learning_hours": float(student.total_learning_hours or 0),
                "average_quiz_score": float(student.average_quiz_score or 0),
                "streak_days": student.streak_days or 0,
            },
            "enrolled_courses": enrolled_courses,
            "recent_activity": recent_activity,
            "learning_hours_by_month": learning_hours_by_month,
        }
