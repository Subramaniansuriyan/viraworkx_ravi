"""
ViraWorkX ATS — Candidate Routes
Candidate CRUD, pipeline, assessments, notes, bulk actions, analytics, export.
Extracted from viraworkx-ats main_routes.py with adjusted imports.
"""
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, asc, or_
from sqlalchemy.orm import selectinload

from core.database import get_db
from core.security import get_current_user, require_recruiter, require_assessor, require_any
from models.candidate import Candidate
from models.application import Application
from models.assessment import Assessment
from models.job import Job
from models.user import User
from models.supporting import PipelineHistory, Note, EmailTemplate
from services.ai_scorer import score_resume_against_job, calculate_tier, calculate_overall_score

router = APIRouter(tags=["Candidates"])


# -- Pydantic Schemas --
class CandidateCreate(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    location: Optional[str] = None
    current_role: Optional[str] = None
    current_company: Optional[str] = None
    experience_years: Optional[float] = None
    education: Optional[str] = None
    skills: Optional[list] = []
    primary_skills: Optional[list] = []
    expertise_domain: Optional[str] = None
    industries: Optional[list] = []
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    source: Optional[str] = None
    source_detail: Optional[str] = None


class CandidateUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    current_role: Optional[str] = None
    current_company: Optional[str] = None
    experience_years: Optional[float] = None
    education: Optional[str] = None
    skills: Optional[list] = None
    primary_skills: Optional[list] = None
    expertise_domain: Optional[str] = None
    industries: Optional[list] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    notice_period: Optional[str] = None
    expected_ctc: Optional[str] = None
    overlap_hours: Optional[int] = None
    preferred_work_type: Optional[str] = None
    availability_status: Optional[str] = None
    is_starred: Optional[bool] = None
    tags: Optional[list] = None


class CandidateResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    location: Optional[str] = None
    current_role: Optional[str] = None
    current_company: Optional[str] = None
    experience_years: Optional[float] = None
    education: Optional[str] = None
    skills: Optional[list] = []
    primary_skills: Optional[list] = []
    expertise_domain: Optional[str] = None
    industries: Optional[list] = []
    tier: Optional[str] = None
    overall_score: Optional[float] = None
    coding_score: Optional[float] = None
    communication_score: Optional[float] = None
    psychometric_score: Optional[float] = None
    ai_resume_score: Optional[float] = None
    stage: Optional[str] = None
    availability_status: Optional[str] = None
    source: Optional[str] = None
    is_starred: Optional[bool] = False
    tags: Optional[list] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ApplicationCreate(BaseModel):
    candidate_id: int
    job_id: int


class ApplicationResponse(BaseModel):
    id: int
    candidate_id: int
    job_id: int
    status: Optional[str] = None
    ai_score: Optional[float] = None
    ai_recommendation: Optional[str] = None
    applied_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class StageChangeRequest(BaseModel):
    new_stage: str
    reason: Optional[str] = None


class AssessmentCreate(BaseModel):
    candidate_id: int
    assessment_type: str  # coding, communication, psychometric
    score: float
    max_score: float = 100
    is_proctored: bool = True
    proctoring_status: Optional[str] = "pending"
    breakdown: Optional[dict] = None
    platform: Optional[str] = None
    notes: Optional[str] = None


class AssessmentResponse(BaseModel):
    id: int
    candidate_id: int
    assessment_type: str
    score: float
    max_score: Optional[float] = None
    percentage: Optional[float] = None
    is_proctored: Optional[bool] = None
    proctoring_status: Optional[str] = None
    breakdown: Optional[dict] = None
    platform: Optional[str] = None
    assessed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class NoteCreate(BaseModel):
    content: str
    note_type: str = "note"
    is_pinned: bool = False


class NoteResponse(BaseModel):
    id: int
    candidate_id: int
    author_id: int
    content: str
    note_type: Optional[str] = None
    is_pinned: Optional[bool] = False
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class BulkStageChange(BaseModel):
    candidate_ids: list[int]
    new_stage: str
    reason: Optional[str] = None


class BulkStarToggle(BaseModel):
    candidate_ids: list[int]
    starred: bool


class BulkActionResponse(BaseModel):
    success_count: int
    failed_count: int = 0
    errors: list[str] = []


# ================================================================
# CANDIDATE ROUTES
# ================================================================

@router.get("/api/candidates", response_model=list[CandidateResponse])
async def list_candidates(
    stage: Optional[str] = None,
    tier: Optional[str] = None,
    search: Optional[str] = None,
    source: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    sort_by: str = Query("created_at"),
    sort_dir: str = Query("desc"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_any),
):
    """List candidates with optional filters."""
    query = select(Candidate)

    if stage:
        query = query.where(Candidate.stage == stage)
    if tier:
        query = query.where(Candidate.tier == tier)
    if source:
        query = query.where(Candidate.source == source)
    if search:
        s = f"%{search}%"
        query = query.where(or_(
            Candidate.first_name.ilike(s),
            Candidate.last_name.ilike(s),
            Candidate.email.ilike(s),
            Candidate.current_role.ilike(s),
        ))

    sort_column = getattr(Candidate, sort_by, Candidate.created_at)
    order = desc(sort_column) if sort_dir == "desc" else asc(sort_column)
    query = query.order_by(order).offset(offset).limit(limit)

    result = await db.execute(query)
    return result.scalars().all()


@router.post("/api/candidates", response_model=CandidateResponse, status_code=201)
async def create_candidate(
    data: CandidateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_recruiter),
):
    """Create a new candidate."""
    # Check duplicate email
    existing = await db.execute(select(Candidate).where(Candidate.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Candidate with this email already exists")

    candidate = Candidate(**data.model_dump())
    db.add(candidate)
    await db.flush()
    await db.refresh(candidate)
    return candidate


@router.get("/api/candidates/{candidate_id}", response_model=CandidateResponse)
async def get_candidate(
    candidate_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_any),
):
    """Get candidate detail."""
    result = await db.execute(select(Candidate).where(Candidate.id == candidate_id))
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate


@router.put("/api/candidates/{candidate_id}", response_model=CandidateResponse)
async def update_candidate(
    candidate_id: int,
    data: CandidateUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_recruiter),
):
    """Update candidate profile."""
    result = await db.execute(select(Candidate).where(Candidate.id == candidate_id))
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(candidate, field, value)

    candidate.last_activity_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(candidate)
    return candidate


