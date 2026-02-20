"""
ViraWorkX ATS — Assessment Model
Individual assessment records (Coding, Communication, Psychometric).
Supports re-assessments and score history.
"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Text, Float, JSON, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from models.database import Base


class Assessment(Base):
    __tablename__ = "ats_assessments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    candidate_id = Column(Integer, ForeignKey("ats_candidates.id"), nullable=False, index=True)

    # -- Assessment Type --
    assessment_type = Column(String(50), nullable=False, index=True)
    # coding, communication, psychometric

    # -- Score --
    score = Column(Float, nullable=False)  # 0-100
    max_score = Column(Float, default=100)
    percentage = Column(Float)  # score/max_score * 100

    # -- Proctoring --
    is_proctored = Column(Boolean, default=True)
    proctoring_status = Column(String(50), default="pending")
    # pending, completed, flagged, cleared
    proctoring_notes = Column(Text)
    proctoring_flags = Column(JSON, default=list)  # ["tab_switch", "face_not_detected", etc.]

    # -- Details --
    breakdown = Column(JSON)  # Detailed breakdown per section
    duration_minutes = Column(Integer)  # How long the assessment took
    platform = Column(String(100))      # Which assessment platform was used
    external_id = Column(String(255))   # ID from external assessment platform

    # -- Metadata --
    assessed_by = Column(Integer, ForeignKey("ats_users.id"))  # Who recorded the score
    notes = Column(Text)
    is_latest = Column(Boolean, default=True)  # For re-assessments, only latest = True

    # -- Timestamps --
    assessed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # -- Relationships --
    candidate = relationship("Candidate", back_populates="assessments")

    def __repr__(self):
        return f"<Assessment {self.assessment_type}={self.score} for candidate={self.candidate_id}>"
