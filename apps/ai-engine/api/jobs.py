"""
ViraWorkX ATS — Job Routes
Create, update, list, and manage job postings.
"""
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from core.database import get_db
from core.security import get_current_user, require_recruiter
from models.user import User
from models.job import Job
from models.application import Application

router = APIRouter(prefix="/jobs", tags=["Jobs"])


# -- Pydantic Schemas --
class JobCreate(BaseModel):
    title: str
    description: str
    short_description: Optional[str] = None
    department: Optional[str] = None
    required_skills: Optional[list] = []
    preferred_skills: Optional[list] = []
    experience_min: Optional[int] = 0
    experience_max: Optional[int] = 15
    education_required: Optional[str] = None
    industry: Optional[str] = None
    expertise_domain: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    billing_rate_min: Optional[float] = None
    billing_rate_max: Optional[float] = None
    location: Optional[str] = "Remote"
    overlap_hours_required: Optional[int] = 4
    employment_type: Optional[str] = "contract"
    timezone_preference: Optional[str] = None
    status: Optional[str] = "draft"
    application_email: Optional[str] = "jobs@viraworkx.ai"
    ai_passing_score: Optional[int] = 15
    auto_reject_below: Optional[int] = 10


class JobUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    short_description: Optional[str] = None
    department: Optional[str] = None
    required_skills: Optional[list] = None
    preferred_skills: Optional[list] = None
    experience_min: Optional[int] = None
    experience_max: Optional[int] = None
    education_required: Optional[str] = None
    industry: Optional[str] = None
    expertise_domain: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    billing_rate_min: Optional[float] = None
    billing_rate_max: Optional[float] = None
    location: Optional[str] = None
    overlap_hours_required: Optional[int] = None
    employment_type: Optional[str] = None
    timezone_preference: Optional[str] = None
    status: Optional[str] = None
    application_email: Optional[str] = None
    ai_passing_score: Optional[int] = None
    auto_reject_below: Optional[int] = None


class JobResponse(BaseModel):
    id: int
    title: str
    description: str
    short_description: Optional[str] = None
    department: Optional[str] = None
    required_skills: Optional[list] = []
    preferred_skills: Optional[list] = []
    experience_min: Optional[int] = None
    experience_max: Optional[int] = None
    education_required: Optional[str] = None
    industry: Optional[str] = None
    expertise_domain: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    billing_rate_min: Optional[float] = None
    billing_rate_max: Optional[float] = None
    location: Optional[str] = None
    overlap_hours_required: Optional[int] = None
    employment_type: Optional[str] = None
    timezone_preference: Optional[str] = None
    status: Optional[str] = None
    published_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    application_email: Optional[str] = None
    ai_passing_score: Optional[int] = None
    auto_reject_below: Optional[int] = None
    created_by: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    application_count: Optional[int] = 0

    model_config = {"from_attributes": True}


@router.get("", response_model=list[JobResponse])
async def list_jobs(
    status: str = Query(None, description="Filter by status"),
    industry: str = Query(None),
    search: str = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List all job postings with optional filters."""
    query = select(Job).order_by(Job.created_at.desc())

    if status:
        query = query.where(Job.status == status)
    if industry:
        query = query.where(Job.industry == industry)
    if search:
        query = query.where(
            Job.title.ilike(f"%{search}%") | Job.description.ilike(f"%{search}%")
        )

    result = await db.execute(query)
    jobs = result.scalars().all()

    responses = []
    for job in jobs:
        # Count applications
        count_result = await db.execute(
            select(func.count(Application.id)).where(Application.job_id == job.id)
        )
        app_count = count_result.scalar() or 0

        resp = JobResponse.model_validate(job)
        resp.application_count = app_count
        responses.append(resp)

    return responses


@router.post("", response_model=JobResponse, status_code=201)
async def create_job(
    req: JobCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_recruiter),
):
    """Create a new job posting."""
    job = Job(
        **req.model_dump(),
        created_by=user.id,
    )
    if req.status == "active":
        job.published_at = datetime.now(timezone.utc)

    db.add(job)
    await db.commit()
    await db.refresh(job)
    return JobResponse.model_validate(job)


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get a single job posting."""
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    count_result = await db.execute(
        select(func.count(Application.id)).where(Application.job_id == job.id)
    )
    resp = JobResponse.model_validate(job)
    resp.application_count = count_result.scalar() or 0
    return resp


@router.put("/{job_id}", response_model=JobResponse)
async def update_job(
    job_id: int,
    req: JobUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_recruiter),
):
    """Update a job posting."""
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    update_data = req.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(job, field, value)

    # Track publish/close
    if req.status == "active" and not job.published_at:
        job.published_at = datetime.now(timezone.utc)
    elif req.status == "closed":
        job.closed_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(job)
    return JobResponse.model_validate(job)


@router.delete("/{job_id}", status_code=204)
async def delete_job(
    job_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_recruiter),
):
    """Delete (close) a job posting."""
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job.status = "closed"
    job.closed_at = datetime.now(timezone.utc)
    await db.commit()