# ================================================================
# APPLICATION / PIPELINE ROUTES
# ================================================================

@router.post("/api/applications", response_model=ApplicationResponse)
async def create_application(
    data: ApplicationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_recruiter),
):
    """Apply a candidate to a job."""
    # Check for duplicates
    existing = await db.execute(
        select(Application).where(
            Application.candidate_id == data.candidate_id,
            Application.job_id == data.job_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Candidate already applied to this job")

    application = Application(candidate_id=data.candidate_id, job_id=data.job_id)
    db.add(application)
    await db.flush()

    # Log stage history
    history = PipelineHistory(
        candidate_id=data.candidate_id,
        to_stage="applied",
    )
    db.add(history)

    await db.refresh(application)
    return application


@router.put("/api/applications/{application_id}/stage", response_model=ApplicationResponse)
async def change_stage(
    application_id: int,
    data: StageChangeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_recruiter),
):
    """Move a candidate to a new pipeline stage."""
    result = await db.execute(
        select(Application).where(Application.id == application_id)
        .options(selectinload(Application.candidate))
    )
    application = result.scalar_one_or_none()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    old_stage = application.status
    application.status = data.new_stage
    application.updated_at = datetime.now(timezone.utc)

    # Stage history
    history = PipelineHistory(
        candidate_id=application.candidate_id,
        from_stage=old_stage,
        to_stage=data.new_stage,
        reason=data.reason,
        moved_by=current_user.id,
    )
    db.add(history)

    # Update candidate's last activity
    if application.candidate:
        application.candidate.last_activity_at = datetime.now(timezone.utc)

    await db.flush()
    await db.refresh(application)
    return application


@router.get("/api/applications/pipeline")
async def get_pipeline(
    job_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_any),
):
    """Get pipeline view -- candidates grouped by stage."""
    query = select(Application).options(selectinload(Application.candidate))

    if job_id:
        query = query.where(Application.job_id == job_id)

    result = await db.execute(query.order_by(desc(Application.updated_at)))
    applications = result.scalars().all()

    stages = [
        "applied", "phone_screen", "enrolled", "assessment", "tier_allocation",
        "onboarded", "client_submission", "client_interview", "agreement_signing",
        "deployed", "rejected",
    ]

    pipeline = {}
    for stage in stages:
        pipeline[stage] = {
            "stage": stage,
            "label": stage.replace("_", " ").title(),
            "count": 0,
            "candidates": [],
        }

    for app in applications:
        stage_data = pipeline.get(app.status)
        if stage_data:
            stage_data["count"] += 1
            stage_data["candidates"].append({
                "application_id": app.id,
                "candidate_id": app.candidate_id,
                "name": app.candidate.full_name if app.candidate else "Unknown",
                "email": app.candidate.email if app.candidate else "",
                "role": app.candidate.current_role if app.candidate else "",
                "tier": app.candidate.tier if app.candidate else "unscored",
                "overall_score": app.candidate.overall_score if app.candidate else None,
                "ai_score": app.ai_score,
            })

    return list(pipeline.values())


