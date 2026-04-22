import asyncio
import os
import sys

# Add backend dir to path
sys.path.append(r"c:\Users\WELCOME\Desktop\Recruit\BE")

from app.db.postgres import async_session_factory
from app.services.course_service import CourseService
from sqlalchemy import text

async def test_enroll():
    async with async_session_factory() as db:
        service = CourseService(db)
        
        # ensure student and course exist
        res = await db.execute(text("SELECT student_id FROM students LIMIT 1"))
        student_id = res.scalar()
        if not student_id:
            print("No student found. Create one first.")
            return
            
        res = await db.execute(text("SELECT course_id FROM courses LIMIT 1"))
        course_id = res.scalar()
        if not course_id:
            print("No course found.")
            return
            
        print(f"Enrolling student {student_id} in course {course_id}")
        
        # Delete existing enrollment if any
        await db.execute(text(f"DELETE FROM enrollments WHERE student_id={student_id} AND course_id={course_id}"))
        await db.commit()
        
        try:
            enrollment = await service.enroll_student(student_id, course_id)
            print("Success:", enrollment)
        except Exception as e:
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_enroll())
