"""Resume analysis service — AI-powered resume parsing with LangChain + Gemini."""

import io
from datetime import datetime, timezone
from typing import Any, Optional

from pydantic import BaseModel, Field

from app.config import settings
from app.db.mongodb import get_mongodb, to_bson_datetime


# ── Pydantic schema for structured extraction ─────────────────────────────

class ResumeExtraction(BaseModel):
    """Structured data extracted from a resume by the LLM."""
    skills: list[str] = Field(default_factory=list, description="Technical and soft skills")
    experience_years: int = Field(default=0, description="Total years of professional experience")
    education: list[str] = Field(default_factory=list, description="Degrees and institutions")
    certifications: list[str] = Field(default_factory=list, description="Professional certifications")
    job_titles: list[str] = Field(default_factory=list, description="Previous job titles held")
    summary: str = Field(default="", description="Brief professional summary")
    languages: list[str] = Field(default_factory=list, description="Spoken/written languages")


# ── LLM setup (lazy init to avoid import errors if deps missing) ──────────

_structured_llm = None


def _get_llm():
    """Lazy-init the LangChain ChatGoogleGenerativeAI with structured output."""
    global _structured_llm
    if _structured_llm is not None:
        return _structured_llm

    from langchain_google_genai import ChatGoogleGenerativeAI

    llm = ChatGoogleGenerativeAI(
        model=settings.GEMINI_MODEL,
        google_api_key=settings.GEMINI_API_KEY,
        temperature=0.1,
        max_retries=2,
    )
    _structured_llm = llm.with_structured_output(
        schema=ResumeExtraction.model_json_schema(),
        method="json_schema",
    )
    return _structured_llm


# ── PDF text extraction ───────────────────────────────────────────────────

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from a PDF file in memory."""
    try:
        from PyPDF2 import PdfReader
        reader = PdfReader(io.BytesIO(file_bytes))
        text_parts = []
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
        return "\n".join(text_parts)
    except Exception as e:
        raise ValueError(f"Failed to extract text from PDF: {e}")


# ── Core analysis function ────────────────────────────────────────────────

SYSTEM_PROMPT = """You are an expert HR resume parser. Extract structured information from the following resume text.
Be thorough — extract ALL skills, certifications, job titles, and education entries mentioned.
For experience_years, estimate the total based on job date ranges. If unclear, use 0.
For the summary, write 1-2 concise sentences capturing the candidate's professional profile."""


async def analyze_resume(
    student_id: int,
    file_url: str,
    resume_text: str,
) -> dict[str, Any]:
    """
    Use Gemini to parse resume text and store results in MongoDB.

    Args:
        student_id: Student's database ID
        file_url: GCS URL where the resume was stored
        resume_text: Extracted text content from the resume

    Returns:
        The analysis document stored in MongoDB (without _id)
    """
    db = get_mongodb()
    now = to_bson_datetime(datetime.now(timezone.utc))

    # Call Gemini via LangChain
    structured_llm = _get_llm()
    prompt = f"{SYSTEM_PROMPT}\n\n---\nRESUME TEXT:\n{resume_text[:8000]}"  # Cap input to 8k chars
    result = await structured_llm.ainvoke(prompt)

    # result is a dict from structured output
    extracted_data = result if isinstance(result, dict) else result.dict() if hasattr(result, 'dict') else dict(result)

    doc = {
        "student_id": student_id,
        "file_url": file_url,
        "analyzed_at": now,
        "extracted_data": extracted_data,
        "resume_text_length": len(resume_text),
        "match_score_ready": True,
    }

    # Upsert — one analysis per student (latest wins)
    await db["resume_analysis"].replace_one(
        {"student_id": student_id},
        doc,
        upsert=True,
    )

    # Best-effort: generate embedding for job matching
    try:
        from app.services.embedding_service import generate_student_embedding
        embedding_result = await generate_student_embedding(student_id)
        if embedding_result:
            doc["embedding_status"] = embedding_result.get("status", "unknown")
    except Exception as e:
        doc["embedding_status"] = f"failed: {e}"

    return doc


async def get_resume_analysis(student_id: int) -> Optional[dict]:
    """Fetch the latest resume analysis for a student."""
    db = get_mongodb()
    doc = await db["resume_analysis"].find_one(
        {"student_id": student_id},
        {"_id": 0},
    )
    return doc
