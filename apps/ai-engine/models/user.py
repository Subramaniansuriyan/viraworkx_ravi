"""
ViraWorkX ATS — User Model
Team members: Admin, Recruiter, Assessor, Ops, Viewer
"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.orm import relationship
from models.database import Base


class User(Base):
    __tablename__ = "ats_users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="viewer")
    # Roles: admin, recruiter, assessor, ops, viewer
    is_active = Column(Boolean, default=True)
    avatar_url = Column(String(500))
    phone = Column(String(50))

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    last_login = Column(DateTime(timezone=True))

    # Relationships
    notes = relationship("Note", back_populates="author", lazy="selectin")
    assigned_candidates = relationship("Candidate", back_populates="assigned_to_user", foreign_keys="Candidate.assigned_to", lazy="selectin")

    def __repr__(self):
        return f"<User {self.email} ({self.role})>"
