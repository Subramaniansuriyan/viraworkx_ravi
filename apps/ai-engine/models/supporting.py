"""
ViraWorkX ATS — Supporting Models
PipelineHistory, Note, EmailTemplate, EmailLog
"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Text, Float, JSON, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from models.database import Base


class PipelineHistory(Base):
    """Audit log of all stage transitions."""
    __tablename__ = "ats_pipeline_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    candidate_id = Column(Integer, ForeignKey("ats_candidates.id"), nullable=False, index=True)

    from_stage = Column(String(50))
    to_stage = Column(String(50), nullable=False)
    reason = Column(Text)        # Why the move happened
    moved_by = Column(Integer, ForeignKey("ats_users.id"))  # Who moved them
    is_automated = Column(Boolean, default=False)  # Was this an auto-transition?

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    candidate = relationship("Candidate", back_populates="pipeline_history")

    def __repr__(self):
        return f"<PipelineHistory {self.from_stage} -> {self.to_stage}>"


class Note(Base):
    """Candidate notes and activity log."""
    __tablename__ = "ats_notes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    candidate_id = Column(Integer, ForeignKey("ats_candidates.id"), nullable=False, index=True)
    author_id = Column(Integer, ForeignKey("ats_users.id"), nullable=False)

    content = Column(Text, nullable=False)
    note_type = Column(String(50), default="note")
    # note, phone_screen, interview_feedback, system, stage_change, email_sent

    is_pinned = Column(Boolean, default=False)
    mentions = Column(JSON, default=list)  # [user_id, user_id] for @mentions

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    candidate = relationship("Candidate", back_populates="notes")
    author = relationship("User", back_populates="notes")

    def __repr__(self):
        return f"<Note by={self.author_id} for candidate={self.candidate_id}>"


class EmailTemplate(Base):
    """Reusable email templates triggered by stage changes."""
    __tablename__ = "ats_email_templates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False, unique=True)
    subject = Column(String(500), nullable=False)
    body_html = Column(Text, nullable=False)
    body_text = Column(Text)  # Plain text fallback

    # -- Trigger --
    trigger_stage = Column(String(50), index=True)  # Which stage triggers this
    is_auto_send = Column(Boolean, default=False)    # Send automatically on stage change?
    is_active = Column(Boolean, default=True)

    # Variables available:
    # {{candidate_name}}, {{candidate_email}}, {{job_title}}, {{company_name}},
    # {{stage}}, {{tier}}, {{score}}, {{assessment_link}}, {{portal_link}}

    created_by = Column(Integer, ForeignKey("ats_users.id"))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<EmailTemplate {self.name}>"


class EmailLog(Base):
    """Log of all emails sent to/about candidates."""
    __tablename__ = "ats_email_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    candidate_id = Column(Integer, ForeignKey("ats_candidates.id"), nullable=False, index=True)

    template_id = Column(Integer, ForeignKey("ats_email_templates.id"), nullable=True)
    to_email = Column(String(255), nullable=False)
    from_email = Column(String(255))
    subject = Column(String(500), nullable=False)
    body_preview = Column(Text)  # First 200 chars

    status = Column(String(50), default="sent")
    # queued, sent, delivered, opened, clicked, bounced, failed
    provider_id = Column(String(255))  # SendGrid message ID
    error_message = Column(Text)

    sent_by = Column(Integer, ForeignKey("ats_users.id"))
    sent_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    candidate = relationship("Candidate", back_populates="email_logs")

    def __repr__(self):
        return f"<EmailLog to={self.to_email} ({self.status})>"
