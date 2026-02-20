"""
ViraWorkX ATS — Celery Configuration
Background task processing for resume parsing, AI scoring, email sending.
"""
from celery import Celery
from celery.schedules import crontab
from config import get_settings

settings = get_settings()

celery_app = Celery(
    "viraworkx_ats",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.REDIS_URL,
    include=[
        "services.resume_parser",
        "services.ai_scorer",
        "services.email_service",
        "services.email_intake",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_soft_time_limit=300,  # 5 min soft limit
    task_time_limit=600,       # 10 min hard limit
)

# Scheduled tasks
celery_app.conf.beat_schedule = {
    # Check email inbox every 2 minutes for new resumes
    "check-email-inbox": {
        "task": "services.email_intake.check_inbox",
        "schedule": crontab(minute="*/2"),
    },
    # Clean up stale processing jobs every hour
    "cleanup-stale-jobs": {
        "task": "services.resume_parser.cleanup_stale",
        "schedule": crontab(minute=0),
    },
}
