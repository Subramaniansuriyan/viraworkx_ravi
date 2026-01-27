"""Job Matcher Service for AI-powered candidate-job matching"""
from typing import Dict, Any, List, Optional
from anthropic import Anthropic
import json
import logging

from config import settings

logger = logging.getLogger(__name__)


class JobMatcher:
    """
    Service for matching candidates to jobs and ranking candidates for positions.
    Uses both rule-based scoring and AI-powered analysis.
    """

    def __init__(self):
        self.client = Anthropic(api_key=settings.anthropic_api_key)
        self.model = settings.default_model

        # Scoring weights
        self.weights = {
            "skills_required": 0.35,
            "skills_preferred": 0.10,
            "experience": 0.25,
            "location": 0.10,
            "salary": 0.10,
            "education": 0.10
        }

    async def match_candidate_to_jobs(
        self,
        candidate: Dict[str, Any],
        jobs: List[Dict[str, Any]],
        top_n: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Match a candidate to multiple jobs and return ranked results.

        Args:
            candidate: Candidate profile data
            jobs: List of job postings
            top_n: Number of top matches to return

        Returns:
            List of jobs with match scores, sorted by relevance
        """
        matches = []

        for job in jobs:
            score, details = self._calculate_match_score(candidate, job)
            matches.append({
                "job": job,
                "match_score": score,
                "match_details": details
            })

        # Sort by match score
        matches.sort(key=lambda x: x["match_score"], reverse=True)

        # Return top N matches
        return matches[:top_n]

    async def rank_candidates_for_job(
        self,
        job: Dict[str, Any],
        candidates: List[Dict[str, Any]],
        include_ai_analysis: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Rank candidates for a specific job position.

        Args:
            job: Job posting data
            candidates: List of candidate profiles
            include_ai_analysis: Whether to include AI-generated summaries

        Returns:
            List of candidates with rankings and analysis
        """
        rankings = []

        for candidate in candidates:
            score, details = self._calculate_match_score(candidate, job)

            ranking = {
                "candidate": candidate,
                "match_score": score,
                "match_details": details,
                "tier": self._get_tier(score)
            }

            # Add AI analysis for top candidates
            if include_ai_analysis and score >= 60:
                ai_summary = await self._generate_candidate_summary(candidate, job)
                ranking["ai_summary"] = ai_summary

            rankings.append(ranking)

        # Sort by match score
        rankings.sort(key=lambda x: x["match_score"], reverse=True)

        return rankings

    def _calculate_match_score(
        self,
        candidate: Dict[str, Any],
        job: Dict[str, Any]
    ) -> tuple[int, Dict[str, Any]]:
        """Calculate match score between candidate and job"""
        details = {}

        # Skills match (required)
        required_skills = set(s.lower() for s in job.get("skillsRequired", []))
        candidate_skills = set(s.lower() for s in candidate.get("skills", []))

        if required_skills:
            matched_required = required_skills & candidate_skills
            skills_required_score = len(matched_required) / len(required_skills) * 100
            details["skills_required"] = {
                "score": round(skills_required_score),
                "matched": list(matched_required),
                "missing": list(required_skills - candidate_skills)
            }
        else:
            skills_required_score = 100
            details["skills_required"] = {"score": 100, "matched": [], "missing": []}

        # Skills match (preferred)
        preferred_skills = set(s.lower() for s in job.get("skillsPreferred", []))
        if preferred_skills:
            matched_preferred = preferred_skills & candidate_skills
            skills_preferred_score = len(matched_preferred) / len(preferred_skills) * 100
            details["skills_preferred"] = {
                "score": round(skills_preferred_score),
                "matched": list(matched_preferred)
            }
        else:
            skills_preferred_score = 100
            details["skills_preferred"] = {"score": 100, "matched": []}

        # Experience match
        candidate_exp = candidate.get("experienceYears", 0) or 0
        job_exp_min = job.get("experienceMin", 0) or 0
        job_exp_max = job.get("experienceMax", 20) or 20

        if job_exp_min <= candidate_exp <= job_exp_max:
            experience_score = 100
        elif candidate_exp < job_exp_min:
            gap = job_exp_min - candidate_exp
            experience_score = max(0, 100 - (gap * 20))  # -20 per year under
        else:
            # Overqualified, slight penalty
            experience_score = max(70, 100 - ((candidate_exp - job_exp_max) * 5))

        details["experience"] = {
            "score": round(experience_score),
            "candidate_years": candidate_exp,
            "required_range": f"{job_exp_min}-{job_exp_max}"
        }

        # Location match
        candidate_location = (candidate.get("location") or "").lower()
        job_location = (job.get("location") or "").lower()
        remote_policy = job.get("remotePolicy", "")

        if remote_policy == "remote":
            location_score = 100
        elif candidate_location and job_location:
            if candidate_location in job_location or job_location in candidate_location:
                location_score = 100
            elif candidate.get("willingToRelocate"):
                location_score = 80
            else:
                location_score = 50
        else:
            location_score = 75  # Unknown

        details["location"] = {
            "score": round(location_score),
            "remote_policy": remote_policy
        }

        # Salary match
        candidate_min = candidate.get("expectedSalaryMin", 0) or 0
        candidate_max = candidate.get("expectedSalaryMax", float('inf'))
        job_min = job.get("salaryMin", 0) or 0
        job_max = job.get("salaryMax", float('inf'))

        if job_max == float('inf') and job_min == 0:
            salary_score = 100  # No salary info
        elif candidate_min <= job_max and (candidate_max >= job_min or candidate_max == float('inf')):
            salary_score = 100
        elif candidate_min > job_max:
            gap_percent = (candidate_min - job_max) / job_max * 100 if job_max > 0 else 50
            salary_score = max(0, 100 - gap_percent)
        else:
            salary_score = 70

        details["salary"] = {
            "score": round(salary_score),
            "candidate_range": f"{candidate_min}-{candidate_max if candidate_max != float('inf') else 'open'}",
            "job_range": f"{job_min}-{job_max if job_max != float('inf') else 'open'}"
        }

        # Education (basic check)
        education_score = 80  # Default
        details["education"] = {"score": education_score}

        # Calculate weighted total
        total_score = (
            skills_required_score * self.weights["skills_required"] +
            skills_preferred_score * self.weights["skills_preferred"] +
            experience_score * self.weights["experience"] +
            location_score * self.weights["location"] +
            salary_score * self.weights["salary"] +
            education_score * self.weights["education"]
        )

        return round(total_score), details

    def _get_tier(self, score: int) -> str:
        """Get candidate tier based on match score"""
        if score >= 90:
            return "exceptional"
        elif score >= 80:
            return "strong"
        elif score >= 70:
            return "good"
        elif score >= 60:
            return "moderate"
        else:
            return "weak"

    async def _generate_candidate_summary(
        self,
        candidate: Dict[str, Any],
        job: Dict[str, Any]
    ) -> str:
        """Generate AI summary for a candidate-job match"""
        try:
            prompt = f"""Provide a brief 2-3 sentence summary of why this candidate could be a good fit for this role.
Focus on their most relevant qualifications and any potential concerns.

Job: {job.get('title')} at {job.get('client', {}).get('companyName', 'the company')}
Required Skills: {', '.join(job.get('skillsRequired', [])[:5])}
Experience Required: {job.get('experienceMin', 0)}-{job.get('experienceMax', 'N/A')} years

Candidate: {candidate.get('firstName', '')} {candidate.get('lastName', '')}
Current: {candidate.get('currentTitle', 'N/A')} at {candidate.get('currentCompany', 'N/A')}
Experience: {candidate.get('experienceYears', 'N/A')} years
Skills: {', '.join(candidate.get('skills', [])[:10])}

Return only the summary text, no JSON or formatting."""

            response = self.client.messages.create(
                model=self.model,
                max_tokens=200,
                temperature=0.3,
                messages=[{"role": "user", "content": prompt}]
            )

            return response.content[0].text.strip()

        except Exception as e:
            logger.error(f"Failed to generate candidate summary: {e}")
            return ""

    async def get_skill_gap_analysis(
        self,
        candidate: Dict[str, Any],
        job: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Analyze skill gaps and provide recommendations"""
        required = set(s.lower() for s in job.get("skillsRequired", []))
        preferred = set(s.lower() for s in job.get("skillsPreferred", []))
        candidate_skills = set(s.lower() for s in candidate.get("skills", []))

        missing_required = required - candidate_skills
        missing_preferred = preferred - candidate_skills
        extra_skills = candidate_skills - required - preferred

        return {
            "required_skills_met": len(required - missing_required),
            "required_skills_total": len(required),
            "missing_required": list(missing_required),
            "missing_preferred": list(missing_preferred),
            "bonus_skills": list(extra_skills)[:5],
            "recommendations": self._get_skill_recommendations(missing_required)
        }

    def _get_skill_recommendations(self, missing_skills: set) -> List[str]:
        """Get recommendations for missing skills"""
        recommendations = []
        for skill in list(missing_skills)[:3]:
            recommendations.append(f"Consider candidates with {skill} experience or willingness to learn")
        return recommendations


# Singleton instance
job_matcher = JobMatcher()
