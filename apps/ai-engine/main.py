"""
ViraWorkx AI Engine - FastAPI Application
Human-in-the-Loop AI Pipeline for Recruiting
"""
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from contextlib import asynccontextmanager
import logging
import uvicorn

from config import settings
from models import AiAction, ActionStatus, async_session, init_db
from agents.screening_agent import screening_agent
from agents.scheduling_agent import scheduling_agent
from services.resume_parser import resume_parser
from services.job_matcher import job_matcher

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize and cleanup resources"""
    logger.info("Starting AI Engine...")
    # Initialize database tables (if needed)
    # await init_db()
    yield
    logger.info("Shutting down AI Engine...")


# Create FastAPI app
app = FastAPI(
    title="ViraWorkx AI Engine",
    description="AI-powered recruiting pipeline with Human-in-the-Loop support",
    version="2.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:4000",
        "http://localhost:5173",
        "https://www.viraworkx.ai"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== Pydantic Models ====================

class ScreeningRequest(BaseModel):
    application_id: str
    candidate_profile: Dict[str, Any]
    job_requirements: Dict[str, Any]
    resume_content: Optional[str] = None
    assessment_results: Optional[Dict[str, Any]] = None


class ScreeningResponse(BaseModel):
    action_id: str
    status: str
    result: Dict[str, Any]
    requires_approval: bool


class SchedulingRequest(BaseModel):
    application_id: str
    candidate_availability: Optional[List[Dict[str, str]]] = None
    interviewer_availability: Optional[List[Dict[str, str]]] = None
    duration_minutes: int = 60
    us_timezone: str = "PST"
    preferred_dates: Optional[List[str]] = None
    interview_type: str = "video"


class ResumeParseRequest(BaseModel):
    resume_text: str
    file_type: str = "text"


class JobMatchRequest(BaseModel):
    candidate: Dict[str, Any]
    jobs: List[Dict[str, Any]]
    top_n: int = 10


class CandidateRankRequest(BaseModel):
    job: Dict[str, Any]
    candidates: List[Dict[str, Any]]
    include_ai_analysis: bool = True


class ApprovalRequest(BaseModel):
    approved: bool
    reviewer_id: str
    reviewer_notes: Optional[str] = None


class ActionFilterParams(BaseModel):
    status: Optional[str] = None
    agent_type: Optional[str] = None
    requires_approval: Optional[bool] = None
    entity_type: Optional[str] = None
    limit: int = 50
    offset: int = 0


# ==================== Health Check ====================

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "ai-engine",
        "version": "2.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }


# ==================== Screening Endpoints ====================

@app.post("/api/v1/screen", response_model=ScreeningResponse)
async def screen_candidate(request: ScreeningRequest, background_tasks: BackgroundTasks):
    """
    Screen a candidate against job requirements.
    Returns immediately with action ID, processing happens in background.
    """
    try:
        result = await screening_agent.execute({
            "application_id": request.application_id,
            "candidate_profile": request.candidate_profile,
            "job_requirements": request.job_requirements,
            "resume_content": request.resume_content,
            "assessment_results": request.assessment_results
        })

        return ScreeningResponse(**result)

    except Exception as e:
        logger.error(f"Screening error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Scheduling Endpoints ====================

@app.post("/api/v1/schedule")
async def schedule_interview(request: SchedulingRequest):
    """
    Find optimal interview slots between candidate (India) and interviewer (US).
    """
    try:
        result = await scheduling_agent.execute({
            "application_id": request.application_id,
            "candidate_availability": request.candidate_availability,
            "interviewer_availability": request.interviewer_availability,
            "duration_minutes": request.duration_minutes,
            "us_timezone": request.us_timezone,
            "preferred_dates": request.preferred_dates,
            "interview_type": request.interview_type
        })

        return result

    except Exception as e:
        logger.error(f"Scheduling error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Resume Parsing Endpoints ====================

@app.post("/api/v1/parse-resume")
async def parse_resume(request: ResumeParseRequest):
    """
    Parse a resume and extract structured data.
    """
    try:
        result = await resume_parser.parse(
            resume_text=request.resume_text,
            file_type=request.file_type
        )

        return result

    except Exception as e:
        logger.error(f"Resume parsing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Job Matching Endpoints ====================

@app.post("/api/v1/match-jobs")
async def match_candidate_to_jobs(request: JobMatchRequest):
    """
    Match a candidate to multiple jobs and return ranked results.
    """
    try:
        matches = await job_matcher.match_candidate_to_jobs(
            candidate=request.candidate,
            jobs=request.jobs,
            top_n=request.top_n
        )

        return {
            "success": True,
            "matches": matches,
            "total_jobs": len(request.jobs),
            "returned": len(matches)
        }

    except Exception as e:
        logger.error(f"Job matching error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/rank-candidates")
async def rank_candidates_for_job(request: CandidateRankRequest):
    """
    Rank candidates for a specific job position.
    """
    try:
        rankings = await job_matcher.rank_candidates_for_job(
            job=request.job,
            candidates=request.candidates,
            include_ai_analysis=request.include_ai_analysis
        )

        # Group by tier
        tiers = {
            "exceptional": [],
            "strong": [],
            "good": [],
            "moderate": [],
            "weak": []
        }

        for ranking in rankings:
            tier = ranking.get("tier", "weak")
            tiers[tier].append(ranking)

        return {
            "success": True,
            "rankings": rankings,
            "tiers": tiers,
            "total_candidates": len(request.candidates),
            "summary": {
                "exceptional": len(tiers["exceptional"]),
                "strong": len(tiers["strong"]),
                "good": len(tiers["good"]),
                "moderate": len(tiers["moderate"]),
                "weak": len(tiers["weak"])
            }
        }

    except Exception as e:
        logger.error(f"Candidate ranking error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/skill-gap")
async def analyze_skill_gap(candidate: Dict[str, Any], job: Dict[str, Any]):
    """
    Analyze skill gaps between a candidate and job requirements.
    """
    try:
        analysis = await job_matcher.get_skill_gap_analysis(candidate, job)
        return {"success": True, "analysis": analysis}

    except Exception as e:
        logger.error(f"Skill gap analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== HITL (Human-in-the-Loop) Endpoints ====================

@app.get("/api/v1/actions")
async def get_ai_actions(
    status: Optional[str] = Query(None),
    agent_type: Optional[str] = Query(None),
    requires_approval: Optional[bool] = Query(None),
    entity_type: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
    offset: int = Query(0)
):
    """
    Get AI actions with filtering options.
    Used by HR dashboard to monitor AI pipeline.
    """
    try:
        async with async_session() as session:
            from sqlalchemy import select, desc

            query = select(AiAction)

            # Apply filters
            if status:
                query = query.where(AiAction.status == status)
            if agent_type:
                query = query.where(AiAction.agent_type == agent_type)
            if requires_approval is not None:
                query = query.where(AiAction.requires_approval == requires_approval)
            if entity_type:
                query = query.where(AiAction.entity_type == entity_type)

            # Order by created_at descending
            query = query.order_by(desc(AiAction.created_at))

            # Pagination
            query = query.limit(limit).offset(offset)

            result = await session.execute(query)
            actions = result.scalars().all()

            return {
                "success": True,
                "actions": [action.to_dict() for action in actions],
                "pagination": {
                    "limit": limit,
                    "offset": offset,
                    "returned": len(actions)
                }
            }

    except Exception as e:
        logger.error(f"Error fetching actions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/actions/pending-approval")
async def get_pending_approvals():
    """
    Get all actions pending HR approval.
    """
    try:
        async with async_session() as session:
            from sqlalchemy import select, desc

            query = select(AiAction).where(
                AiAction.status == ActionStatus.AWAITING_APPROVAL.value
            ).order_by(desc(AiAction.created_at))

            result = await session.execute(query)
            actions = result.scalars().all()

            return {
                "success": True,
                "pending_count": len(actions),
                "actions": [action.to_dict() for action in actions]
            }

    except Exception as e:
        logger.error(f"Error fetching pending approvals: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/actions/stats")
async def get_action_stats():
    """
    Get statistics about AI actions for the HR dashboard.
    """
    try:
        async with async_session() as session:
            from sqlalchemy import select, func

            # Total actions by status
            status_query = select(
                AiAction.status,
                func.count(AiAction.id).label('count')
            ).group_by(AiAction.status)

            status_result = await session.execute(status_query)
            status_counts = {row[0]: row[1] for row in status_result}

            # Total actions by agent type
            agent_query = select(
                AiAction.agent_type,
                func.count(AiAction.id).label('count')
            ).group_by(AiAction.agent_type)

            agent_result = await session.execute(agent_query)
            agent_counts = {row[0]: row[1] for row in agent_result}

            # Average match scores for completed screenings
            score_query = select(
                func.avg(AiAction.match_score).label('avg_score')
            ).where(
                AiAction.agent_type == 'screening',
                AiAction.match_score.isnot(None)
            )

            score_result = await session.execute(score_query)
            avg_match_score = score_result.scalar() or 0

            # Pending approvals count
            pending_count = status_counts.get(ActionStatus.AWAITING_APPROVAL.value, 0)

            return {
                "success": True,
                "stats": {
                    "total_actions": sum(status_counts.values()),
                    "by_status": status_counts,
                    "by_agent_type": agent_counts,
                    "pending_approvals": pending_count,
                    "average_match_score": round(avg_match_score, 1),
                    "timestamp": datetime.utcnow().isoformat()
                }
            }

    except Exception as e:
        logger.error(f"Error fetching stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/actions/{action_id}")
async def get_action_detail(action_id: str):
    """
    Get detailed information about a specific AI action.
    """
    try:
        async with async_session() as session:
            action = await session.get(AiAction, action_id)

            if not action:
                raise HTTPException(status_code=404, detail="Action not found")

            return {
                "success": True,
                "action": action.to_dict()
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching action: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/actions/{action_id}/approve")
async def approve_action(action_id: str, request: ApprovalRequest):
    """
    Approve or reject an AI action (HITL endpoint).
    """
    try:
        async with async_session() as session:
            action = await session.get(AiAction, action_id)

            if not action:
                raise HTTPException(status_code=404, detail="Action not found")

            if action.status != ActionStatus.AWAITING_APPROVAL.value:
                raise HTTPException(
                    status_code=400,
                    detail=f"Action is not awaiting approval. Current status: {action.status}"
                )

            if request.approved:
                action.status = ActionStatus.APPROVED.value
                action.approved_by = request.reviewer_id
                action.approved_at = datetime.utcnow()

                # If approved, mark as completed
                action.status = ActionStatus.COMPLETED.value
                action.completed_at = datetime.utcnow()
            else:
                action.status = ActionStatus.REJECTED.value
                action.rejection_reason = request.reviewer_notes

            await session.commit()
            await session.refresh(action)

            # Notify Node.js API about the approval/rejection
            from agents.base_agent import BaseAgent
            base = BaseAgent.__new__(BaseAgent)
            base.agent_type = "hitl"
            await base.notify_node_api("ai/action-reviewed", {
                "actionId": action_id,
                "approved": request.approved,
                "reviewerId": request.reviewer_id,
                "entityType": action.entity_type,
                "entityId": action.entity_id
            })

            return {
                "success": True,
                "action": action.to_dict(),
                "message": "Action approved" if request.approved else "Action rejected"
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing approval: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Run Server ====================

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=True
    )
