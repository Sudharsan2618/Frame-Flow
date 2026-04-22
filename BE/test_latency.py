"""
API & Database Latency Diagnostic Script
Tests: DB connections, key API endpoints, and identifies bottlenecks.
"""

import asyncio
import time
import aiohttp
import asyncpg
from motor.motor_asyncio import AsyncIOMotorClient
import os
import sys
from dotenv import load_dotenv

# Fix Windows encoding
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()

BASE_URL = "http://localhost:8080/api/v1"


def fmt_ms(ms):
    if ms < 200: return f"{ms:.0f}ms [OK]"
    if ms < 500: return f"{ms:.0f}ms [SLOW]"
    return f"{ms:.0f}ms [CRITICAL]"


async def test_postgres_latency():
    print("\n=== PostgreSQL (Render Singapore) ===")
    host = os.getenv("POSTGRES_HOST")
    port = int(os.getenv("POSTGRES_PORT", 5432))
    user = os.getenv("POSTGRES_USER")
    password = os.getenv("POSTGRES_PASSWORD")
    db = os.getenv("POSTGRES_DB")

    dsn = f"postgresql://{user}:{password}@{host}:{port}/{db}"
    
    # Test 1: Connection time
    t0 = time.perf_counter()
    try:
        conn = await asyncpg.connect(dsn, timeout=15, ssl="require")
        conn_time = (time.perf_counter() - t0) * 1000
        print(f"  Connection:       {fmt_ms(conn_time)}")
    except Exception as e:
        print(f"  Connection FAILED: {e}")
        return

    # Test 2: Simple SELECT 1
    t0 = time.perf_counter()
    await conn.fetchval("SELECT 1")
    ping_time = (time.perf_counter() - t0) * 1000
    print(f"  SELECT 1 (ping):  {fmt_ms(ping_time)}")

    # Test 3: Count query on users
    t0 = time.perf_counter()
    count = await conn.fetchval("SELECT COUNT(*) FROM users")
    query_time = (time.perf_counter() - t0) * 1000
    print(f"  COUNT users:      {fmt_ms(query_time)} ({count} rows)")

    # Test 4: Courses join query
    t0 = time.perf_counter()
    rows = await conn.fetch("""
        SELECT c.course_id, c.title, COUNT(m.module_id) as modules
        FROM courses c 
        LEFT JOIN modules m ON c.course_id = m.course_id
        GROUP BY c.course_id, c.title
        LIMIT 10
    """)
    join_time = (time.perf_counter() - t0) * 1000
    print(f"  Courses+Modules:  {fmt_ms(join_time)} ({len(rows)} rows)")

    # Test 5: Full course detail (simulates loading player page)
    t0 = time.perf_counter()
    rows = await conn.fetch("""
        SELECT c.course_id, c.title, m.module_id, m.title as mod_title,
               l.lesson_id, l.title as lesson_title, l.content_type
        FROM courses c
        JOIN modules m ON c.course_id = m.course_id
        JOIN lessons l ON m.module_id = l.module_id
        LIMIT 50
    """)
    detail_time = (time.perf_counter() - t0) * 1000
    print(f"  Full course data: {fmt_ms(detail_time)} ({len(rows)} rows)")

    # Test 6: N+1 simulation (5 sequential round-trips)
    t0 = time.perf_counter()
    for _ in range(5):
        await conn.fetchval("SELECT 1")
    sequential_time = (time.perf_counter() - t0) * 1000
    print(f"  5x sequential:    {fmt_ms(sequential_time)} ({sequential_time/5:.0f}ms avg per round-trip)")

    # Test 7: 10 sequential
    t0 = time.perf_counter()
    for _ in range(10):
        await conn.fetchval("SELECT 1")
    sequential_time_10 = (time.perf_counter() - t0) * 1000
    print(f"  10x sequential:   {fmt_ms(sequential_time_10)} ({sequential_time_10/10:.0f}ms avg per round-trip)")

    await conn.close()


async def test_mongodb_latency():
    print("\n=== MongoDB Atlas ===")
    mongo_url = os.getenv("MONGODB_URL")
    mongo_db = os.getenv("MONGODB_DB")

    t0 = time.perf_counter()
    client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=15000)
    await client.admin.command("ping")
    conn_time = (time.perf_counter() - t0) * 1000
    print(f"  Connection+Ping:  {fmt_ms(conn_time)}")

    db = client[mongo_db]

    # find_one
    t0 = time.perf_counter()
    doc = await db["learning_progress"].find_one()
    find_time = (time.perf_counter() - t0) * 1000
    print(f"  find_one():       {fmt_ms(find_time)}")

    # count
    t0 = time.perf_counter()
    count = await db["learning_progress"].count_documents({})
    count_time = (time.perf_counter() - t0) * 1000
    print(f"  count_documents:  {fmt_ms(count_time)} ({count} docs)")

    # aggregation
    t0 = time.perf_counter()
    cursor = db["xapi_statements"].aggregate([
        {"$group": {"_id": "$verb_id", "count": {"$sum": 1}}},
        {"$limit": 10}
    ])
    results = await cursor.to_list(length=10)
    agg_time = (time.perf_counter() - t0) * 1000
    print(f"  Aggregation:      {fmt_ms(agg_time)} ({len(results)} groups)")

    # 5x sequential
    t0 = time.perf_counter()
    for _ in range(5):
        await db["learning_progress"].find_one()
    seq_time = (time.perf_counter() - t0) * 1000
    print(f"  5x sequential:    {fmt_ms(seq_time)} ({seq_time/5:.0f}ms avg)")

    client.close()