# ================================================================
# ASSESSMENT ROUTES
# ================================================================

@router.post("/api/assessments", response_model=AssessmentResponse)
async def create_assessment(
    data: AssessmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_assessor),
):
    """Submit an assessment score for a candidate."""
    # Verify candidate exists
    result = await db.execute(select(Candidate).where(Candidate.id == data.candidate_id))
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    assessment = Assessment(
        candidate_id=data.candidate_id,
        assessment_type=data.assessment_type,
        score=data.score,
        max_score=data.max_score,
        percentage=round(data.score / data.max_score * 100, 1) if data.max_score else None,
        is_proctored=data.is_proctored,
        proctoring_status=data.proctoring_status,
        breakdown=data.breakdown,
        platform=data.platform,
        notes=data.notes,
        assessed_by=current_user.id,
    )
    db.add(assessment)
    await db.flush()

    # Update candidate's score for this assessment type
    if data.assessment_type == "coding":
        candidate.coding_score = data.score
    elif data.assessment_type == "communication":
        candidate.communication_score = data.score
    elif data.assessment_type == "psychometric":
        candidate.psychometric_score = data.score

    # Recalculate overall score if all three are present
    if (candidate.coding_score is not None
            and candidate.communication_score is not None
            and candidate.psychometric_score is not None):
        candidate.overall_score = calculate_overall_score(
            candidate.coding_score, candidate.communication_score, candidate.psychometric_score
        )
        candidate.tier = calculate_tier(candidate.overall_score)

    candidate.last_activity_at = datetime.now(timezone.utc)
    await db.refresh(assessment)
    return assessment


@router.get("/api/candidates/{candidate_id}/assessments", response_model=list[AssessmentResponse])
async def get_candidate_assessments(
    candidate_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_any),
):
    """Get all assessments for a candidate."""
    result = await db.execute(
        select(Assessment).where(Assessment.candidate_id == candidate_id)
        .order_by(desc(Assessment.created_at))
    )
    return result.scalars().all()


# ================================================================
# NOTES ROUTES
# ================================================================

@router.post("/api/candidates/{candidate_id}/notes", response_model=NoteResponse)
async def add_note(
    candidate_id: int,
    data: NoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_any),
):
    """Add a note to a candidate."""
    note = Note(
        candidate_id=candidate_id,
        author_id=current_user.id,
        content=data.content,
        note_type=data.note_type,
        is_pinned=data.is_pinned,
    )
    db.add(note)
    await db.flush()
    await db.refresh(note)
    return note


@router.get("/api/candidates/{candidate_id}/notes", response_model=list[NoteResponse])
async def get_notes(
    candidate_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_any),
):
    """Get all notes for a candidate."""
    result = await db.execute(
        select(Note).where(Note.candidate_id == candidate_id)
        .order_by(desc(Note.created_at))
    )
    return result.scalars().all()


# ================================================================
# BULK ACTIONS
# ================================================================

@router.post("/api/bulk/stage-change", response_model=BulkActionResponse)
async def bulk_stage_change(
    data: BulkStageChange,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_recruiter),
):
    """Change stage for multiple candidates at once."""
    success = 0
    errors = []

    for cid in data.candidate_ids:
        try:
            result = await db.execute(
                select(Application).where(Application.candidate_id == cid)
                .order_by(desc(Application.updated_at))
                .limit(1)
            )
            app = result.scalar_one_or_none()
            if app:
                old = app.status
                app.status = data.new_stage
                app.updated_at = datetime.now(timezone.utc)

                history = PipelineHistory(
                    candidate_id=cid,
                    from_stage=old,
                    to_stage=data.new_stage,
                    reason=data.reason,
                    moved_by=current_user.id,
                )
                db.add(history)
                success += 1
            else:
                errors.append(f"No application found for candidate {cid}")
        except Exception as e:
            errors.append(f"Error for {cid}: {str(e)}")

    return BulkActionResponse(success_count=success, failed_count=len(errors), errors=errors)


@router.post("/api/bulk/star", response_model=BulkActionResponse)
async def bulk_star(
    data: BulkStarToggle,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_recruiter),
):
    """Star/unstar multiple candidates."""
    result = await db.execute(
        select(Candidate).where(Candidate.id.in_(data.candidate_ids))
    )
    candidates = result.scalars().all()
    for c in candidates:
        c.is_starred = data.starred
    return BulkActionResponse(success_count=len(candidates), failed_count=len(data.candidate_ids) - len(candidates))


# ================================================================
# AI SCREENING ROUTES
# ================================================================

