"""
Hybrid Job-Student matching service.

3-Stage Pipeline:
  Stage 1 — Vector retrieval via pgvector cosine similarity (broad net, threshold 0.45)
  Stage 2 — Multi-signal composite scoring:
            A. Semantic similarity  (35%)  — from Stage 1
            B. Skill overlap        (35%)  — SQL student_skills ↔ job_skills
            C. Experience fit       (20%)  — student.experience_years vs job range
            D. Preference fit       (10%)  — remote/employment/location preferences
  Stage 3 — Skill gap analysis + course recommendations

All candidates with composite_score >= 0.65 are returned (threshold-based, not top-N).
"""

import logging
from typing import Optional
from datetime import datetime

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

# ── Thresholds and weights ────────────────────────────────────────────────

COMPOSITE_THRESHOLD = 0.65          # minimum composite score to be a "match"
VECTOR_RETRIEVAL_THRESHOLD = 0.45   # broad net for Stage 1

# Normal weights (when skill data exists)
W_VECTOR = 0.35
W_SKILL = 0.35
W_EXPERIENCE = 0.20
W_PREFERENCE = 0.10

# Fallback weights (when job has no skills in job_skills table)
W_VECTOR_FALLBACK = 0.55
W_EXPERIENCE_FALLBACK = 0.30
W_PREFERENCE_FALLBACK = 0.15


