"""Models package — AI actions + ATS domain models"""
from .database import (
    AiAction,
    AgentType,
    ActionStatus,
    Base,
    get_session,
    init_db,
    async_session
)

# ATS Models
from .candidate import Candidate
from .application import Application
from .assessment import Assessment
from .job import Job
from .user import User
from .supporting import PipelineHistory, Note, EmailTemplate, EmailLog

__all__ = [
    # Existing AI engine
    "AiAction",
    "AgentType",
    "ActionStatus",
    "Base",
    "get_session",
    "init_db",
    "async_session",
    # ATS models
    "Candidate",
    "Application",
    "Assessment",
    "Job",
    "User",
    "PipelineHistory",
    "Note",
    "EmailTemplate",
    "EmailLog",
]
