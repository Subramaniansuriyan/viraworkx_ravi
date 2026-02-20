"""
ViraWorkX ATS — AI Resume Scorer
Scores resumes against job descriptions using Claude API.
20-point scoring system with detailed breakdown.
"""
import json
import logging
from typing import Optional
from datetime import datetime, timezone

import anthropic
from config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

SCORING_PROMPT = """You are an expert ATS (Applicant Tracking System) resume evaluator for ViraWorkX, a curated talent marketplace connecting US startups with pre-vetted Indian engineers.

TASK: Evaluate the candidate's resume against the Job Description and provide a structured score.

JOB DESCRIPTION:
---
{job_description}
---

CANDIDATE RESUME:
---
{resume_text}
---

CANDIDATE SKILLS: {skills}
CANDIDATE EXPERIENCE: {experience_years} years
CANDIDATE INDUSTRIES: {industries}

Score the resume on a scale of 1 to 20 based on these weighted criteria:

1. TECHNICAL SKILLS MATCH (0-5 pts): How well do the candidate's technical skills align with required and preferred skills?
2. EXPERIENCE RELEVANCE (0-5 pts): How relevant is their work experience? Consider years, domain, and responsibilities.
3. ROLE-LEVEL FIT (0-4 pts): Does their seniority/career level match requirements?
4. EDUCATION & CERTIFICATIONS (0-3 pts): Does their education align with requirements?
5. OVERALL RESUME QUALITY (0-3 pts): Presentation, clarity, quantified achievements.

ADDITIONAL EVALUATION:
- Industry match: Does the candidate have experience in the same industry? (Fintech, HealthTech, SaaS, etc.)
- Expertise domain match: Does their expertise area match the role needs?
- Overlap hours fit: Are they likely to work US-India overlap hours?

IMPORTANT: Be strict and objective. A perfect resume scores 20. An unrelated resume scores 1-5.

Respond ONLY with valid JSON:
{{
    "total_score": <number 1-20>,
    "skills_match": <number 0-5>,
    "experience_relevance": <number 0-5>,
    "role_level_fit": <number 0-4>,
    "education_certs": <number 0-3>,
    "resume_quality": <number 0-3>,
    "matching_skills": ["skill1", "skill2"],
    "missing_skills": ["skill1", "skill2"],
    "match_percentage": <number 0-100>,
    "industry_match": <boolean>,
    "domain_match": <boolean>,
    "key_strengths": ["strength 1", "strength 2", "strength 3"],
    "key_gaps": ["gap 1", "gap 2"],
    "recommendation": "<shortlist|review|reject>",
    "summary": "2-3 sentence evaluation summary"
}}"""


async def score_resume_against_job(
    resume_text: str,
    job_description: str,
    skills: list[str],
    experience_years: float,
    industries: list[str],
) -> Optional[dict]:
    """
    Score a resume against a job description using Claude API.
    Returns structured scoring data or None on failure.
    """
    if not resume_text or not job_description:
        logger.warning("Missing resume text or job description for scoring")
        return None

    if not settings.ANTHROPIC_API_KEY:
        logger.error("ANTHROPIC_API_KEY not configured")
        return None

    try:
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        response = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=1500,
            messages=[
                {
                    "role": "user",
                    "content": SCORING_PROMPT.format(
                        job_description=job_description[:4000],
                        resume_text=resume_text[:6000],
                        skills=", ".join(skills[:20]),
                        experience_years=experience_years,
                        industries=", ".join(industries) if industries else "Not specified",
                    ),
                }
            ],
        )

        response_text = response.content[0].text.strip()
        if response_text.startswith("```"):
            response_text = response_text.split("\n", 1)[1]
            response_text = response_text.rsplit("```", 1)[0]

        result = json.loads(response_text)

        # Validate score ranges
        result["total_score"] = max(1, min(20, result.get("total_score", 1)))
        result["skills_match"] = max(0, min(5, result.get("skills_match", 0)))
        result["experience_relevance"] = max(0, min(5, result.get("experience_relevance", 0)))
        result["role_level_fit"] = max(0, min(4, result.get("role_level_fit", 0)))
        result["education_certs"] = max(0, min(3, result.get("education_certs", 0)))
        result["resume_quality"] = max(0, min(3, result.get("resume_quality", 0)))

        return result

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse AI scoring response: {e}")
        return None
    except Exception as e:
        logger.error(f"AI scoring failed: {e}")
        return None


def calculate_tier(overall_score: float) -> str:
    """Calculate tier from overall score (0-100)."""
    if overall_score >= settings.TIER_1_MIN:
        return "Tier 1"
    elif overall_score >= settings.TIER_2_MIN:
        return "Tier 2"
    elif overall_score >= settings.TIER_3_MIN:
        return "Tier 3"
    else:
        return "Rejected"


def calculate_overall_score(
    coding: float,
    communication: float,
    psychometric: float,
) -> float:
    """Calculate weighted overall score."""
    return round(
        coding * settings.CODING_WEIGHT +
        communication * settings.COMMUNICATION_WEIGHT +
        psychometric * settings.PSYCHOMETRIC_WEIGHT,
        1,
    )