@router.post("/api/ai/screen/{application_id}")
async def ai_screen_application(
    application_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_recruiter),
):
    """Run AI screening on a specific application."""
    result = await db.execute(
        select(Application).where(Application.id == application_id)
        .options(selectinload(Application.candidate), selectinload(Application.job))
    )
    application = result.scalar_one_or_none()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    candidate = application.candidate
    job = application.job

    if not candidate or not candidate.resume_text:
        raise HTTPException(status_code=400, detail="Candidate has no resume text to screen")

    ai_result = await score_resume_against_job(
        resume_text=candidate.resume_text,
        job_description=job.description,
        skills=candidate.skills or [],
        experience_years=candidate.experience_years or 0,
        industries=candidate.industries or [],
    )

    if not ai_result:
        raise HTTPException(status_code=500, detail="AI scoring failed")

    application.ai_score = ai_result.get("total_score", 0)
    application.ai_breakdown = ai_result
    application.ai_recommendation = ai_result.get("recommendation")
    application.ai_scored_at = datetime.now(timezone.utc)

    candidate.ai_resume_score = ai_result.get("total_score", 0)
    candidate.ai_resume_breakdown = ai_result
    candidate.ai_scored_at = datetime.now(timezone.utc)

    return {"status": "ok", "result": ai_result}


# ================================================================
# ANALYTICS / DASHBOARD
# ================================================================

@router.get("/api/analytics/dashboard")
async def get_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_any),
):
    """Get dashboard analytics."""
    from datetime import timedelta

    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    # Total counts
    total_candidates = (await db.execute(select(func.count(Candidate.id)))).scalar()
    total_jobs = (await db.execute(select(func.count(Job.id)))).scalar()
    active_jobs = (await db.execute(
        select(func.count(Job.id)).where(Job.status == "active")
    )).scalar()

    # Tier counts
    tier_counts = {}
    for tier_name in ["Tier 1", "Tier 2", "Tier 3"]:
        count = (await db.execute(
            select(func.count(Candidate.id)).where(Candidate.tier == tier_name)
        )).scalar()
        tier_counts[tier_name] = count

    # Average score
    avg_score = (await db.execute(
        select(func.avg(Candidate.overall_score)).where(Candidate.overall_score.is_not(None))
    )).scalar()

    # This week / month
    this_week = (await db.execute(
        select(func.count(Candidate.id)).where(Candidate.created_at >= week_ago)
    )).scalar()
    this_month = (await db.execute(
        select(func.count(Candidate.id)).where(Candidate.created_at >= month_ago)
    )).scalar()

    return {
        "total_candidates": total_candidates,
        "total_jobs": total_jobs,
        "active_jobs": active_jobs,
        "tier_1_count": tier_counts.get("Tier 1", 0),
        "tier_2_count": tier_counts.get("Tier 2", 0),
        "tier_3_count": tier_counts.get("Tier 3", 0),
        "average_score": round(avg_score, 1) if avg_score else None,
        "candidates_this_week": this_week,
        "candidates_this_month": this_month,
    }


# ================================================================
# EMAIL TEMPLATES
# ================================================================

@router.get("/api/email-templates")
async def list_email_templates(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_any),
):
    """List all email templates."""
    result = await db.execute(select(EmailTemplate))
    return result.scalars().all()


# ================================================================
# PUBLIC ENDPOINTS (No auth -- for job applications)
# ================================================================

@router.get("/api/public/jobs")
async def public_list_jobs(db: AsyncSession = Depends(get_db)):
    """Public endpoint -- list active jobs for careers page."""
    result = await db.execute(
        select(Job).where(Job.status == "active").order_by(desc(Job.published_at))
    )
    jobs = result.scalars().all()
    return [
        {
            "id": j.id,
            "title": j.title,
            "location": j.location,
            "employment_type": j.employment_type,
            "experience_min": j.experience_min,
            "experience_max": j.experience_max,
            "industry": j.industry,
            "expertise_domain": j.expertise_domain,
            "published_at": j.published_at.isoformat() if j.published_at else None,
        }
        for j in jobs
    ]


@router.get("/api/public/jobs/{job_id}")
async def public_get_job(job_id: int, db: AsyncSession = Depends(get_db)):
    """Public endpoint -- get job details by ID."""
    result = await db.execute(
        select(Job).where(Job.id == job_id, Job.status == "active")
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {
        "id": job.id,
        "title": job.title,
        "description": job.description,
        "short_description": job.short_description,
        "location": job.location,
        "employment_type": job.employment_type,
        "experience_min": job.experience_min,
        "experience_max": job.experience_max,
        "required_skills": job.required_skills,
        "preferred_skills": job.preferred_skills,
        "industry": job.industry,
        "expertise_domain": job.expertise_domain,
        "published_at": job.published_at.isoformat() if job.published_at else None,
    }


@router.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "app": "ViraWorkX ATS",
        "version": "1.0.0",
    }
