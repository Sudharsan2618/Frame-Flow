"""
SQLAlchemy models for embedding tables (pgvector).
Maps to DB/001_postgresql_schema.sql — student_embeddings & job_embeddings.
"""

from app.utils.time import utc_now
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    DateTime, Integer, String, ForeignKey, Column
)
from sqlalchemy.orm import Mapped, mapped_column
from app.db.postgres import Base

# pgvector support — import conditionally to avoid hard dep
try:
    from pgvector.sqlalchemy import Vector
except ImportError:
    from sqlalchemy.types import UserDefinedType

    class Vector(UserDefinedType):
        cache_ok = True

        def __init__(self, dim: int = 1536):
            self.dim = dim

        def get_col_spec(self):
            return f"vector({self.dim})"

        def bind_processor(self, dialect):
            def process(value):
                if value is None:
                    return None
                if isinstance(value, list):
                    return "[" + ",".join(str(v) for v in value) + "]"
                return value
            return process

        def result_processor(self, dialect, coltype):
            def process(value):
                if value is None:
                    return None
                if isinstance(value, str):
                    return [float(x) for x in value.strip("[]").split(",")]
                return value
            return process

EMBEDDING_DIM = 1536


class StudentEmbedding(Base):
    __tablename__ = "student_embeddings"

    embedding_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    student_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("students.student_id", ondelete="CASCADE"),
        unique=True, nullable=False,
    )
    embedding = Column(Vector(EMBEDDING_DIM), nullable=False)
    embedding_model: Mapped[str] = mapped_column(
        String(100), default="gemini-embedding-001"
    )
    source_text_hash: Mapped[Optional[str]] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utc_now, onupdate=utc_now
    )


class JobEmbedding(Base):
    __tablename__ = "job_embeddings"

    embedding_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    job_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("jobs.job_id", ondelete="CASCADE"),
        unique=True, nullable=False,
    )
    embedding = Column(Vector(EMBEDDING_DIM), nullable=False)
    embedding_model: Mapped[str] = mapped_column(
        String(100), default="gemini-embedding-001"
    )
    source_text_hash: Mapped[Optional[str]] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utc_now, onupdate=utc_now
    )