async def test_api_latency():
    print("\n=== API Endpoints (localhost:8080) ===")
    
    async with aiohttp.ClientSession() as session:
        token = None
        
        # Health check
        t0 = time.perf_counter()
        try:
            resp = await session.get("http://localhost:8080/health", timeout=aiohttp.ClientTimeout(total=30))
            elapsed = (time.perf_counter() - t0) * 1000
            print(f"  Health Check            {fmt_ms(elapsed):>25s}  [{resp.status}]")
        except Exception as e:
            print(f"  Health Check            ERROR: {e}")
            return

        # Login
        t0 = time.perf_counter()
        try:
            resp = await session.post(
                f"{BASE_URL}/auth/login",
                json={"email": "sudharsan2618@gmail.com", "password": "test123"},
                timeout=aiohttp.ClientTimeout(total=30)
            )
            elapsed = (time.perf_counter() - t0) * 1000
            data = await resp.json()
            if resp.status == 200:
                token = data.get("access_token")
            print(f"  Login                   {fmt_ms(elapsed):>25s}  [{resp.status}]")
        except Exception as e:
            print(f"  Login                   ERROR: {e}")
            return

        if not token:
            print("  WARNING: No token obtained, skipping authenticated endpoints")
            return

        # Authenticated endpoints
        auth_endpoints = [
            ("/student/profile", "Student Profile"),
            ("/student/courses", "My Courses"),
            ("/student/courses/catalog", "Course Catalog"),
            ("/student/jobs?limit=10", "Jobs List"),
            ("/student/jobs/recommended?limit=10", "AI Recommendations"),
            ("/student/applications", "My Applications"),
            ("/student/certificates", "Certificates"),
            ("/notifications", "Notifications"),
        ]

        headers = {"Authorization": f"Bearer {token}"}
        
        print("  --- Authenticated Endpoints ---")
        total_time = 0
        for path, name in auth_endpoints:
            url = f"{BASE_URL}{path}"
            t0 = time.perf_counter()
            try:
                resp = await session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=30))
                elapsed = (time.perf_counter() - t0) * 1000
                total_time += elapsed
                print(f"  {name:25s} {fmt_ms(elapsed):>25s}  [{resp.status}]")
            except Exception as e:
                elapsed = (time.perf_counter() - t0) * 1000
                total_time += elapsed
                print(f"  {name:25s} {elapsed:.0f}ms  [TIMEOUT/ERROR: {e}]")
        
        print(f"\n  TOTAL for all endpoints: {total_time:.0f}ms")
        print(f"  AVERAGE per endpoint:   {total_time/len(auth_endpoints):.0f}ms")


async def test_network_latency():
    print("\n=== Raw Network Latency (TCP connect) ===")
    import socket
    
    host = os.getenv("POSTGRES_HOST")
    port = int(os.getenv("POSTGRES_PORT", 5432))
    
    times = []
    for i in range(3):
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        t0 = time.perf_counter()
        try:
            sock.connect((host, port))
            elapsed = (time.perf_counter() - t0) * 1000
            times.append(elapsed)
        except Exception:
            times.append(-1)
        finally:
            sock.close()
    
    valid = [t for t in times if t > 0]
    avg = sum(valid) / max(len(valid), 1)
    print(f"  Render PG (Singapore):  avg={fmt_ms(avg)}")
    print(f"    Round-trips: {', '.join(f'{t:.0f}ms' for t in times)}")
    print(f"    >> This is your BASE latency. Every DB query adds at least {avg:.0f}ms")


async def main():
    print("=" * 50)
    print("  RecruitLMS - Latency Diagnostic Report")
    print("=" * 50)

    await test_network_latency()
    await test_postgres_latency()
    await test_mongodb_latency()
    await test_api_latency()

    print("\n" + "=" * 50)
    print("  ROOT CAUSE ANALYSIS")
    print("=" * 50)
    print("""
  ARCHITECTURE:
    Your backend runs LOCALLY (or on Vercel/Cloud Run)
    but queries databases hosted in DIFFERENT REGIONS:

    Backend (local/Cloud Run) --> PostgreSQL (Render SINGAPORE)
    Backend (local/Cloud Run) --> MongoDB Atlas (cloud)

  THE PROBLEM:
    Every single DB query adds ~150-400ms of NETWORK latency.
    Most API endpoints make 3-10 queries, so:
    
    1 endpoint = 3-10 queries x 200-400ms = 600ms - 4000ms per request!

  SOLUTIONS (by priority):

  1. [IMMEDIATE] Co-locate backend + DB in same region
     - Deploy backend to Singapore (same region as Render PG)
     - Or move PG to a region closer to your backend
     - This alone can reduce latency by 80%

  2. [IMMEDIATE] Reduce N+1 queries
     - Use JOINs and eager loading (SQLAlchemy joinedload)
     - Batch multiple queries where possible
     - 1 query with JOIN vs 5 sequential = 5x faster

  3. [SHORT TERM] Add caching layer
     - Cache course catalogs, user profiles (Redis/in-memory)
     - Use stale-while-revalidate on frontend
     - Cache student progress for dashboard

  4. [MEDIUM TERM] Use connection pooler
     - PgBouncer for PostgreSQL
     - Keeps connections warm, reduces connect overhead

  5. [PRODUCTION] Full co-location
     - Backend + PostgreSQL + MongoDB all in same cloud region
     - Latency drops to <5ms per query (vs 200-400ms now)
""")


if __name__ == "__main__":
    asyncio.run(main())