class MatchingService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ══════════════════════════════════════════════════════════════════════
    # STAGE 2 — Individual signal computations
    # ══════════════════════════════════════════════════════════════════════

    async def _compute_skill_overlap(
        self, student_id: int, job_ids: list[int]
    ) -> dict[int, dict]:
        """
        Compute skill overlap between a student and multiple jobs.
        Returns dict keyed by job_id with skill score + breakdown.
        """
        if not job_ids:
            return {}

        # Get all job skills for the candidate jobs
        job_skills_q = await self.db.execute(
            text("""
                SELECT
                    js.job_id,
                    js.skill_id,
                    s.name AS skill_name,
                    js.is_mandatory,
                    js.min_experience_years
                FROM job_skills js
                JOIN skills s ON s.skill_id = js.skill_id
                WHERE js.job_id = ANY(:job_ids)
                ORDER BY js.job_id, js.is_mandatory DESC, s.name
            """),
            {"job_ids": job_ids},
        )
        job_skills_rows = job_skills_q.mappings().all()

        # Get student's skills
        student_skills_q = await self.db.execute(
            text("""
                SELECT
                    ss.skill_id,
                    s.name AS skill_name,
                    ss.proficiency_level,
                    ss.years_of_experience
                FROM student_skills ss
                JOIN skills s ON s.skill_id = ss.skill_id
                WHERE ss.student_id = :sid
            """),
            {"sid": student_id},
        )
        student_skills = {
            row["skill_id"]: {
                "name": row["skill_name"],
                "proficiency_level": row["proficiency_level"] or 0,
                "years_of_experience": float(row["years_of_experience"] or 0),
            }
            for row in student_skills_q.mappings().all()
        }

        # Group job skills by job_id
        from collections import defaultdict
        jobs_skill_map: dict[int, list[dict]] = defaultdict(list)
        for row in job_skills_rows:
            jobs_skill_map[row["job_id"]].append(dict(row))

        results: dict[int, dict] = {}

        for jid in job_ids:
            required_skills = jobs_skill_map.get(jid, [])

            if not required_skills:
                # Job has no skills defined — skill score is N/A
                results[jid] = {
                    "skill_score": None,
                    "matched_skills": [],
                    "missing_skills": [],
                    "total_skills": 0,
                    "mandatory_matched": 0,
                    "mandatory_total": 0,
                    "optional_matched": 0,
                    "optional_total": 0,
                }
                continue

            mandatory_total = 0
            mandatory_matched = 0
            optional_total = 0
            optional_matched = 0
            proficiency_bonus_count = 0
            matched_skills = []
            missing_skills = []

            for rs in required_skills:
                is_mandatory = rs["is_mandatory"]
                sid = rs["skill_id"]
                min_exp = rs["min_experience_years"] or 0

                if is_mandatory:
                    mandatory_total += 1
                else:
                    optional_total += 1

                if sid in student_skills:
                    ss = student_skills[sid]
                    if is_mandatory:
                        mandatory_matched += 1
                    else:
                        optional_matched += 1

                    # Proficiency bonus
                    if ss["proficiency_level"] >= 4 and ss["years_of_experience"] >= min_exp:
                        proficiency_bonus_count += 1

                    matched_skills.append({
                        "skill_name": rs["skill_name"],
                        "is_mandatory": is_mandatory,
                        "proficiency_level": ss["proficiency_level"],
                        "years_of_experience": ss["years_of_experience"],
                    })
                else:
                    missing_skills.append({
                        "skill_name": rs["skill_name"],
                        "is_mandatory": is_mandatory,
                    })

            # Compute skill score
            if mandatory_total > 0:
                score = (
                    0.7 * (mandatory_matched / mandatory_total)
                    + 0.3 * (optional_matched / max(optional_total, 1))
                    + 0.05 * proficiency_bonus_count
                )
            else:
                total = mandatory_total + optional_total
                matched = mandatory_matched + optional_matched
                score = (matched / max(total, 1)) + 0.05 * proficiency_bonus_count

            score = min(score, 1.0)

            results[jid] = {
                "skill_score": round(score, 4),
                "matched_skills": matched_skills,
                "missing_skills": missing_skills,
                "total_skills": len(required_skills),
                "mandatory_matched": mandatory_matched,
                "mandatory_total": mandatory_total,
                "optional_matched": optional_matched,
                "optional_total": optional_total,
            }

        return results

    async def batch_compute_skill_overlap(
        self, student_ids: list[int], job_id: int,
    ) -> dict[int, dict]:
        """Compute skill overlap for multiple students against one job in 2 queries total."""
        from collections import defaultdict

        empty = {
            "skill_score": None, "matched_skills": [], "missing_skills": [],
            "total_skills": 0, "mandatory_matched": 0, "mandatory_total": 0,
            "optional_matched": 0, "optional_total": 0,
        }
        if not student_ids:
            return {}

        # Query 1: All job skills for the single job
        job_skills_q = await self.db.execute(
            text("""
                SELECT js.skill_id, s.name AS skill_name, js.is_mandatory, js.min_experience_years
                FROM job_skills js
                JOIN skills s ON s.skill_id = js.skill_id
                WHERE js.job_id = :job_id
                ORDER BY js.is_mandatory DESC, s.name
            """),
            {"job_id": job_id},
        )
        job_skills = job_skills_q.mappings().all()

        if not job_skills:
            return {sid: dict(empty) for sid in student_ids}

        # Query 2: All student skills for ALL students at once
        all_student_skills_q = await self.db.execute(
            text("""
                SELECT ss.student_id, ss.skill_id, s.name AS skill_name,
                       ss.proficiency_level, ss.years_of_experience
                FROM student_skills ss
                JOIN skills s ON s.skill_id = ss.skill_id
                WHERE ss.student_id = ANY(:sids)
            """),
            {"sids": student_ids},
        )

        skills_by_student: dict[int, dict] = defaultdict(dict)
        for row in all_student_skills_q.mappings().all():
            skills_by_student[row["student_id"]][row["skill_id"]] = {
                "name": row["skill_name"],
                "proficiency_level": row["proficiency_level"] or 0,
                "years_of_experience": float(row["years_of_experience"] or 0),
            }

        # Compute overlap per student in Python (no more DB calls)
        results: dict[int, dict] = {}
        for sid in student_ids:
            student_skill_map = skills_by_student.get(sid, {})
            mandatory_total = mandatory_matched = 0
            optional_total = optional_matched = 0
            proficiency_bonus_count = 0
            matched_skills = []
            missing_skills = []

            for js in job_skills:
                is_mandatory = js["is_mandatory"]
                if is_mandatory:
                    mandatory_total += 1
                else:
                    optional_total += 1

                if js["skill_id"] in student_skill_map:
                    ss = student_skill_map[js["skill_id"]]
                    if is_mandatory:
                        mandatory_matched += 1
                    else:
                        optional_matched += 1
                    min_exp = js["min_experience_years"] or 0
                    if ss["proficiency_level"] >= 4 and ss["years_of_experience"] >= min_exp:
                        proficiency_bonus_count += 1
                    matched_skills.append(js["skill_name"])
                else:
                    missing_skills.append(js["skill_name"])

            if mandatory_total > 0:
                score = (
                    0.7 * (mandatory_matched / mandatory_total)
                    + 0.3 * (optional_matched / max(optional_total, 1))
                    + 0.05 * proficiency_bonus_count
                )
            else:
                total = mandatory_total + optional_total
                matched = mandatory_matched + optional_matched
                score = (matched / max(total, 1)) + 0.05 * proficiency_bonus_count
            score = min(score, 1.0)

            results[sid] = {
                "skill_score": round(score, 4),
                "matched_skills": matched_skills,
                "missing_skills": missing_skills,
                "total_skills": len(job_skills),
                "mandatory_matched": mandatory_matched,
                "mandatory_total": mandatory_total,
                "optional_matched": optional_matched,
                "optional_total": optional_total,
            }

        return results

    def _compute_experience_fit(
        self,
        student_exp: int,
        job_exp_min: Optional[int],
        job_exp_max: Optional[int],
    ) -> float:
        """
        Compute experience fit score (0.0 → 1.0).
        """
        if job_exp_min is None and job_exp_max is None:
            return 0.8  # no range specified → neutral score

        exp_min = job_exp_min or 0
        exp_max = job_exp_max or (exp_min + 10)

        if exp_min <= student_exp <= exp_max:
            return 1.0  # perfect fit

        if student_exp < exp_min:
            # Under-qualified
            gap = exp_min - student_exp
            return max(0.0, 1.0 - gap / max(exp_min, 1))

        # Over-qualified (student_exp > exp_max)
        gap = student_exp - exp_max
        return max(0.5, 1.0 - gap / 10.0)

    def _compute_preference_fit(
        self,
        student_pref_remote: Optional[list],
        student_pref_job_types: Optional[list],
        student_pref_locations: Optional[list],
        job_remote_type: str,
        job_employment_type: str,
        job_location: Optional[str],
    ) -> float:
        """
        Compute preference compatibility score (0.0 → 1.0).
        Average of remote, employment type, and location sub-signals.
        """
        scores = []

        # D1. Remote type match
        pref_remote = student_pref_remote or []
        if pref_remote:
            scores.append(1.0 if job_remote_type in pref_remote else 0.3)
        else:
            scores.append(0.7)  # no preference → neutral

        # D2. Employment type match
        pref_job_types = student_pref_job_types or []
        if pref_job_types:
            scores.append(1.0 if job_employment_type in pref_job_types else 0.3)
        else:
            scores.append(0.7)

        # D3. Location match
        pref_locations = student_pref_locations or []
        if pref_locations and job_location:
            job_loc_lower = job_location.lower()
            matched = any(
                pl.lower() in job_loc_lower or job_loc_lower in pl.lower()
                for pl in pref_locations
            )
            scores.append(1.0 if matched else 0.5)
        else:
            scores.append(0.7)

        return round(sum(scores) / len(scores), 4) if scores else 0.7

    def _compute_composite(
        self,
        vector_score: float,
        skill_score: Optional[float],
        experience_score: float,
        preference_score: float,
    ) -> float:
        """
        Compute weighted composite score.
        If skill_score is None (job has no skills), redistribute weight to vector.
        """
        if skill_score is not None:
            composite = (
                W_VECTOR * vector_score
                + W_SKILL * skill_score
                + W_EXPERIENCE * experience_score
                + W_PREFERENCE * preference_score
            )
        else:
            composite = (
                W_VECTOR_FALLBACK * vector_score
                + W_EXPERIENCE_FALLBACK * experience_score
                + W_PREFERENCE_FALLBACK * preference_score
            )
        return round(composite, 4)

    # ══════════════════════════════════════════════════════════════════════
    # STAGE 3 — Skill gap course recommendations
    # ══════════════════════════════════════════════════════════════════════

    async def _get_gap_courses(self, missing_skill_names: list[str]) -> list[dict]:
        """Find published courses that teach the missing skills."""
        if not missing_skill_names:
            return []

        result = await self.db.execute(
            text("""
                SELECT DISTINCT ON (c.course_id)
                    c.course_id,
                    c.title,
                    c.slug,
                    c.price,
                    c.currency,
                    c.thumbnail_url,
                    ARRAY_AGG(s.name) OVER (PARTITION BY c.course_id) AS teaches_skills
                FROM course_skills cs
                JOIN skills s ON s.skill_id = cs.skill_id
                JOIN courses c ON c.course_id = cs.course_id
                WHERE s.name = ANY(:skill_names)
                  AND c.is_published = true
                ORDER BY c.course_id, cs.is_primary DESC
                LIMIT 10
            """),
            {"skill_names": missing_skill_names},
        )
        rows = result.mappings().all()
        courses = []
        for r in rows:
            courses.append({
                "course_id": r["course_id"],
                "title": r["title"],
                "slug": r["slug"],
                "price": float(r["price"]) if r["price"] else 0,
                "currency": r.get("currency", "INR"),
                "thumbnail_url": r.get("thumbnail_url"),
                "teaches_skills": list(r["teaches_skills"]) if r["teaches_skills"] else [],
            })
        return courses

    # ══════════════════════════════════════════════════════════════════════
    # PUBLIC API — Recommended jobs (hybrid matching)
    # ══════════════════════════════════════════════════════════════════════

    async def get_recommended_jobs_for_student(
        self,
        student_id: int,
        limit: int = 50,
        offset: int = 0,
    ) -> list[dict]:
        """
        3-stage hybrid matching.
        Returns ALL jobs with composite_score >= COMPOSITE_THRESHOLD.
        """
        # Check if student has an embedding
        has_emb = await self.db.execute(
            text("SELECT 1 FROM student_embeddings WHERE student_id = :sid LIMIT 1"),
            {"sid": student_id},
        )
        if has_emb.scalar() is None:
            logger.info(f"Student {student_id} has no embedding — skipping recommendations")
            return []

        # ── Get student profile data for experience + preferences ────────
        student_data = await self.db.execute(
            text("""
                SELECT
                    s.experience_years,
                    s.preferred_job_types,
                    s.preferred_remote_types,
                    s.preferred_locations
                FROM students s WHERE s.student_id = :sid
            """),
            {"sid": student_id},
        )
        student_row = student_data.mappings().first()
        if not student_row:
            return []

        student_exp = student_row["experience_years"] or 0
        pref_job_types = student_row["preferred_job_types"] or []
        pref_remote_types = student_row["preferred_remote_types"] or []
        pref_locations = student_row["preferred_locations"] or []

        # ── STAGE 1: Broad vector retrieval ──────────────────────────────
        vector_q = await self.db.execute(
            text("""
                SELECT
                    j.job_id,
                    j.title,
                    j.slug,
                    j.description,
                    j.employment_type,
                    j.remote_type,
                    j.location,
                    j.salary_min,
                    j.salary_max,
                    j.salary_currency,
                    j.salary_is_visible,
                    j.experience_min_years,
                    j.experience_max_years,
                    j.benefits,
                    j.posted_at,
                    j.deadline,
                    j.department,
                    j.responsibilities,
                    j.requirements,
                    j.nice_to_have,
                    j.applications_count,
                    c.company_id,
                    c.company_name,
                    c.logo_url,
                    c.industry,
                    c.headquarters_location AS company_location,
                    ROUND((1.0 - (je.embedding <=> se.embedding))::numeric, 4) AS vector_score
                FROM job_embeddings je
                JOIN student_embeddings se ON se.student_id = :student_id
                JOIN jobs j ON j.job_id = je.job_id
                JOIN companies c ON c.company_id = j.company_id
                WHERE j.status = 'active'
                  AND (1.0 - (je.embedding <=> se.embedding)) >= :vector_threshold
                ORDER BY vector_score DESC
            """),
            {
                "student_id": student_id,
                "vector_threshold": VECTOR_RETRIEVAL_THRESHOLD,
            },
        )
        candidates = [dict(row) for row in vector_q.mappings().all()]

        if not candidates:
            return []

        # ── STAGE 2: Compute multi-signal composite ──────────────────────
        candidate_job_ids = [c["job_id"] for c in candidates]

        # Batch compute skill overlap for all candidates
        skill_results = await self._compute_skill_overlap(student_id, candidate_job_ids)

        final_jobs = []
        for c in candidates:
            jid = c["job_id"]
            vector_score = float(c["vector_score"]) if c["vector_score"] else 0.0

            # Skill overlap
            skill_data = skill_results.get(jid, {})
            skill_score = skill_data.get("skill_score")  # None if job has no skills

            # Experience fit
            experience_score = self._compute_experience_fit(
                student_exp,
                c.get("experience_min_years"),
                c.get("experience_max_years"),
            )

            # Preference fit
            preference_score = self._compute_preference_fit(
                pref_remote_types, pref_job_types, pref_locations,
                c.get("remote_type", ""),
                c.get("employment_type", ""),
                c.get("location"),
            )

            # Composite
            composite = self._compute_composite(
                vector_score, skill_score, experience_score, preference_score,
            )

            # ── Apply threshold: composite >= 0.65 ──────────────────────
            if composite < COMPOSITE_THRESHOLD:
                continue

            # Decimal conversions
            c["salary_min"] = float(c["salary_min"]) if c["salary_min"] else None
            c["salary_max"] = float(c["salary_max"]) if c["salary_max"] else None

            # Attach match data
            c["match_score"] = composite
            c["match_breakdown"] = {
                "composite_score": composite,
                "vector_score": round(vector_score, 4),
                "skill_score": round(skill_score, 4) if skill_score is not None else None,
                "experience_score": round(experience_score, 4),
                "preference_score": round(preference_score, 4),
            }
            c["matched_skills"] = skill_data.get("matched_skills", [])
            c["missing_skills"] = skill_data.get("missing_skills", [])
            c["skill_summary"] = {
                "total": skill_data.get("total_skills", 0),
                "mandatory_matched": skill_data.get("mandatory_matched", 0),
                "mandatory_total": skill_data.get("mandatory_total", 0),
                "optional_matched": skill_data.get("optional_matched", 0),
                "optional_total": skill_data.get("optional_total", 0),
            }

            # Fetch skills for display
            c["skills"] = await self._get_job_skills(jid)

            final_jobs.append(c)

        # Sort by composite DESC
        final_jobs.sort(key=lambda x: x["match_score"], reverse=True)

        # Apply pagination
        return final_jobs[offset: offset + limit]

    # ══════════════════════════════════════════════════════════════════════
    # PUBLIC API — All active jobs (with optional composite score)
    # ══════════════════════════════════════════════════════════════════════

    async def get_all_active_jobs(
        self,
        student_id: Optional[int] = None,
        search: str = "",
        employment_type: str = "",
        remote_type: str = "",
        location: str = "",
        limit: int = 50,
        offset: int = 0,
    ) -> list[dict]:
        """
        Fetch all active jobs with optional filters.
        If student has embedding, compute composite match score.
        """
        # Build dynamic WHERE clauses
        where_clauses = ["j.status = 'active'"]
        params: dict = {"limit": limit, "offset": offset}

        if search:
            where_clauses.append(
                "(LOWER(j.title) LIKE :search OR LOWER(j.description) LIKE :search OR LOWER(c.company_name) LIKE :search)"
            )
            params["search"] = f"%{search.lower()}%"

        if employment_type:
            where_clauses.append("j.employment_type = :emp_type")
            params["emp_type"] = employment_type

        if remote_type:
            where_clauses.append("j.remote_type = :remote_type")
            params["remote_type"] = remote_type

        if location:
            where_clauses.append("LOWER(j.location) LIKE :location")
            params["location"] = f"%{location.lower()}%"

        where_sql = " AND ".join(where_clauses)

        # If student has embedding, compute vector score
        if student_id:
            score_select = """
                ROUND((1.0 - (je.embedding <=> se.embedding))::numeric, 4) AS vector_score
            """
            join_embeddings = """
                LEFT JOIN job_embeddings je ON je.job_id = j.job_id
                LEFT JOIN student_embeddings se ON se.student_id = :student_id
            """
            params["student_id"] = student_id
        else:
            score_select = "NULL AS vector_score"
            join_embeddings = ""

        query = text(f"""
            SELECT
                j.job_id,
                j.title,
                j.slug,
                j.description,
                j.employment_type,
                j.remote_type,
                j.location,
                j.salary_min,
                j.salary_max,
                j.salary_currency,
                j.salary_is_visible,
                j.experience_min_years,
                j.experience_max_years,
                j.benefits,
                j.posted_at,
                j.deadline,
                j.department,
                j.applications_count,
                c.company_id,
                c.company_name,
                c.logo_url,
                c.industry,
                c.headquarters_location AS company_location,
                {score_select}
            FROM jobs j
            JOIN companies c ON c.company_id = j.company_id
            {join_embeddings}
            WHERE {where_sql}
            ORDER BY j.posted_at DESC NULLS LAST
            LIMIT :limit OFFSET :offset
        """)

        result = await self.db.execute(query, params)
        rows = result.mappings().all()

        # Get student preferences for composite scoring
        student_exp = 0
        pref_job_types: list = []
        pref_remote_types: list = []
        pref_locations: list = []

        if student_id:
            student_data = await self.db.execute(
                text("""
                    SELECT experience_years, preferred_job_types,
                           preferred_remote_types, preferred_locations
                    FROM students WHERE student_id = :sid
                """),
                {"sid": student_id},
            )
            sr = student_data.mappings().first()
            if sr:
                student_exp = sr["experience_years"] or 0
                pref_job_types = sr["preferred_job_types"] or []
                pref_remote_types = sr["preferred_remote_types"] or []
                pref_locations = sr["preferred_locations"] or []

        # Batch skill overlap
        all_job_ids = [dict(r)["job_id"] for r in rows]
        skill_results = {}
        if student_id and all_job_ids:
            skill_results = await self._compute_skill_overlap(student_id, all_job_ids)

        jobs = []
        for row in rows:
            job = dict(row)
            job["salary_min"] = float(job["salary_min"]) if job["salary_min"] else None
            job["salary_max"] = float(job["salary_max"]) if job["salary_max"] else None

            # Compute composite if student has vector score
            vector_score = float(job["vector_score"]) if job.get("vector_score") else None

            if vector_score is not None and student_id:
                skill_data = skill_results.get(job["job_id"], {})
                skill_score = skill_data.get("skill_score")
                experience_score = self._compute_experience_fit(
                    student_exp,
                    job.get("experience_min_years"),
                    job.get("experience_max_years"),
                )
                preference_score = self._compute_preference_fit(
                    pref_remote_types, pref_job_types, pref_locations,
                    job.get("remote_type", ""),
                    job.get("employment_type", ""),
                    job.get("location"),
                )
                composite = self._compute_composite(
                    vector_score, skill_score, experience_score, preference_score,
                )
                job["match_score"] = composite
                job["match_breakdown"] = {
                    "composite_score": composite,
                    "vector_score": round(vector_score, 4),
                    "skill_score": round(skill_score, 4) if skill_score is not None else None,
                    "experience_score": round(experience_score, 4),
                    "preference_score": round(preference_score, 4),
                }
                job["matched_skills"] = skill_data.get("matched_skills", [])
                job["missing_skills"] = skill_data.get("missing_skills", [])
            else:
                job["match_score"] = None
                job["match_breakdown"] = None
                job["matched_skills"] = []
                job["missing_skills"] = []

            job["skills"] = await self._get_job_skills(job["job_id"])
            jobs.append(job)

        return jobs

    # ══════════════════════════════════════════════════════════════════════
    # PUBLIC API — Job detail with full match analysis
    # ══════════════════════════════════════════════════════════════════════

    async def get_job_detail(
        self, job_id: int, student_id: Optional[int] = None
    ) -> Optional[dict]:
        """Fetch a single job with full detail + composite match breakdown."""
        if student_id:
            score_select = """
                ROUND((1.0 - (je.embedding <=> se.embedding))::numeric, 4) AS vector_score
            """
            join_embeddings = """
                LEFT JOIN job_embeddings je ON je.job_id = j.job_id
                LEFT JOIN student_embeddings se ON se.student_id = :student_id
            """
            params = {"job_id": job_id, "student_id": student_id}
        else:
            score_select = "NULL AS vector_score"
            join_embeddings = ""
            params = {"job_id": job_id}

        query = text(f"""
            SELECT
                j.*,
                c.company_id,
                c.company_name,
                c.logo_url,
                c.industry,
                c.website_url AS company_website,
                c.headquarters_location AS company_location,
                c.company_size,
                c.description AS company_description,
                {score_select}
            FROM jobs j
            JOIN companies c ON c.company_id = j.company_id
            {join_embeddings}
            WHERE j.job_id = :job_id
        """)

        result = await self.db.execute(query, params)
        row = result.mappings().first()
        if not row:
            return None

        job = dict(row)
        job["salary_min"] = float(job["salary_min"]) if job["salary_min"] else None
        job["salary_max"] = float(job["salary_max"]) if job["salary_max"] else None
        job["price_per_candidate"] = float(job["price_per_candidate"]) if job.get("price_per_candidate") else None
        job["skills"] = await self._get_job_skills(job["job_id"])

        # Compute full match breakdown
        vector_score = float(job.get("vector_score") or 0) if job.get("vector_score") else None

        if vector_score is not None and student_id:
            # Student preferences
            student_data = await self.db.execute(
                text("""
                    SELECT experience_years, preferred_job_types,
                           preferred_remote_types, preferred_locations
                    FROM students WHERE student_id = :sid
                """),
                {"sid": student_id},
            )
            sr = student_data.mappings().first()
            student_exp = (sr["experience_years"] or 0) if sr else 0
            pref_job_types = (sr["preferred_job_types"] or []) if sr else []
            pref_remote_types = (sr["preferred_remote_types"] or []) if sr else []
            pref_locations = (sr["preferred_locations"] or []) if sr else []

            # Skill overlap
            skill_results = await self._compute_skill_overlap(student_id, [job_id])
            skill_data = skill_results.get(job_id, {})
            skill_score = skill_data.get("skill_score")

            # Experience
            experience_score = self._compute_experience_fit(
                student_exp,
                job.get("experience_min_years"),
                job.get("experience_max_years"),
            )

            # Preference
            preference_score = self._compute_preference_fit(
                pref_remote_types, pref_job_types, pref_locations,
                job.get("remote_type", ""),
                job.get("employment_type", ""),
                job.get("location"),
            )

            composite = self._compute_composite(
                vector_score, skill_score, experience_score, preference_score,
            )

            job["match_score"] = composite
            job["match_breakdown"] = {
                "composite_score": composite,
                "vector_score": round(vector_score, 4),
                "skill_score": round(skill_score, 4) if skill_score is not None else None,
                "experience_score": round(experience_score, 4),
                "preference_score": round(preference_score, 4),
            }
            job["matched_skills"] = skill_data.get("matched_skills", [])
            job["missing_skills"] = skill_data.get("missing_skills", [])
            job["skill_summary"] = {
                "total": skill_data.get("total_skills", 0),
                "mandatory_matched": skill_data.get("mandatory_matched", 0),
                "mandatory_total": skill_data.get("mandatory_total", 0),
                "optional_matched": skill_data.get("optional_matched", 0),
                "optional_total": skill_data.get("optional_total", 0),
            }

            # Stage 3: Course recommendations for missing skills
            missing_names = [ms["skill_name"] for ms in skill_data.get("missing_skills", [])]
            job["gap_courses"] = await self._get_gap_courses(missing_names)
        else:
            job["match_score"] = None
            job["match_breakdown"] = None
            job["matched_skills"] = []
            job["missing_skills"] = []
            job["skill_summary"] = None
            job["gap_courses"] = []

        return job

    # ══════════════════════════════════════════════════════════════════════
    # PUBLIC API — Composite score for application (admin reference)
    # ══════════════════════════════════════════════════════════════════════

    async def compute_composite_for_application(
        self, student_id: int, job_id: int
    ) -> Optional[float]:
        """Compute composite match score for a (student, job) pair. Used at apply time."""
        # Vector score
        vec_q = await self.db.execute(
            text("""
                SELECT ROUND((1.0 - (je.embedding <=> se.embedding))::numeric, 4) AS score
                FROM job_embeddings je, student_embeddings se
                WHERE je.job_id = :jid AND se.student_id = :sid
            """),
            {"jid": job_id, "sid": student_id},
        )
        vec_row = vec_q.mappings().first()
        if not vec_row or not vec_row["score"]:
            return None
        vector_score = float(vec_row["score"])

        # Student data
        sd = await self.db.execute(
            text("SELECT experience_years, preferred_job_types, preferred_remote_types, preferred_locations FROM students WHERE student_id = :sid"),
            {"sid": student_id},
        )
        sr = sd.mappings().first()
        student_exp = (sr["experience_years"] or 0) if sr else 0
        pref_job_types = (sr["preferred_job_types"] or []) if sr else []
        pref_remote_types = (sr["preferred_remote_types"] or []) if sr else []
        pref_locations = (sr["preferred_locations"] or []) if sr else []

        # Job data
        jd = await self.db.execute(
            text("SELECT experience_min_years, experience_max_years, remote_type, employment_type, location FROM jobs WHERE job_id = :jid"),
            {"jid": job_id},
        )
        jr = jd.mappings().first()
        if not jr:
            return None

        skill_results = await self._compute_skill_overlap(student_id, [job_id])
        skill_score = skill_results.get(job_id, {}).get("skill_score")

        experience_score = self._compute_experience_fit(
            student_exp, jr["experience_min_years"], jr["experience_max_years"],
        )
        preference_score = self._compute_preference_fit(
            pref_remote_types, pref_job_types, pref_locations,
            jr["remote_type"] or "", jr["employment_type"] or "", jr["location"],
        )

        return self._compute_composite(vector_score, skill_score, experience_score, preference_score)

    # ══════════════════════════════════════════════════════════════════════
    # Utilities
    # ══════════════════════════════════════════════════════════════════════

    async def check_student_applied(self, student_id: int, job_id: int) -> bool:
        """Check if student already applied to a job."""
        result = await self.db.execute(
            text("SELECT 1 FROM applications WHERE student_id = :sid AND job_id = :jid"),
            {"sid": student_id, "jid": job_id},
        )
        return result.scalar() is not None

    async def _get_job_skills(self, job_id: int) -> list[dict]:
        """Get skills for a job."""
        result = await self.db.execute(
            text("""
                SELECT s.skill_id, s.name, js.is_mandatory, js.min_experience_years
                FROM job_skills js
                JOIN skills s ON js.skill_id = s.skill_id
                WHERE js.job_id = :job_id
            """),
            {"job_id": job_id},
        )
        return [dict(r) for r in result.mappings().all()]
