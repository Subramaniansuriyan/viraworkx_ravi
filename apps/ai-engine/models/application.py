"""
ViraWorkX ATS — Application Model
Links a candidate to a specific job posting.
"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Text, Float, JSON, ForeignKey
from sqlalchemy.orm import relationship
from models.database import Base


class Application(Base):
    __tablename__ = "ats_applications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    candidate_id = Column(Integer, ForeignKey("ats_candidates.id"), nullable=False, index=True)
    job_id = Column(Integer, ForeignKey("ats_jobs.id"), nullable=False, index=True)

    # -- Application Details --
    status = Column(String(50), default="received", index=True)
    # received, screening, shortlisted, rejected, withdrawn
    source = Column(String(100))  # How they applied for THIS specific job
    cover_letter = Column(Text)
    resume_url = Column(String(500))  # Job-specific resume if different

    # -- AI Screening Results (per-job) --
    ai_score = Column(Float)          # 0-20
    ai_breakdown = Column(JSON)       # Detailed scoring
    ai_summary = Column(Text)         # AI evaluation summary
    ai_strengths = Column(JSON)       # ["strength1", "strength2"]
    ai_gaps = Column(JSON)            # ["gap1", "gap2"]
    ai_scored_at = Column(DateTime(timezone=True))
    ai_recommendation = Column(String(50))  # shortlist, review, reject

    # -- Keyword Match --
    matching_skills = Column(JSON, default=list)
    missing_skills = Column(JSON, default=list)
    match_percentage = Column(Float)

    # -- Timestamps --
    applied_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    reviewed_at = Column(DateTime(timezone=True))
    reviewed_by = Column(Integer, ForeignKey("ats_users.id"))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # -- Relationships --
    candidate = relationship("Candidate", back_populates="applications")
    job = relationship("Job", back_populates="applications")

    def __repr__(self):
        return f"<Application candidate={self.candidate_id} job={self.job_id} ({self.status})>"
