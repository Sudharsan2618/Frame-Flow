import asyncio
import os
import sys
from typing import Optional

# Add the project root to sys.path for app imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select, delete
from motor.motor_asyncio import AsyncIOMotorClient

from app.db.postgres import async_session_factory
from app.config import settings
from app.models.user import Student
from app.models.course import Enrollment, LessonProgress, QuizAttempt

async def clear_tracking_and_unenroll():
    print("\n--- Clear User Course Tracking Data ---")
    
    try:
        user_id_input = input("Enter User ID: ").strip()
        course_id_input = input("Enter Course ID: ").strip()
        
        if not user_id_input or not course_id_input:
            print("Error: Both User ID and Course ID are required.")
            return
            
        user_id = int(user_id_input)
        course_id = int(course_id_input)
    except ValueError:
        print("Error: IDs must be integers.")
        return

    # 1. Initialize MongoDB client
    mongo_client = AsyncIOMotorClient(settings.MONGODB_URL)
    mongo_db = mongo_client[settings.MONGODB_DB]
    
    # 2. Initialize async Postgres session
    async with async_session_factory() as db:
        try:
            # 3. Get Student ID
            print(f"[*] Looking up student for User ID: {user_id}...")
            result = await db.execute(select(Student).where(Student.user_id == user_id))
            student = result.scalar_one_or_none()
            
            if not student:
                print(f"Error: No student found for User ID {user_id}")
                return
            
            student_id = student.student_id
            print(f"[+] Found Student ID: {student_id}")

            # 4. Clear PostgreSQL Data
            print(f"[*] Clearing PostgreSQL enrollment and progress for course {course_id}...")
            
            result = await db.execute(
                select(Enrollment).where(
                    Enrollment.student_id == student_id,
                    Enrollment.course_id == course_id
                )
            )
            enrollment = result.scalar_one_or_none()
            
            if enrollment:
                eid = enrollment.enrollment_id
                # Delete related progress records
                await db.execute(delete(QuizAttempt).where(QuizAttempt.enrollment_id == eid))
                await db.execute(delete(LessonProgress).where(LessonProgress.enrollment_id == eid))
                await db.execute(delete(Enrollment).where(Enrollment.enrollment_id == eid))
                await db.commit()
                print("[+] PostgreSQL data cleared successfully.")
            else:
                print("[!] No active enrollment found in PostgreSQL.")

            # 5. Clear MongoDB Data
            print(f"[*] Clearing MongoDB tracking data for Student {student_id} / Course {course_id}...")
            
            query = {"student_id": student_id, "course_id": course_id}
            
            lp_result = await mongo_db["learning_progress"].delete_many(query)
            xapi_result = await mongo_db["xapi_statements"].delete_many(query)
            flash_result = await mongo_db["flashcard_progress"].delete_many(query)
            
            print(f"[+] MongoDB: Deleted {lp_result.deleted_count} learning progress records.")
            print(f"[+] MongoDB: Deleted {xapi_result.deleted_count} xAPI statements.")
            print(f"[+] MongoDB: Deleted {flash_result.deleted_count} flashcard progress records.")

            print("\n[SUCCESS] Tracking data cleared and user unenrolled perfectly.")
            
        except Exception as e:
            print(f"\n[ERROR] An unexpected error occurred: {e}")
            await db.rollback()
        finally:
            mongo_client.close()

if __name__ == "__main__":
    asyncio.run(clear_tracking_and_unenroll())
