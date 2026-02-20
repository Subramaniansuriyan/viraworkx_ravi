"""
ViraWorkX ATS — Candidate Model
Complete candidate profile: contact, skills, scores, industry, expertise, tier.
"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Float, JSON, ForeignKey
from sqlalchemy.orm import relationship
from models.database import Base


class Candidate(Base):
    __tablename__ = "ats_candidates"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # -- Personal Info --
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(50), index=True)
    location = Column(String(200))
    city = Column(String(100))
    country = Column(String(100), default="India")

    # -- Professional Profile --
    current_role = Column(String(200))
    current_company = Column(String(200))
    experience_years = Column(Float, default=0)
    education = Column(String(100))  # Bachelor's, Master's, PhD, Self-taught, Bootcamp
    education_institution = Column(String(200))

    # -- Skills & Expertise --
    skills = Column(JSON, default=list)              # ["Python", "React", "AWS"]
    primary_skills = Column(JSON, default=list)      # Top 3-5 skills
    expertise_domain = Column(String(100))           # AI/ML, DevOps, Full Stack, etc.
    industries = Column(JSON, default=list)          # ["Fintech", "SaaS", "HealthTech"]
    certifications = Column(JSON, default=list)      # ["AWS Solutions Architect", ...]

    # -- Links --
    linkedin_url = Column(String(500))
    github_url = Column(String(500))
    portfolio_url = Column(String(500))
    resume_url = Column(String(500))  # S3 URL to stored resume
    resume_filename = Column(String(255))

    # -- Parsed Resume Data --
    resume_parsed = Column(JSON)  # Full parsed data from AI
    resume_text = Column(Text)    # Raw extracted text for search
    resume_parsed_at = Column(DateTime(timezone=True))

    # -- Assessment Scores (entered after proctored assessments) --
    coding_score = Column(Float)         # 0-100
    communication_score = Column(Float)  # 0-100
    psychometric_score = Column(Float)   # 0-100
    overall_score = Column(Float)        # Weighted: 50/30/20
    proctoring_status = Column(String(50))  # pending, completed, flagged, cleared

    # -- AI Resume Score (initial screening) --
    ai_resume_score = Column(Float)       # 0-20 (from Claude JD matching)
    ai_resume_breakdown = Column(JSON)    # Detailed breakdown from AI
    ai_scored_at = Column(DateTime(timezone=True))

    # -- Tier --
    tier = Column(String(20), index=True)  # "Tier 1", "Tier 2", "Tier 3", "Rejected"
    tier_assigned_at = Column(DateTime(timezone=True))
    previous_tier = Column(String(20))  # For re-assessment tracking

    # -- Pipeline --
    stage = Column(String(50), default="applied", index=True)
    # applied, phone_screen, enrolled, assessment, tier_allocation,
    # onboarded, client_submission, client_interview, agreement_signing, deployed, rejected
    stage_updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # -- Availability & Logistics --
    availability_status = Column(String(50), default="available")
    # available, available_soon, currently_deployed, not_available
    notice_period = Column(String(50))  # Immediate, 15 days, 30 days, 60 days, 90 days
    expected_ctc = Column(String(50))   # e.g. "$40k/yr", "12L/yr"
    overlap_hours = Column(Integer, default=4)  # Daily US-India overlap
    preferred_work_type = Column(String(50), default="remote")  # remote, hybrid, onsite

    # -- Source Tracking --
    source = Column(String(100), index=True)
    # linkedin, referral, job_board, direct_apply, agency, careers_page, github, email_intake
    source_detail = Column(String(255))  # Specific referrer, job board name, etc.
    referral_by = Column(String(200))    # Name of referrer if applicable

    # -- Agreement & Compliance --
    talent_agreement_status = Column(String(50), default="not_sent")
    # not_sent, sent, signed, expired
    talent_agreement_signed_at = Column(DateTime(timezone=True))
    background_check_status = Column(String(50), default="pending")
    # pending, in_progress, cleared, flagged
    id_verified = Column(Boolean, default=False)

    # -- Billing --
    internal_rate = Column(Float)   # What ViraWorkX pays the talent (USD/hr)
    billing_rate = Column(Float)    # What client pays ViraWorkX (USD/hr)

    # -- Flags --
    is_starred = Column(Boolean, default=False)
    is_archived = Column(Boolean, default=False)
    tags = Column(JSON, default=list)  # Custom tags

    # -- Team --
    assigned_to = Column(Integer, ForeignKey("ats_users.id"), nullable=True)

    # -- Timestamps --
    applied_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    last_activity_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # -- Relationships --
    applications = relationship("Application", back_populates="candidate", lazy="selectin")
    assessments = relationship("Assessment", back_populates="candidate", lazy="selectin", order_by="Assessment.created_at.desc()")
    notes = relationship("Note", back_populates="candidate", lazy="selectin", order_by="Note.created_at.desc()")
    pipeline_history = relationship("PipelineHistory", back_populates="candidate", lazy="selectin", order_by="PipelineHistory.created_at.desc()")
    email_logs = relationship("EmailLog", back_populates="candidate", lazy="selectin")
    assigned_to_user = relationship("User", back_populates="assigned_candidates", foreign_keys=[assigned_to])

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def initials(self):
        return f"{self.first_name[0]}{self.last_name[0]}".upper()

    def calculate_overall_score(self, coding_w=0.50, comm_w=0.30, psych_w=0.20):
        """Calculate weighted overall score from individual assessments."""
        if self.coding_score is None or self.communication_score is None or self.psychometric_score is None:
            return None
        return round(
            self.coding_score * coding_w +
            self.communication_score * comm_w +
            self.psychometric_score * psych_w,
            1
        )

    def assign_tier(self, t1=85, t2=70, t3=60):
        """Assign tier based on overall score thresholds."""
        if self.overall_score is None:
            return None
        if self.overall_score >= t1:
            return "Tier 1"
        elif self.overall_score >= t2:
            return "Tier 2"
        elif self.overall_score >= t3:
            return "Tier 3"
        else:
            return "Rejected"

    def __repr__(self):
        return f"<Candidate {self.full_name} ({self.tier or 'Unscored'})>"
