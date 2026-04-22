"""
SQL Course Patch — Add Missing Document Lessons
=================================================
Adds PPT slides, scripts, assignments, and QA documents as lessons
to the SQL Masterclass course. These files are already uploaded to GCS.

Usage:
    python -m scripts.patch_sql_course_docs
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from app.config import settings

engine = create_engine(settings.SYNC_DATABASE_URL, echo=False)

GCS_BASE = f"https://storage.googleapis.com/{settings.GCS_BUCKET_NAME}/courses/sql-masterclass"

def doc(mod_slug: str, filename: str) -> str:
    """Build GCS document URL for a module."""
    safe = "".join(c if c.isalnum() or c in (".", "-", "_") else "_" for c in filename)
    return f"{GCS_BASE}/{mod_slug}/documents/{safe}"

def assignment(filename: str) -> str:
    """Build GCS assignment URL."""
    safe = "".join(c if c.isalnum() or c in (".", "-", "_") else "_" for c in filename)
    return f"{GCS_BASE}/assignments/{safe}"


def patch():
    with engine.begin() as conn:
        print("[PATCH] Adding missing document lessons to SQL Masterclass...")

        # First, check max lesson_id to avoid conflicts
        result = conn.execute(text("SELECT MAX(lesson_id) FROM lessons"))
        max_id = result.scalar() or 58
        print(f"   Current max lesson_id: {max_id}")

        # Delete any previously patched doc lessons (idempotent re-run)
        conn.execute(text("DELETE FROM lessons WHERE lesson_id >= 59 AND lesson_id <= 75 AND module_id IN (10,11,12,13,14,15,16)"))

        next_id = 59

        # ══════════════════════════════════════════════════════════════
        # MODULE 10: Intro to RDBMS — add PPT + Script
        # ══════════════════════════════════════════════════════════════
        print("   [+] Module 10: Adding PPT slides + Script...")

        # Insert after existing lessons (order_index after quiz at 3)
        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  content_url, is_preview, is_mandatory) VALUES "
            "(:lid, 10, 'RDBMS Concepts — Presentation Slides', 'Slide deck covering data types, RDBMS architecture, and relational model fundamentals.', 'pdf', 4, 15, "
            "  :url, false, false)"
        ), {"lid": next_id, "url": doc("mod1-intro-rdbms", "Edited version.pptx")})
        next_id += 1

        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  content_url, is_preview, is_mandatory) VALUES "
            "(:lid, 10, 'Module 1 — Lecture Script', 'Detailed lecture script and notes for the RDBMS introduction module.', 'pdf', 5, 10, "
            "  :url, false, false)"
        ), {"lid": next_id, "url": doc("mod1-intro-rdbms", "Copy of SQL_MODULE _1_SCRIPT.docx")})
        next_id += 1

        # ══════════════════════════════════════════════════════════════
        # MODULE 11: Basics of SQL — add reference doc + script
        # ══════════════════════════════════════════════════════════════
        print("   [+] Module 11: Adding reference doc + Script...")

        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  content_url, is_preview, is_mandatory) VALUES "
            "(:lid, 11, 'SQL Basics — Reference Document', 'Comprehensive reference covering SQL syntax, DDL, DML, and DQL commands.', 'pdf', 7, 15, "
            "  :url, false, false)"
        ), {"lid": next_id, "url": doc("mod2-basics-sql", "2_Basics of SQL Rev v2 doc.docx")})
        next_id += 1

        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  content_url, is_preview, is_mandatory) VALUES "
            "(:lid, 11, 'Module 2 — Lecture Script', 'Lecture script with SQL examples and explanations for the basics module.', 'pdf', 8, 10, "
            "  :url, false, false)"
        ), {"lid": next_id, "url": doc("mod2-basics-sql", "Script.docx")})
        next_id += 1

        # ══════════════════════════════════════════════════════════════
        # MODULE 12: Advanced Queries — add PPT + Assignment + QAs
        # ══════════════════════════════════════════════════════════════
        print("   [+] Module 12: Adding PPT + Assignment + QAs...")

        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  content_url, is_preview, is_mandatory) VALUES "
            "(:lid, 12, 'Advanced Queries — Presentation Slides', 'Slide deck covering SQL functions, operators, subqueries, and CTEs.', 'pdf', 5, 15, "
            "  :url, false, false)"
        ), {"lid": next_id, "url": doc("mod3-advanced-queries", "Advanced Queries ppt.pptx")})
        next_id += 1

        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  content_url, is_preview, is_mandatory) VALUES "
            "(:lid, 12, 'Practice Assignment — Advanced SQL Queries', 'Hands-on SQL practice questions to test your advanced query skills.', 'pdf', 6, 30, "
            "  :url, false, true)"
        ), {"lid": next_id, "url": doc("mod3-advanced-queries", "Module 3 - Assignment Ques.docx")})
        next_id += 1

        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  content_url, is_preview, is_mandatory) VALUES "
            "(:lid, 12, 'Q&A Reference — Advanced Queries', 'Common questions and detailed answers for advanced SQL topics.', 'pdf', 7, 15, "
            "  :url, false, false)"
        ), {"lid": next_id, "url": doc("mod3-advanced-queries", "Module 3 - QAs.docx")})
        next_id += 1

        # Extra assignment also belongs to Module 12 (Advanced Queries)
        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  content_url, is_preview, is_mandatory) VALUES "
            "(:lid, 12, 'Extra Practice — SQL Questions', 'Additional SQL practice questions for self-assessment.', 'pdf', 8, 20, "
            "  :url, false, false)"
        ), {"lid": next_id, "url": assignment("Module3_SQL Practise Questions.docx")})
        next_id += 1

        # ══════════════════════════════════════════════════════════════
        # MODULE 14: Relational Database — add 2 PPTs
        # ══════════════════════════════════════════════════════════════
        print("   [+] Module 14: Adding PPT slides...")

        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  content_url, is_preview, is_mandatory) VALUES "
            "(:lid, 14, 'Relational Database — Presentation Slides', 'Slide deck on relational algebra, normalization, ER diagrams, and schema design.', 'pdf', 3, 15, "
            "  :url, false, false)"
        ), {"lid": next_id, "url": doc("mod5-relational-database", "5_Relational database_PPT  V2.pptx")})
        next_id += 1

        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  content_url, is_preview, is_mandatory) VALUES "
            "(:lid, 14, 'PostgreSQL & Redshift — Slide Reference', 'Presentation slides covering PostgreSQL internals and Amazon Redshift architecture.', 'pdf', 4, 15, "
            "  :url, false, false)"
        ), {"lid": next_id, "url": doc("mod5-relational-database", "Module5_postgres_redshift.pptx")})
        next_id += 1

        # ══════════════════════════════════════════════════════════════
        # MODULE 15: Indexes & Transactions — add PPT + reference doc
        # (PDF script already exists as lesson 57)
        # ══════════════════════════════════════════════════════════════
        print("   [+] Module 15: Adding PPT + reference doc...")

        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  content_url, is_preview, is_mandatory) VALUES "
            "(:lid, 15, 'Indexes, Transactions & More — Presentation Slides', 'Slide deck covering B-Tree indexes, ACID transactions, constraints, triggers, views, and authorization.', 'pdf', 3, 15, "
            "  :url, false, false)"
        ), {"lid": next_id, "url": doc("mod6-indexes-transactions", "Indexes,Transaction,Constraints,Triggers,Views and Authorization PPT V2.pptx")})
        next_id += 1

        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  content_url, is_preview, is_mandatory) VALUES "
            "(:lid, 15, 'Indexes & Transactions — Reference Document', 'Detailed written reference for indexes, transaction isolation levels, constraints, and views.', 'pdf', 4, 15, "
            "  :url, false, false)"
        ), {"lid": next_id, "url": doc("mod6-indexes-transactions", "Indexes,Transaction,Constraints,Triggers,Views and Authorization doc v2.docx")})
        next_id += 1

        # ══════════════════════════════════════════════════════════════
        # MODULE 16: NoSQL — add PPT
        # (text lesson already exists as lesson 58)
        # ══════════════════════════════════════════════════════════════
        print("   [+] Module 16: Adding PPT slides...")

        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  content_url, is_preview, is_mandatory) VALUES "
            "(:lid, 16, 'NoSQL — Presentation Slides', 'Slide deck covering NoSQL database types, CAP theorem, and SQL vs NoSQL comparison.', 'pdf', 2, 15, "
            "  :url, false, false)"
        ), {"lid": next_id, "url": doc("mod7-nosql", "NoSQL PPT.pptx")})
        next_id += 1

        # ══════════════════════════════════════════════════════════════
        # UPDATE COURSE TOTAL LESSONS
        # ══════════════════════════════════════════════════════════════
        total_added = next_id - 59
        print(f"\n   [+] Updating course total_lessons (+{total_added})...")

        conn.execute(text(
            "UPDATE courses SET total_lessons = ("
            "  SELECT COUNT(*) FROM lessons l JOIN modules m ON m.module_id = l.module_id WHERE m.course_id = 4"
            ") WHERE course_id = 4"
        ))

        # Get final count
        result = conn.execute(text(
            "SELECT total_lessons FROM courses WHERE course_id = 4"
        ))
        new_total = result.scalar()

        print()
        print("=" * 60)
        print(f"[DONE] Added {total_added} document lessons to SQL Masterclass")
        print(f"   New total_lessons: {new_total}")
        print()
        print("   Lessons added:")
        print("   Mod 10 (RDBMS):      +2 (PPT slides, Lecture script)")
        print("   Mod 11 (SQL Basics):  +2 (Reference doc, Lecture script)")
        print("   Mod 12 (Advanced):    +4 (PPT slides, Assignment, QAs, Extra practice)")
        print("   Mod 14 (Relational):  +2 (PPT slides, PostgreSQL/Redshift slides)")
        print("   Mod 15 (Indexes):     +2 (PPT slides, Reference doc)")
        print("   Mod 16 (NoSQL):       +1 (PPT slides)")
        print("=" * 60)


if __name__ == "__main__":
    patch()
