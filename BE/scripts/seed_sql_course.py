"""
SQL Course Seed Script
========================
Seeds Course 4: SQL Masterclass — From Basics to Advanced (FREE)
into the PostgreSQL database.

This script ADDS to the existing data (does not clear other courses).
Run AFTER upload_sql_course.py so that GCS URLs are live.

Usage:
    python -m scripts.seed_sql_course
"""

import sys
import os
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from app.config import settings

engine = create_engine(settings.SYNC_DATABASE_URL, echo=False)

# ── GCS base URL ──
GCS_BASE = f"https://storage.googleapis.com/{settings.GCS_BUCKET_NAME}/courses/sql-masterclass"

# ── Helper to build video URLs ──
def vid(mod_slug: str, filename: str) -> str:
    """Build GCS video URL for a module."""
    safe = "".join(c if c.isalnum() or c in (".", "-", "_") else "_" for c in filename)
    return f"{GCS_BASE}/{mod_slug}/videos/{safe}"

def mat(mod_slug: str, filename: str) -> str:
    """Build GCS material/document URL for a module."""
    safe = "".join(c if c.isalnum() or c in (".", "-", "_") else "_" for c in filename)
    return f"{GCS_BASE}/{mod_slug}/materials/{safe}"

def doc(mod_slug: str, filename: str) -> str:
    """Build GCS document URL for a module (PPT/DOCX files)."""
    safe = "".join(c if c.isalnum() or c in (".", "-", "_") else "_" for c in filename)
    return f"{GCS_BASE}/{mod_slug}/documents/{safe}"

def study_mat(filename: str) -> str:
    """Build GCS study material URL."""
    safe = "".join(c if c.isalnum() or c in (".", "-", "_") else "_" for c in filename)
    return f"{GCS_BASE}/study-materials/{safe}"

def assignment_url(filename: str) -> str:
    """Build GCS assignment URL."""
    safe = "".join(c if c.isalnum() or c in (".", "-", "_") else "_" for c in filename)
    return f"{GCS_BASE}/assignments/{safe}"


# ── NoSQL text content (Module 7 has no video, so we provide a text lesson) ──
NOSQL_TEXT = '''# Introduction to NoSQL Databases

## What is NoSQL?
NoSQL (Not Only SQL) databases are non-relational databases designed for specific data models with flexible schemas. They are optimized for large-scale data storage and high-performance queries.

## Types of NoSQL Databases

### 1. Document Stores
- **Examples**: MongoDB, CouchDB
- Store data as JSON/BSON documents
- Flexible schema, nested structures
- Great for: content management, user profiles, catalogs

### 2. Key-Value Stores
- **Examples**: Redis, DynamoDB, Memcached
- Simple key-value pairs
- Extremely fast reads/writes
- Great for: caching, session management, real-time analytics

### 3. Column-Family Stores
- **Examples**: Apache Cassandra, HBase
- Data organized by columns rather than rows
- Efficient for aggregation queries
- Great for: time-series data, IoT, logging

### 4. Graph Databases
- **Examples**: Neo4j, Amazon Neptune
- Nodes, edges, and properties
- Traversal-based queries
- Great for: social networks, recommendation engines, fraud detection

## SQL vs NoSQL Comparison

| Feature | SQL (RDBMS) | NoSQL |
|---------|-------------|-------|
| **Schema** | Fixed, predefined | Dynamic, flexible |
| **Scaling** | Vertical (scale-up) | Horizontal (scale-out) |
| **ACID** | Full ACID compliance | Eventual consistency (BASE) |
| **Joins** | Supported natively | Limited or none |
| **Best For** | Structured, relational data | Unstructured, high-volume data |

## CAP Theorem
In a distributed system, you can only guarantee two of three:
- **C**onsistency — Every read gets the most recent write
- **A**vailability — Every request gets a response
- **P**artition Tolerance — System works despite network failures

## When to Use NoSQL
- Rapidly changing or unstructured data
- Massive scale (millions of reads/writes per second)
- Geographic distribution required
- Schema flexibility needed during development
- Real-time analytics and caching

## Key Takeaways
- NoSQL is not a replacement for SQL — it is complementary
- Choose your database based on your data model and access patterns
- Many modern applications use polyglot persistence (SQL + NoSQL together)
'''


