"""API routes package for ATS endpoints."""
from .candidates import router as candidates_router
from .jobs import router as jobs_router
from .auth import router as auth_router

__all__ = ["candidates_router", "jobs_router", "auth_router"]
