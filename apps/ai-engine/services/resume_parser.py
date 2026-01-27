"""Resume Parser Service using Claude for intelligent extraction"""
from typing import Dict, Any, Optional
from anthropic import Anthropic
import json
import logging
import re

from config import settings

logger = logging.getLogger(__name__)


class ResumeParser:
    """
    Service for parsing resumes and extracting structured data using Claude.
    Handles various resume formats and extracts comprehensive candidate information.
    """

    def __init__(self):
        self.client = Anthropic(api_key=settings.anthropic_api_key)
        self.model = settings.default_model

        self.system_prompt = """You are an expert resume parser with deep experience in technical recruiting.
Your task is to extract structured information from resumes accurately and comprehensively.

You must:
- Extract all relevant information including contact details, experience, education, skills
- Identify technical skills and proficiency levels where mentioned
- Calculate total years of experience accurately
- Identify career progression and growth patterns
- Note any certifications, awards, or notable achievements

Always return data as a valid JSON object matching the specified schema."""

    async def parse(self, resume_text: str, file_type: str = "text") -> Dict[str, Any]:
        """
        Parse a resume and extract structured data.

        Args:
            resume_text: The text content of the resume
            file_type: The original file type (pdf, docx, text)

        Returns:
            Structured resume data
        """
        try:
            # Clean and normalize the text
            cleaned_text = self._clean_text(resume_text)

            # Build the extraction prompt
            user_prompt = self._build_prompt(cleaned_text)

            # Call Claude for extraction
            response = self.client.messages.create(
                model=self.model,
                max_tokens=4096,
                temperature=0,  # Use 0 for consistent extraction
                system=self.system_prompt,
                messages=[{"role": "user", "content": user_prompt}]
            )

            # Parse the response
            result_text = response.content[0].text
            parsed_data = self._parse_response(result_text)

            # Validate and enhance the parsed data
            validated_data = self._validate_and_enhance(parsed_data)

            return {
                "success": True,
                "data": validated_data,
                "metadata": {
                    "file_type": file_type,
                    "text_length": len(resume_text),
                    "extraction_confidence": self._calculate_confidence(validated_data)
                }
            }

        except Exception as e:
            logger.error(f"Resume parsing failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "data": self._get_empty_structure()
            }

    def _clean_text(self, text: str) -> str:
        """Clean and normalize resume text"""
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        # Remove special characters that might cause issues
        text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\xff]', '', text)
        # Normalize line breaks
        text = text.replace('\r\n', '\n').replace('\r', '\n')
        return text.strip()

    def _build_prompt(self, resume_text: str) -> str:
        """Build the extraction prompt"""
        return f"""Parse the following resume and extract all relevant information.

RESUME TEXT:
---
{resume_text[:8000]}{'...(truncated)' if len(resume_text) > 8000 else ''}
---

Extract the information and return it as a JSON object with this exact structure:
{{
    "personal": {{
        "full_name": "<full name>",
        "first_name": "<first name>",
        "last_name": "<last name>",
        "email": "<email address>",
        "phone": "<phone number>",
        "location": "<city, state/country>",
        "linkedin_url": "<LinkedIn URL if found>",
        "github_url": "<GitHub URL if found>",
        "portfolio_url": "<portfolio/website URL if found>"
    }},
    "headline": "<professional headline or current title>",
    "summary": "<professional summary if present, or generate a brief one>",
    "experience": [
        {{
            "company": "<company name>",
            "title": "<job title>",
            "location": "<location>",
            "start_date": "<YYYY-MM or YYYY>",
            "end_date": "<YYYY-MM or 'Present'>",
            "is_current": <true/false>,
            "description": "<job description>",
            "achievements": ["<achievement 1>", "<achievement 2>"]
        }}
    ],
    "education": [
        {{
            "institution": "<school/university name>",
            "degree": "<degree type (BS, MS, PhD, etc.)>",
            "field": "<field of study>",
            "graduation_date": "<YYYY or YYYY-MM>",
            "gpa": <GPA if mentioned, null otherwise>,
            "honors": "<honors/distinctions if any>"
        }}
    ],
    "skills": {{
        "technical": ["<skill 1>", "<skill 2>"],
        "programming_languages": ["<language 1>", "<language 2>"],
        "frameworks": ["<framework 1>", "<framework 2>"],
        "databases": ["<database 1>", "<database 2>"],
        "cloud": ["<cloud service 1>", "<cloud service 2>"],
        "tools": ["<tool 1>", "<tool 2>"],
        "soft_skills": ["<soft skill 1>", "<soft skill 2>"]
    }},
    "certifications": [
        {{
            "name": "<certification name>",
            "issuer": "<issuing organization>",
            "date": "<YYYY-MM or YYYY>",
            "expires": "<expiration date if applicable>"
        }}
    ],
    "languages": [
        {{
            "language": "<language name>",
            "proficiency": "<native/fluent/professional/basic>"
        }}
    ],
    "total_experience_years": <calculated total years of experience>,
    "current_company": "<current employer if employed>",
    "current_title": "<current job title>",
    "career_level": "<entry/mid/senior/lead/executive>",
    "industry_focus": ["<industry 1>", "<industry 2>"]
}}

Be thorough and extract all available information. Use null for fields that cannot be determined."""

    def _parse_response(self, response: str) -> Dict[str, Any]:
        """Parse the JSON response from Claude"""
        # Remove markdown code blocks if present
        if "```json" in response:
            response = response.split("```json")[1].split("```")[0]
        elif "```" in response:
            response = response.split("```")[1].split("```")[0]

        try:
            return json.loads(response.strip())
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON: {e}")
            logger.debug(f"Response was: {response[:500]}")
            raise ValueError(f"Invalid JSON response: {e}")

    def _validate_and_enhance(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and enhance the parsed data"""
        # Ensure all required fields exist
        required_structure = self._get_empty_structure()

        def merge_dict(base: Dict, override: Dict) -> Dict:
            result = base.copy()
            for key, value in override.items():
                if value is not None:
                    if isinstance(value, dict) and isinstance(result.get(key), dict):
                        result[key] = merge_dict(result[key], value)
                    else:
                        result[key] = value
            return result

        validated = merge_dict(required_structure, data)

        # Calculate total experience if not provided
        if not validated.get("total_experience_years") and validated.get("experience"):
            validated["total_experience_years"] = self._calculate_experience_years(
                validated["experience"]
            )

        # Flatten skills for easy matching
        validated["all_skills"] = self._flatten_skills(validated.get("skills", {}))

        return validated

    def _calculate_experience_years(self, experience: list) -> int:
        """Calculate total years of experience from work history"""
        from datetime import datetime
        from dateutil import parser as date_parser

        total_months = 0

        for job in experience:
            try:
                start = job.get("start_date", "")
                end = job.get("end_date", "Present")

                if not start:
                    continue

                # Parse start date
                if len(start) == 4:  # Just year
                    start_date = datetime(int(start), 1, 1)
                else:
                    start_date = date_parser.parse(start)

                # Parse end date
                if end.lower() == "present" or job.get("is_current"):
                    end_date = datetime.now()
                elif len(end) == 4:
                    end_date = datetime(int(end), 12, 31)
                else:
                    end_date = date_parser.parse(end)

                months = (end_date.year - start_date.year) * 12 + (end_date.month - start_date.month)
                total_months += max(0, months)

            except Exception as e:
                logger.warning(f"Could not parse dates for job: {e}")
                continue

        return round(total_months / 12)

    def _flatten_skills(self, skills: Dict) -> list:
        """Flatten all skills into a single list"""
        all_skills = []
        for category, skill_list in skills.items():
            if isinstance(skill_list, list):
                all_skills.extend(skill_list)
        return list(set(all_skills))

    def _calculate_confidence(self, data: Dict) -> int:
        """Calculate extraction confidence score"""
        score = 0
        max_score = 100

        # Check personal info completeness
        personal = data.get("personal", {})
        if personal.get("full_name"):
            score += 15
        if personal.get("email"):
            score += 15
        if personal.get("phone"):
            score += 5
        if personal.get("location"):
            score += 5

        # Check experience
        experience = data.get("experience", [])
        if experience:
            score += 20
            if len(experience) >= 2:
                score += 10

        # Check education
        if data.get("education"):
            score += 10

        # Check skills
        skills = data.get("skills", {})
        if skills.get("technical") or skills.get("programming_languages"):
            score += 15

        # Check summary
        if data.get("summary"):
            score += 5

        return min(score, max_score)

    def _get_empty_structure(self) -> Dict[str, Any]:
        """Return empty structure for failed parsing"""
        return {
            "personal": {
                "full_name": None,
                "first_name": None,
                "last_name": None,
                "email": None,
                "phone": None,
                "location": None,
                "linkedin_url": None,
                "github_url": None,
                "portfolio_url": None
            },
            "headline": None,
            "summary": None,
            "experience": [],
            "education": [],
            "skills": {
                "technical": [],
                "programming_languages": [],
                "frameworks": [],
                "databases": [],
                "cloud": [],
                "tools": [],
                "soft_skills": []
            },
            "certifications": [],
            "languages": [],
            "total_experience_years": 0,
            "current_company": None,
            "current_title": None,
            "career_level": None,
            "industry_focus": [],
            "all_skills": []
        }


# Singleton instance
resume_parser = ResumeParser()