def seed():
    """Seed the SQL Masterclass course into the database."""
    with engine.begin() as conn:
        print("[SQL SEED] Adding SQL Masterclass course...")

        # ── 0. Check if course 4 already exists ──
        result = conn.execute(text("SELECT course_id FROM courses WHERE course_id = 4"))
        if result.fetchone():
            print("[WARN] Course 4 already exists. Clearing it first...")
            conn.execute(text("DELETE FROM course_skills WHERE course_id = 4"))
            conn.execute(text("DELETE FROM materials WHERE course_id = 4"))
            conn.execute(text("DELETE FROM flashcards WHERE deck_id IN (SELECT deck_id FROM flashcard_decks WHERE course_id = 4)"))
            conn.execute(text("DELETE FROM flashcard_decks WHERE course_id = 4"))
            conn.execute(text("""
                DELETE FROM quiz_questions WHERE quiz_id IN (
                    SELECT q.quiz_id FROM quizzes q
                    JOIN lessons l ON l.lesson_id = q.lesson_id
                    JOIN modules m ON m.module_id = l.module_id
                    WHERE m.course_id = 4
                )
            """))
            conn.execute(text("""
                DELETE FROM quizzes WHERE lesson_id IN (
                    SELECT l.lesson_id FROM lessons l
                    JOIN modules m ON m.module_id = l.module_id
                    WHERE m.course_id = 4
                )
            """))
            conn.execute(text("DELETE FROM lessons WHERE module_id IN (SELECT module_id FROM modules WHERE course_id = 4)"))
            conn.execute(text("DELETE FROM modules WHERE course_id = 4"))
            conn.execute(text("DELETE FROM enrollments WHERE course_id = 4"))
            conn.execute(text("DELETE FROM courses WHERE course_id = 4"))
            print("   Cleared existing course 4 data.")

        # ── 1. Category: Database ──
        print("   [+] Category: Database...")
        conn.execute(text(
            "INSERT INTO categories (name, slug, description, display_order, is_active) "
            "VALUES ('Database', 'database', 'Database management, SQL, and data storage technologies', 5, true) "
            "ON CONFLICT DO NOTHING"
        ))

        # ── 2. Skills ──
        print("   [+] Skills...")
        new_skills = [
            ("SQL", "sql", "Database"),
            ("PostgreSQL", "postgresql", "Database"),
            ("Database Design", "database-design", "Database"),
            ("NoSQL", "nosql", "Database"),
            ("Data Warehousing", "data-warehousing", "Database"),
        ]
        for name, slug, cat in new_skills:
            conn.execute(text(
                "INSERT INTO skills (name, slug, category, is_active) "
                "VALUES (:name, :slug, :cat, true) "
                "ON CONFLICT DO NOTHING"
            ), {"name": name, "slug": slug, "cat": cat})

        # ── 3. Course 4 ──
        print("   [+] Course: SQL Masterclass...")
        conn.execute(text(
            "INSERT INTO courses ("
            "  course_id, title, slug, description, short_description, "
            "  category_id, difficulty_level, instructor_id, "
            "  pricing_model, price, currency, "
            "  duration_hours, total_modules, total_lessons, "
            "  thumbnail_url, is_published, published_at, "
            "  total_enrollments, average_rating, total_reviews, "
            "  meta_title, meta_description"
            ") VALUES ("
            "  4, "
            "  'SQL Masterclass: From Basics to Advanced', "
            "  'sql-masterclass', "
            "  'A comprehensive SQL course covering RDBMS concepts, SQL fundamentals, advanced queries, OLAP/OLTP, relational database design, indexing, transactions, and NoSQL. Includes hands-on video lectures and practice assignments.', "
            "  'Master SQL from scratch — RDBMS, queries, joins, indexes, transactions, and NoSQL. Complete video course with 7 modules.', "
            "  (SELECT category_id FROM categories WHERE slug = 'database'), "
            "  'beginner', 1, "
            "  'free', 0, 'INR', "
            "  10.0, 7, 36, "
            "  'https://img.youtube.com/vi/HXV3zeQKqGY/maxresdefault.jpg', "
            "  true, NOW(), "
            "  0, 0, 0, "
            "  'SQL Masterclass | Complete SQL Course — Free', "
            "  'Learn SQL from basics to advanced. Covers RDBMS, queries, joins, OLAP, indexing, transactions, and NoSQL.'"
            ")"
        ))

        # ══════════════════════════════════════════════════════════════
        # MODULE 10: Introduction to RDBMS Concepts
        # ══════════════════════════════════════════════════════════════
        print("   [+] Module 10: Intro to RDBMS Concepts...")
        conn.execute(text(
            "INSERT INTO modules (module_id, course_id, title, description, order_index, duration_minutes, is_preview) VALUES "
            "(10, 4, 'Introduction to RDBMS Concepts', 'Understand data types, storage technologies, and the relational model.', 1, 60, true)"
        ))

        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  content_url, is_preview, is_mandatory) VALUES "
            "(36, 10, 'About Data and Its Types', 'What is data? Structured vs unstructured data, data types overview.', 'video', 1, 20, "
            "  :url, true, true)"
        ), {"url": vid("mod1-intro-rdbms", "1. About Data and Its types.mp4")})

        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  content_url, is_preview, is_mandatory) VALUES "
            "(37, 10, 'Storage Technologies', 'Disk storage, memory hierarchy, and how databases store data efficiently.', 'video', 2, 25, "
            "  :url, false, true)"
        ), {"url": vid("mod1-intro-rdbms", "16. Storage technologies.mp4")})

        # Quiz for Module 10
        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, is_preview, is_mandatory) VALUES "
            "(38, 10, 'RDBMS Concepts Quiz', 'Test your understanding of RDBMS fundamentals', 'quiz', 3, 10, false, true)"
        ))

        # Module 10 Documents
        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  content_url, is_preview, is_mandatory) VALUES "
            "(59, 10, 'RDBMS Concepts — Presentation Slides', 'Slide deck covering data types, RDBMS architecture, and relational model fundamentals.', 'pdf', 4, 15, "
            "  :url, false, false)"
        ), {"url": doc("mod1-intro-rdbms", "Edited version.pptx")})

        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  content_url, is_preview, is_mandatory) VALUES "
            "(60, 10, 'Module 1 — Lecture Script', 'Detailed lecture script and notes for the RDBMS introduction module.', 'pdf', 5, 10, "
            "  :url, false, false)"
        ), {"url": doc("mod1-intro-rdbms", "Copy of SQL_MODULE _1_SCRIPT.docx")})

        # ══════════════════════════════════════════════════════════════
        # MODULE 11: Basics of SQL
        # ══════════════════════════════════════════════════════════════
        print("   [+] Module 11: Basics of SQL...")
        conn.execute(text(
            "INSERT INTO modules (module_id, course_id, title, description, order_index, duration_minutes, is_preview) VALUES "
            "(11, 4, 'Basics of SQL', 'Learn SQL syntax, data types, DDL, DML, and basic querying with DQL.', 2, 120, false)"
        ))

        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  content_url, is_preview, is_mandatory) VALUES "
            "(39, 11, 'Role of SQL', 'Why SQL matters — history, standards, and modern usage.', 'video', 1, 18, "
            "  :url, false, true)"
        ), {"url": vid("mod2-basics-sql", "1. Role of SQL.mp4")})

        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  content_url, is_preview, is_mandatory) VALUES "
            "(40, 11, 'SQL Data Types — Part 1', 'Numeric types, character types, and date/time types.', 'video', 2, 22, "
            "  :url, false, true)"
        ), {"url": vid("mod2-basics-sql", "2. Datatype part 1.mp4")})

        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  content_url, is_preview, is_mandatory) VALUES "
            "(41, 11, 'SQL Data Types — Part 2', 'Boolean, binary, JSON, and special data types.', 'video', 3, 20, "
            "  :url, false, true)"
        ), {"url": vid("mod2-basics-sql", "3. Datatype part 2.mp4")})

        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  content_url, is_preview, is_mandatory) VALUES "
            "(42, 11, 'SQL Data Types — Part 3', 'User-defined types, type casting, and best practices.', 'video', 4, 20, "
            "  :url, false, true)"
        ), {"url": vid("mod2-basics-sql", "4. Data type part 3.mp4")})

        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  content_url, is_preview, is_mandatory) VALUES "
            "(43, 11, 'DQL — Data Query Language', 'SELECT statements, WHERE, ORDER BY, GROUP BY, HAVING, and LIMIT.', 'video', 5, 25, "
            "  :url, false, true)"
        ), {"url": vid("mod2-basics-sql", "9. DQL.mp4")})

        # Quiz for Module 11
        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, is_preview, is_mandatory) VALUES "
            "(44, 11, 'SQL Basics Quiz', 'Test your knowledge of SQL fundamentals', 'quiz', 6, 10, false, true)"
        ))

        # Module 11 Documents
        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  content_url, is_preview, is_mandatory) VALUES "
            "(61, 11, 'SQL Basics — Reference Document', 'Comprehensive reference covering SQL syntax, DDL, DML, and DQL commands.', 'pdf', 7, 15, "
            "  :url, false, false)"
        ), {"url": doc("mod2-basics-sql", "2_Basics of SQL Rev v2 doc.docx")})

        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  content_url, is_preview, is_mandatory) VALUES "
            "(62, 11, 'Module 2 — Lecture Script', 'Lecture script with SQL examples and explanations for the basics module.', 'pdf', 8, 10, "
            "  :url, false, false)"
        ), {"url": doc("mod2-basics-sql", "Script.docx")})

        # ══════════════════════════════════════════════════════════════
        # MODULE 12: Advanced Queries
        # ══════════════════════════════════════════════════════════════
        print("   [+] Module 12: Advanced Queries...")
        conn.execute(text(
            "INSERT INTO modules (module_id, course_id, title, description, order_index, duration_minutes, is_preview) VALUES "
            "(12, 4, 'Advanced SQL Queries', 'Master functions, operators, subqueries, and Common Table Expressions (CTEs).', 3, 90, false)"
        ))

        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  content_url, is_preview, is_mandatory) VALUES "
            "(45, 12, 'SQL Functions', 'Aggregate functions, string functions, date functions, and window functions.', 'video', 1, 25, "
            "  :url, false, true)"
        ), {"url": vid("mod3-advanced-queries", "1_Functions.mp4")})

        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  content_url, is_preview, is_mandatory) VALUES "
            "(46, 12, 'SQL Operators', 'Comparison, logical, arithmetic, BETWEEN, IN, LIKE, and set operators.', 'video', 2, 22, "
            "  :url, false, true)"
        ), {"url": vid("mod3-advanced-queries", "2_Operators.mp4")})

        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  content_url, is_preview, is_mandatory) VALUES "
            "(47, 12, 'Common Table Expressions (CTE)', 'WITH clause, recursive CTEs, and practical use cases.', 'video', 3, 28, "
            "  :url, false, true)"
        ), {"url": vid("mod3-advanced-queries", "6_CTE.mp4")})

        # Quiz for Module 12
        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, is_preview, is_mandatory) VALUES "
            "(48, 12, 'Advanced Queries Quiz', 'Test your knowledge of advanced SQL queries', 'quiz', 4, 10, false, true)"
        ))

        # Module 12 Documents
        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  content_url, is_preview, is_mandatory) VALUES "
            "(63, 12, 'Advanced Queries — Presentation Slides', 'Slide deck covering SQL functions, operators, subqueries, and CTEs.', 'pdf', 5, 15, "
            "  :url, false, false)"
        ), {"url": doc("mod3-advanced-queries", "Advanced Queries ppt.pptx")})

        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  content_url, is_preview, is_mandatory) VALUES "
            "(64, 12, 'Practice Assignment — Advanced SQL Queries', 'Hands-on SQL practice questions to test your advanced query skills.', 'pdf', 6, 30, "
            "  :url, false, true)"
        ), {"url": doc("mod3-advanced-queries", "Module 3 - Assignment Ques.docx")})

        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  content_url, is_preview, is_mandatory) VALUES "
            "(65, 12, 'Q&A Reference — Advanced Queries', 'Common questions and detailed answers for advanced SQL topics.', 'pdf', 7, 15, "
            "  :url, false, false)"
        ), {"url": doc("mod3-advanced-queries", "Module 3 - QAs.docx")})

        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  content_url, is_preview, is_mandatory) VALUES "
            "(66, 12, 'Extra Practice — SQL Questions', 'Additional SQL practice questions for self-assessment.', 'pdf', 8, 20, "
            "  :url, false, false)"
        ), {"url": assignment_url("Module3_SQL Practise Questions.docx")})

        # ══════════════════════════════════════════════════════════════
        # MODULE 13: OLAP, OLTP and Recursion
        # ══════════════════════════════════════════════════════════════
        print("   [+] Module 13: OLAP, OLTP & Recursion...")
        conn.execute(text(
            "INSERT INTO modules (module_id, course_id, title, description, order_index, duration_minutes, is_preview) VALUES "
            "(13, 4, 'OLAP, OLTP and Recursion', 'Data warehousing concepts, OLAP vs OLTP, data cubes, and recursive queries.', 4, 100, false)"
        ))

        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  content_url, is_preview, is_mandatory) VALUES "
            "(49, 13, 'Data Warehousing', 'What is a data warehouse? Star schema, snowflake schema, ETL pipelines.', 'video', 1, 20, "
            "  :url, false, true)"
        ), {"url": vid("mod4-olap-oltp-recursion", "1. Data_Warehousing.mp4")})

        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  content_url, is_preview, is_mandatory) VALUES "
            "(50, 13, 'Data Cube', 'Multi-dimensional data representation and OLAP cubes.', 'video', 2, 18, "
            "  :url, false, true)"
        ), {"url": vid("mod4-olap-oltp-recursion", "2_Data_Cube.mp4")})

        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  content_url, is_preview, is_mandatory) VALUES "
            "(51, 13, 'OLAP vs OLTP', 'Online Analytical Processing vs Online Transaction Processing — differences and use cases.', 'video', 3, 20, "
            "  :url, false, true)"
        ), {"url": vid("mod4-olap-oltp-recursion", "3.OLAP_OLTP.mp4")})

        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  content_url, is_preview, is_mandatory) VALUES "
            "(52, 13, 'CUBE and ROLLUP Operators', 'SQL GROUP BY extensions — CUBE, ROLLUP, and GROUPING SETS.', 'video', 4, 22, "
            "  :url, false, true)"
        ), {"url": vid("mod4-olap-oltp-recursion", "4. Operators_Cube_Rollup.mp4")})

        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  content_url, is_preview, is_mandatory) VALUES "
            "(53, 13, 'Recursive CTE', 'Recursive common table expressions for hierarchical and graph data.', 'video', 5, 20, "
            "  :url, false, true)"
        ), {"url": vid("mod4-olap-oltp-recursion", "5. Recursive_CTE.mp4")})

        # ══════════════════════════════════════════════════════════════
        # MODULE 14: Relational Database
        # ══════════════════════════════════════════════════════════════
        print("   [+] Module 14: Relational Database...")
        conn.execute(text(
            "INSERT INTO modules (module_id, course_id, title, description, order_index, duration_minutes, is_preview) VALUES "
            "(14, 4, 'Relational Database Systems', 'Hands-on with PostgreSQL and Amazon Redshift.', 5, 60, false)"
        ))

        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  content_url, is_preview, is_mandatory) VALUES "
            "(54, 14, 'PostgreSQL Deep Dive', 'PostgreSQL architecture, psql CLI, extensions, and best practices.', 'video', 1, 25, "
            "  :url, false, true)"
        ), {"url": vid("mod5-relational-database", "Postgres_2.mp4")})

        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  content_url, is_preview, is_mandatory) VALUES "
            "(55, 14, 'Amazon Redshift', 'Cloud data warehousing with Redshift — architecture, loading data, and querying.', 'video', 2, 25, "
            "  :url, false, true)"
        ), {"url": vid("mod5-relational-database", "Redshift.mp4")})

        # Module 14 Documents
        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  content_url, is_preview, is_mandatory) VALUES "
            "(67, 14, 'Relational Database — Presentation Slides', 'Slide deck on relational algebra, normalization, ER diagrams, and schema design.', 'pdf', 3, 15, "
            "  :url, false, false)"
        ), {"url": doc("mod5-relational-database", "5_Relational database_PPT  V2.pptx")})

        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  content_url, is_preview, is_mandatory) VALUES "
            "(68, 14, 'PostgreSQL & Redshift — Slide Reference', 'Presentation slides covering PostgreSQL internals and Amazon Redshift architecture.', 'pdf', 4, 15, "
            "  :url, false, false)"
        ), {"url": doc("mod5-relational-database", "Module5_postgres_redshift.pptx")})

        # ══════════════════════════════════════════════════════════════
        # MODULE 15: Indexes, Transactions, Constraints, Triggers, Views
        # ══════════════════════════════════════════════════════════════
        print("   [+] Module 15: Indexes, Transactions & More...")
        conn.execute(text(
            "INSERT INTO modules (module_id, course_id, title, description, order_index, duration_minutes, is_preview) VALUES "
            "(15, 4, 'Indexes, Transactions, Constraints, Triggers & Views', 'Database performance tuning, ACID properties, data integrity, and advanced database objects.', 6, 70, false)"
        ))

        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  content_url, is_preview, is_mandatory) VALUES "
            "(56, 15, 'Indexes and Transactions', 'B-Tree indexes, composite indexes, ACID transactions, isolation levels.', 'video', 1, 30, "
            "  :url, false, true)"
        ), {"url": vid("mod6-indexes-transactions", "Index and transactions.mp4")})

        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  content_url, is_preview, is_mandatory) VALUES "
            "(57, 15, 'Module 6 Script Reference (PDF)', 'Comprehensive reference script covering constraints, triggers, views, and authorization.', 'pdf', 2, 20, "
            "  :url, false, true)"
        ), {"url": mat("mod6-indexes-transactions", "MODULE_6_SCRIPT.pdf")})

        # Module 15 Documents
        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  content_url, is_preview, is_mandatory) VALUES "
            "(69, 15, 'Indexes, Transactions & More — Presentation Slides', 'Slide deck covering B-Tree indexes, ACID transactions, constraints, triggers, views, and authorization.', 'pdf', 3, 15, "
            "  :url, false, false)"
        ), {"url": doc("mod6-indexes-transactions", "Indexes,Transaction,Constraints,Triggers,Views and Authorization PPT V2.pptx")})

        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  content_url, is_preview, is_mandatory) VALUES "
            "(70, 15, 'Indexes & Transactions — Reference Document', 'Detailed written reference for indexes, transaction isolation levels, constraints, and views.', 'pdf', 4, 15, "
            "  :url, false, false)"
        ), {"url": doc("mod6-indexes-transactions", "Indexes,Transaction,Constraints,Triggers,Views and Authorization doc v2.docx")})

        # ══════════════════════════════════════════════════════════════
        # MODULE 16: NoSQL
        # ══════════════════════════════════════════════════════════════
        print("   [+] Module 16: NoSQL...")
        conn.execute(text(
            "INSERT INTO modules (module_id, course_id, title, description, order_index, duration_minutes, is_preview) VALUES "
            "(16, 4, 'Introduction to NoSQL', 'Understand NoSQL databases — document stores, key-value, column-family, and graph databases.', 7, 30, false)"
        ))

        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  text_content, is_preview, is_mandatory) VALUES "
            "(58, 16, 'NoSQL Concepts', 'Types of NoSQL databases, CAP theorem, SQL vs NoSQL comparison.', 'text', 1, 25, "
            "  :text_content, false, true)"
        ), {"text_content": NOSQL_TEXT})

        # Module 16 Documents
        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  content_url, is_preview, is_mandatory) VALUES "
            "(71, 16, 'NoSQL — Presentation Slides', 'Slide deck covering NoSQL database types, CAP theorem, and SQL vs NoSQL comparison.', 'pdf', 2, 15, "
            "  :url, false, false)"
        ), {"url": doc("mod7-nosql", "NoSQL PPT.pptx")})

        # ══════════════════════════════════════════════════════════════
        # QUIZZES
        # ══════════════════════════════════════════════════════════════
        print("   [+] Quizzes...")

        # Quiz 4: RDBMS Concepts (lesson 38)
        conn.execute(text(
            "INSERT INTO quizzes (quiz_id, lesson_id, title, description, instructions, pass_percentage, time_limit_minutes, max_attempts, total_questions) VALUES "
            "(4, 38, 'RDBMS Concepts Quiz', 'Test your understanding of relational database concepts', "
            "'Choose the best answer for each question. You need 70%% to pass.', 70.00, 10, 3, 5)"
        ))

        q4_1 = json.dumps([
            {"text": "Relational Database Management System", "is_correct": True},
            {"text": "Rapid Database Migration System", "is_correct": False},
            {"text": "Remote Data Backup Service", "is_correct": False},
            {"text": "Redundant Database Monitoring System", "is_correct": False},
        ])
        q4_2 = json.dumps([
            {"text": "True", "is_correct": True},
            {"text": "False", "is_correct": False},
        ])
        q4_3 = json.dumps([
            {"text": "Row", "is_correct": False},
            {"text": "Column", "is_correct": False},
            {"text": "Primary Key", "is_correct": True},
            {"text": "Index", "is_correct": False},
        ])
        q4_4 = json.dumps([
            {"text": "To store images", "is_correct": False},
            {"text": "To uniquely identify each record in a table", "is_correct": True},
            {"text": "To create relationships between tables", "is_correct": False},
            {"text": "To encrypt sensitive data", "is_correct": False},
        ])
        q4_5 = json.dumps([
            {"text": "Hierarchical Model", "is_correct": False},
            {"text": "Network Model", "is_correct": False},
            {"text": "Relational Model", "is_correct": True},
            {"text": "Object Model", "is_correct": False},
        ])

        conn.execute(text(
            "INSERT INTO quiz_questions (question_id, quiz_id, question_text, question_type, options, correct_answer, explanation, points, order_index) VALUES "
            "(14, 4, 'What does RDBMS stand for?', 'multiple_choice', :q1, 'Relational Database Management System', 'RDBMS stands for Relational Database Management System.', 1, 1), "
            "(15, 4, 'Data in an RDBMS is stored in tables with rows and columns.', 'true_false', :q2, 'True', 'RDBMS organizes data into tables (relations) with rows (tuples) and columns (attributes).', 1, 2), "
            "(16, 4, 'Which ensures each row in a table is unique?', 'multiple_choice', :q3, 'Primary Key', 'A primary key uniquely identifies each record in a table.', 1, 3), "
            "(17, 4, 'What is the purpose of a primary key?', 'multiple_choice', :q4, 'To uniquely identify each record in a table', 'Primary keys ensure each row can be uniquely identified and referenced.', 1, 4), "
            "(18, 4, 'Which data model does SQL use?', 'multiple_choice', :q5, 'Relational Model', 'SQL is designed for the relational data model proposed by E.F. Codd.', 1, 5)"
        ), {"q1": q4_1, "q2": q4_2, "q3": q4_3, "q4": q4_4, "q5": q4_5})

        # Quiz 5: SQL Basics (lesson 44)
        conn.execute(text(
            "INSERT INTO quizzes (quiz_id, lesson_id, title, description, instructions, pass_percentage, time_limit_minutes, max_attempts, total_questions) VALUES "
            "(5, 44, 'SQL Basics Quiz', 'Test your knowledge of SQL fundamentals', "
            "'Choose the best answer for each question. You need 70%% to pass.', 70.00, 10, 3, 5)"
        ))

        q5_1 = json.dumps([
            {"text": "SELECT", "is_correct": True},
            {"text": "FETCH", "is_correct": False},
            {"text": "GET", "is_correct": False},
            {"text": "RETRIEVE", "is_correct": False},
        ])
        q5_2 = json.dumps([
            {"text": "DDL", "is_correct": False},
            {"text": "DML", "is_correct": False},
            {"text": "DQL", "is_correct": True},
            {"text": "DCL", "is_correct": False},
        ])
        q5_3 = json.dumps([
            {"text": "True", "is_correct": False},
            {"text": "False", "is_correct": True},
        ])
        q5_4 = json.dumps([
            {"text": "ORDER BY", "is_correct": False},
            {"text": "SORT BY", "is_correct": False},
            {"text": "GROUP BY", "is_correct": True},
            {"text": "ARRANGE BY", "is_correct": False},
        ])
        q5_5 = json.dumps([
            {"text": "VARCHAR", "is_correct": False},
            {"text": "INTEGER", "is_correct": False},
            {"text": "BOOLEAN", "is_correct": False},
            {"text": "ARRAY", "is_correct": True},
        ])

        conn.execute(text(
            "INSERT INTO quiz_questions (question_id, quiz_id, question_text, question_type, options, correct_answer, explanation, points, order_index) VALUES "
            "(19, 5, 'Which SQL keyword is used to retrieve data from a database?', 'multiple_choice', :q1, 'SELECT', 'SELECT is the primary DQL command for retrieving data.', 1, 1), "
            "(20, 5, 'SELECT belongs to which SQL sub-language?', 'multiple_choice', :q2, 'DQL', 'DQL (Data Query Language) includes SELECT for data retrieval.', 1, 2), "
            "(21, 5, 'DELETE is a DDL command.', 'true_false', :q3, 'False', 'DELETE is a DML (Data Manipulation Language) command. DROP is DDL.', 1, 3), "
            "(22, 5, 'Which clause is used to group rows that share a common value?', 'multiple_choice', :q4, 'GROUP BY', 'GROUP BY groups rows that share values in specified columns.', 1, 4), "
            "(23, 5, 'Which is NOT a standard SQL data type?', 'multiple_choice', :q5, 'ARRAY', 'ARRAY is a PostgreSQL-specific type, not in standard SQL.', 1, 5)"
        ), {"q1": q5_1, "q2": q5_2, "q3": q5_3, "q4": q5_4, "q5": q5_5})

        # Quiz 6: Advanced Queries (lesson 48)
        conn.execute(text(
            "INSERT INTO quizzes (quiz_id, lesson_id, title, description, instructions, pass_percentage, time_limit_minutes, max_attempts, total_questions) VALUES "
            "(6, 48, 'Advanced SQL Queries Quiz', 'Test your knowledge of advanced SQL queries', "
            "'Choose the best answer for each question. You need 70%% to pass.', 70.00, 12, 3, 5)"
        ))

        q6_1 = json.dumps([
            {"text": "COUNT()", "is_correct": False},
            {"text": "ROW_NUMBER()", "is_correct": True},
            {"text": "SUM()", "is_correct": False},
            {"text": "AVG()", "is_correct": False},
        ])
        q6_2 = json.dumps([
            {"text": "True", "is_correct": True},
            {"text": "False", "is_correct": False},
        ])
        q6_3 = json.dumps([
            {"text": "UNION", "is_correct": False},
            {"text": "JOIN", "is_correct": False},
            {"text": "WITH", "is_correct": True},
            {"text": "FROM", "is_correct": False},
        ])
        q6_4 = json.dumps([
            {"text": "WHERE", "is_correct": False},
            {"text": "HAVING", "is_correct": True},
            {"text": "FILTER", "is_correct": False},
            {"text": "CONDITION", "is_correct": False},
        ])
        q6_5 = json.dumps([
            {"text": "Combines results of two queries removing duplicates", "is_correct": True},
            {"text": "Joins two tables on a common column", "is_correct": False},
            {"text": "Creates a temporary table", "is_correct": False},
            {"text": "Groups results by column", "is_correct": False},
        ])

        conn.execute(text(
            "INSERT INTO quiz_questions (question_id, quiz_id, question_text, question_type, options, correct_answer, explanation, points, order_index) VALUES "
            "(24, 6, 'Which is a window function in SQL?', 'multiple_choice', :q1, 'ROW_NUMBER()', 'ROW_NUMBER() is a window function that assigns sequential numbers.', 1, 1), "
            "(25, 6, 'A CTE can reference itself in a recursive query.', 'true_false', :q2, 'True', 'Recursive CTEs reference themselves using WITH RECURSIVE.', 1, 2), "
            "(26, 6, 'Which keyword defines a Common Table Expression?', 'multiple_choice', :q3, 'WITH', 'CTEs are defined with the WITH clause before the main query.', 1, 3), "
            "(27, 6, 'Which clause filters groups after GROUP BY?', 'multiple_choice', :q4, 'HAVING', 'HAVING filters aggregated groups, WHERE filters rows before grouping.', 1, 4), "
            "(28, 6, 'What does the UNION operator do?', 'multiple_choice', :q5, 'Combines results of two queries removing duplicates', 'UNION combines result sets and removes duplicates. UNION ALL keeps them.', 1, 5)"
        ), {"q1": q6_1, "q2": q6_2, "q3": q6_3, "q4": q6_4, "q5": q6_5})

        # ══════════════════════════════════════════════════════════════
        # COURSE SKILLS
        # ══════════════════════════════════════════════════════════════
        print("   [+] Course-Skill associations...")
        conn.execute(text(
            "INSERT INTO course_skills (course_id, skill_id, is_primary) VALUES "
            "(4, (SELECT skill_id FROM skills WHERE slug = 'sql'), true), "
            "(4, (SELECT skill_id FROM skills WHERE slug = 'postgresql'), false), "
            "(4, (SELECT skill_id FROM skills WHERE slug = 'database-design'), false), "
            "(4, (SELECT skill_id FROM skills WHERE slug = 'nosql'), false), "
            "(4, (SELECT skill_id FROM skills WHERE slug = 'data-warehousing'), false) "
            "ON CONFLICT DO NOTHING"
        ))

        # ══════════════════════════════════════════════════════════════
        # MATERIALS (study materials for each module)
        # ══════════════════════════════════════════════════════════════
        print("   [+] Study Materials...")
        study_materials = [
            (5, "Module 1 Study Material — RDBMS Concepts", "Comprehensive study material for RDBMS introduction", "Module 1 - Study Material.docx"),
            (6, "Module 2 Study Material — SQL Basics", "Study guide covering SQL fundamentals and syntax", "Module 2 - Study Material.docx"),
            (7, "Module 3 Study Material — Advanced Queries", "Reference material for advanced SQL queries", "Module 3 - Study Module.docx"),
            (8, "Module 4 Study Material — OLAP & OLTP", "Study guide for data warehousing and OLAP concepts", "Module 4 - Study Material.docx"),
            (9, "Module 5 Study Material — Relational Database", "Study material on relational database systems", "Module 5 - Study Material.docx"),
            (10, "Module 6 Study Material — Indexes & Transactions", "Reference for indexes, transactions, constraints, triggers, views", "Module 6 - Study Material.docx"),
            (11, "Module 7 Study Material — NoSQL", "Study guide for NoSQL database concepts", "Module 7 - Study Material.docx"),
        ]

        for mat_id, title, desc, filename in study_materials:
            conn.execute(text(
                "INSERT INTO materials (material_id, title, description, course_id, file_type, file_url, file_size_bytes, pricing_model, is_published) VALUES "
                "(:mid, :title, :desc, 4, 'DOCX', :url, 2000000, 'free', true) "
                "ON CONFLICT DO NOTHING"
            ), {"mid": mat_id, "title": title, "desc": desc, "url": study_mat(filename)})

        # ══════════════════════════════════════════════════════════════
        # FLASHCARD DECK
        # ══════════════════════════════════════════════════════════════
        print("   [+] Flashcard deck...")
        conn.execute(text(
            "INSERT INTO flashcard_decks (deck_id, course_id, title, description, total_cards) VALUES "
            "(3, 4, 'SQL Key Concepts', 'Essential SQL and database terminology for quick revision', 10) "
            "ON CONFLICT DO NOTHING"
        ))

        conn.execute(text(
            "INSERT INTO flashcards (flashcard_id, deck_id, front_content, back_content, order_index) VALUES "
            "(13, 3, 'What is a Primary Key?', 'A column (or set of columns) that uniquely identifies each row in a table. Cannot be NULL and must be unique.', 1), "
            "(14, 3, 'What is a Foreign Key?', 'A column that references the primary key of another table, establishing a relationship between two tables.', 2), "
            "(15, 3, 'What is Normalization?', 'The process of organizing data to reduce redundancy. Common forms: 1NF (atomic values), 2NF (no partial dependencies), 3NF (no transitive dependencies).', 3), "
            "(16, 3, 'What are ACID properties?', 'Atomicity (all or nothing), Consistency (valid state), Isolation (concurrent transactions don''t interfere), Durability (committed data persists).', 4), "
            "(17, 3, 'Difference between WHERE and HAVING?', 'WHERE filters rows before grouping. HAVING filters groups after GROUP BY aggregation.', 5), "
            "(18, 3, 'What is a JOIN?', 'Combines rows from two or more tables based on a related column. Types: INNER, LEFT, RIGHT, FULL OUTER, CROSS.', 6), "
            "(19, 3, 'What is an Index?', 'A database structure that speeds up data retrieval. Like a book index — avoids full table scans. Trade-off: faster reads, slower writes.', 7), "
            "(20, 3, 'What is a CTE?', 'Common Table Expression — a temporary named result set defined with WITH clause. Improves readability of complex queries. Can be recursive.', 8), "
            "(21, 3, 'OLAP vs OLTP?', 'OLTP: fast transactions, row-oriented (PostgreSQL, MySQL). OLAP: complex analytics, column-oriented (Redshift, BigQuery). Different optimization goals.', 9), "
            "(22, 3, 'What is a View?', 'A virtual table based on a SELECT query. Does not store data itself. Used for security (restrict columns), simplicity, and reusability.', 10) "
            "ON CONFLICT DO NOTHING"
        ))

        print()
        print("=" * 60)
        print("[DONE] SQL Masterclass course seeded successfully!")
        print("   Course 4: SQL Masterclass — From Basics to Advanced (FREE)")
        print("   7 modules, 36 lessons:")
        print("     18 video (GCS MP4) + 1 PDF + 1 text + 3 quiz")
        print("     + 13 document lessons (7 PPT slides, 4 DOCX refs, 2 scripts)")
        print("   3 quizzes (15 questions total)")
        print("   5 course skills (SQL, PostgreSQL, Database Design, NoSQL, Data Warehousing)")
        print("   7 study materials (downloadable DOCX)")
        print("   1 flashcard deck (10 cards)")
        print("=" * 60)


if __name__ == "__main__":
    seed()
