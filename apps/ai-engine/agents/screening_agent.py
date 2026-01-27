"""AI Screening Agent with Human-in-the-Loop support"""
from typing import Dict, Any, Optional
import json
import logging

from .base_agent import BaseAgent
from models import ActionStatus
from config import settings

logger = logging.getLogger(__name__)


class ScreeningAgent(BaseAgent):
    """
    AI agent for screening candidates against job requirements.
    Implements HITL for borderline cases requiring HR review.
    """

    def __init__(self):
        super().__init__(agent_type="screening")

        self.system_prompt = """You are an expert technical recruiter with deep experience in evaluating candidates for tech roles.
Your task is to objectively analyze a candidate's profile against job requirements.

You must be:
- Objective and fair in your assessment
- Focused on skills, experience, and cultural fit
- Clear about strengths and potential concerns
- Specific in your recommendations

Always return your analysis as a valid JSON object."""

    async def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Screen a candidate against job requirements.

        Args:
            input_data: {
                "application_id": str,
                "candidate_profile": dict,
                "job_requirements": dict,
                "resume_content": str (optional),
                "assessment_results": dict (optional)
            }

        Returns:
            Screening result with match score, strengths, concerns, and recommendation
        """
        application_id = input_data.get("application_id")
        candidate = input_data.get("candidate_profile", {})
        job = input_data.get("job_requirements", {})
        resume = input_data.get("resume_content", "")
        assessment = input_data.get("assessment_results")

        # Create action record
        action = await self.create_action(
            action_type="candidate_screening",
            entity_type="application",
            entity_id=application_id,
            input_payload=input_data
        )

        try:
            # Update status to processing
            await self.update_action(action.id, ActionStatus.PROCESSING)

            # Build the analysis prompt
            user_prompt = self._build_prompt(candidate, job, resume, assessment)

            # Call Claude for analysis
            response = await self.call_llm(self.system_prompt, user_prompt)
            result = await self.parse_json_response(response)

            # Validate and normalize the result
            result = self._normalize_result(result)

            # Determine if HITL approval is needed
            requires_approval = self.should_require_approval(result["match_score"])
            auto_reject = self.should_auto_reject(result["match_score"])

            if auto_reject:
                result["recommendation"] = "reject"
                result["auto_rejected"] = True
                status = ActionStatus.COMPLETED
                approval_reason = None
            elif requires_approval:
                status = ActionStatus.AWAITING_APPROVAL
                approval_reason = f"Match score {result['match_score']}% is below threshold. HR review required."
                result["requires_hr_review"] = True
            else:
                status = ActionStatus.COMPLETED
                approval_reason = None

            # Update action with results
            await self.update_action(
                action.id,
                status,
                output_payload=result,
                confidence_score=result.get("confidence", 85),
                match_score=result["match_score"]
            )

            # If approval needed, update the action
            if requires_approval and not auto_reject:
                action.requires_approval = True
                action.approval_reason = approval_reason

            # Notify Node.js API about the screening result
            await self.notify_node_api("ai/screening-complete", {
                "actionId": action.id,
                "applicationId": application_id,
                "result": result,
                "requiresApproval": requires_approval and not auto_reject
            })

            return {
                "action_id": action.id,
                "status": status.value,
                "result": result,
                "requires_approval": requires_approval and not auto_reject
            }

        except Exception as e:
            logger.error(f"Screening failed for application {application_id}: {e}")
            await self.update_action(
                action.id,
                ActionStatus.FAILED,
                error_message=str(e)
            )
            raise

    def _build_prompt(
        self,
        candidate: Dict,
        job: Dict,
        resume: str,
        assessment: Optional[Dict]
    ) -> str:
        """Build the analysis prompt for Claude"""
        prompt = f"""Analyze this candidate against the job requirements and provide a comprehensive screening assessment.

## Job Requirements
- **Title:** {job.get('title', 'N/A')}
- **Description:** {job.get('description', 'N/A')}
- **Required Skills:** {', '.join(job.get('skillsRequired', []))}
- **Preferred Skills:** {', '.join(job.get('skillsPreferred', []))}
- **Experience Required:** {job.get('experienceMin', 0)}-{job.get('experienceMax', 'N/A')} years
- **Location:** {job.get('location', 'Remote')}
- **Remote Policy:** {job.get('remotePolicy', 'N/A')}

## Candidate Profile
- **Name:** {candidate.get('firstName', '')} {candidate.get('lastName', '')}
- **Current Title:** {candidate.get('currentTitle', 'N/A')}
- **Current Company:** {candidate.get('currentCompany', 'N/A')}
- **Experience:** {candidate.get('experienceYears', 'N/A')} years
- **Location:** {candidate.get('location', 'N/A')}
- **Skills:** {', '.join(candidate.get('skills', []))}
- **Expected Salary:** {candidate.get('expectedSalaryMin', 'N/A')} - {candidate.get('expectedSalaryMax', 'N/A')} {candidate.get('salaryCurrency', 'USD')}
"""

        if resume:
            prompt += f"""
## Resume Content
{resume[:3000]}{'...(truncated)' if len(resume) > 3000 else ''}
"""

        if assessment:
            prompt += f"""
## iMocha Assessment Results
- **Score:** {assessment.get('score', 'N/A')}/{assessment.get('maxScore', 100)}
- **Percentile:** {assessment.get('percentile', 'N/A')}%
- **Skill Scores:** {json.dumps(assessment.get('skillScores', []))}
"""

        prompt += """
## Instructions
Provide your assessment in the following JSON format:
{
    "match_score": <0-100 integer>,
    "confidence": <0-100 integer>,
    "recommendation": "<proceed|review|reject>",
    "strengths": ["<strength 1>", "<strength 2>", ...],
    "concerns": ["<concern 1>", "<concern 2>", ...],
    "skill_match": {
        "matched": ["<skill1>", "<skill2>"],
        "missing": ["<skill1>", "<skill2>"],
        "bonus": ["<skill1>", "<skill2>"]
    },
    "experience_fit": "<strong|adequate|weak>",
    "culture_fit_notes": "<brief assessment of potential culture fit>",
    "summary": "<2-3 sentence summary of the candidate's fit for this role>",
    "suggested_interview_focus": ["<topic 1>", "<topic 2>"]
}

Be objective and focus on factual qualifications. The match_score should reflect:
- 90-100: Exceptional match, strongly recommend
- 80-89: Strong match, recommend proceeding
- 70-79: Good match with some gaps
- 60-69: Moderate match, needs review
- 50-59: Weak match, significant gaps
- Below 50: Poor match, recommend rejection
"""
        return prompt

    def _normalize_result(self, result: Dict) -> Dict:
        """Normalize and validate the screening result"""
        # Ensure required fields exist
        normalized = {
            "match_score": min(100, max(0, int(result.get("match_score", 50)))),
            "confidence": min(100, max(0, int(result.get("confidence", 75)))),
            "recommendation": result.get("recommendation", "review"),
            "strengths": result.get("strengths", [])[:5],
            "concerns": result.get("concerns", [])[:5],
            "skill_match": result.get("skill_match", {"matched": [], "missing": [], "bonus": []}),
            "experience_fit": result.get("experience_fit", "adequate"),
            "culture_fit_notes": result.get("culture_fit_notes", ""),
            "summary": result.get("summary", ""),
            "suggested_interview_focus": result.get("suggested_interview_focus", [])[:3]
        }

        # Validate recommendation
        if normalized["recommendation"] not in ["proceed", "review", "reject"]:
            normalized["recommendation"] = "review"

        return normalized


# Singleton instance
screening_agent = ScreeningAgent()
