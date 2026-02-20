"""Database models and connection for AI Engine"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import Column, String, Integer, DateTime, Text, Boolean, JSON, Enum as SQLEnum
from datetime import datetime
from enum import Enum
import uuid

from config import settings

# Use the shared Base from core.database so all models share metadata
from core.database import Base, async_session, engine

# Re-export for backward compat
__all__ = [
    "Base", "async_session", "engine",
    "AgentType", "ActionStatus", "AiAction",
    "get_session", "init_db",
]


class AgentType(str, Enum):
    SOURCING = "sourcing"
    SCREENING = "screening"
    SCHEDULING = "scheduling"
    COMMUNICATION = "communication"
    ANALYTICS = "analytics"
    RESUME_PARSER = "resume_parser"
    JOB_MATCHER = "job_matcher"


class ActionStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    AWAITING_APPROVAL = "awaiting_approval"
    APPROVED = "approved"
    REJECTED = "rejected"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class AiAction(Base):
    """Model for tracking AI agent actions with HITL support"""
    __tablename__ = "ai_actions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    agent_type = Column(String(50), nullable=False)
    action_type = Column(String(100), nullable=False)
    entity_type = Column(String(50))  # e.g., 'application', 'candidate', 'job'
    entity_id = Column(String(36))

    # Input/Output data
    input_payload = Column(JSON)
    output_payload = Column(JSON)

    # Status tracking
    status = Column(String(20), default=ActionStatus.PENDING.value)
    error_message = Column(Text)

    # HITL fields
    requires_approval = Column(Boolean, default=False)
    approval_reason = Column(Text)  # Why approval is needed
    approved_by = Column(String(36))  # User ID who approved
    approved_at = Column(DateTime)
    rejection_reason = Column(Text)

    # Confidence and scoring
    confidence_score = Column(Integer)  # 0-100
    match_score = Column(Integer)  # For screening results

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    executed_at = Column(DateTime)
    completed_at = Column(DateTime)

    def to_dict(self):
        return {
            "id": self.id,
            "agentType": self.agent_type,
            "actionType": self.action_type,
            "entityType": self.entity_type,
            "entityId": self.entity_id,
            "inputPayload": self.input_payload,
            "outputPayload": self.output_payload,
            "status": self.status,
            "errorMessage": self.error_message,
            "requiresApproval": self.requires_approval,
            "approvalReason": self.approval_reason,
            "approvedBy": self.approved_by,
            "approvedAt": self.approved_at.isoformat() if self.approved_at else None,
            "rejectionReason": self.rejection_reason,
            "confidenceScore": self.confidence_score,
            "matchScore": self.match_score,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "executedAt": self.executed_at.isoformat() if self.executed_at else None,
            "completedAt": self.completed_at.isoformat() if self.completed_at else None,
        }


async def get_session() -> AsyncSession:
    async with async_session() as session:
        yield session


async def init_db():
    """Initialize database tables"""
    async with engine.begin() as conn:
        # Create tables if they don't exist
        # Note: In production, use Alembic migrations
        await conn.run_sync(Base.metadata.create_all)
