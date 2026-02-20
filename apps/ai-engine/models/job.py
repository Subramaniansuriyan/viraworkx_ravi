"""
ViraWorkX ATS — Job Model
Job postings with skills, industry, experience, and publishing metadata.
"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Float, JSON
from sqlalchemy.orm import relationship
from models.database import Base


class Job(Base):
    __tablename__ = "ats_jobs"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # -- Basic Info --
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=False)  # Full JD (rich text / markdown)
    short_description = Column(Text)  # One-liner for listings
    department = Column(String(100))

    # -- Requirements --
    required_skills = Column(JSON, default=list)      # ["Python", "React", "AWS"]
    preferred_skills = Column(JSON, default=list)      # ["Docker", "K8s"]
    experience_min = Column(Integer, default=0)        # Years
    experience_max = Column(Integer, default=15)
    education_required = Column(String(100))           # "Bachelor's", "Master's", etc.

    # -- Industry & Domain --
    industry = Column(String(100))  # Fintech, HealthTech, SaaS, EdTech, etc.
    expertise_domain = Column(String(100))  # AI/ML, Data Engineering, DevOps, etc.

    # -- Compensation --
    salary_min = Column(Float)  # USD annual
    salary_max = Column(Float)
    billing_rate_min = Column(Float)  # Client billing rate
    billing_rate_max = Column(Float)

    # -- Work Details --
    location = Column(String(100), default="Remote")
    overlap_hours_required = Column(Integer, default=4)  # US-India overlap
    employment_type = Column(String(50), default="contract")  # contract, full-time
    timezone_preference = Column(String(100))

    # -- Publishing --
    status = Column(String(50), default="draft", index=True)
    # draft, active, paused, closed
    published_at = Column(DateTime(timezone=True))
    closed_at = Column(DateTime(timezone=True))
    linkedin_post_url = Column(String(500))
    careers_page_url = Column(String(500))
    application_email = Column(String(255), default="jobs@viraworkx.ai")

    # -- AI Scoring Config --
    ai_passing_score = Column(Integer, default=15)  # Out of 20 for AI resume screen
    auto_reject_below = Column(Integer, default=10)

    # -- Metadata --
    created_by = Column(Integer)  # User ID
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # -- Relationships --
    applications = relationship("Application", back_populates="job", lazy="selectin")

    def __repr__(self):
        return f"<Job {self.title} ({self.status})>"
