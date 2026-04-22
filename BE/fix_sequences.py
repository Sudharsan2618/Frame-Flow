"""Reset PostgreSQL primary-key sequences to max(id)+1 for tables with out-of-sync serials."""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.config import settings

TABLES = [
    ("modules", "module_id"),
    ("lessons", "lesson_id"),
    ("courses", "course_id"),
    ("quizzes", "quiz_id"),
    ("quiz_questions", "question_id"),
    ("flashcard_decks", "deck_id"),
    ("flashcards", "flashcard_id"),
    ("categories", "category_id"),
    ("skills", "skill_id"),
    ("instructors", "instructor_id"),
]

async def main():
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.begin() as conn:
        for table, pk in TABLES:
            seq_name_row = await conn.execute(text(
                f"SELECT pg_get_serial_sequence('{table}', '{pk}')"
            ))
            seq = seq_name_row.scalar()
            if not seq:
                print(f"  SKIP {table}.{pk} — no sequence found")
                continue
            max_row = await conn.execute(text(f"SELECT COALESCE(MAX({pk}), 0) FROM {table}"))
            max_val = max_row.scalar()
            await conn.execute(text(f"SELECT setval('{seq}', :v, true)"), {"v": max(max_val, 1)})
            print(f"  OK   {table}.{pk} sequence '{seq}' → {max_val}")
    await engine.dispose()
    print("\nDone. All sequences reset.")

if __name__ == "__main__":
    asyncio.run(main())
