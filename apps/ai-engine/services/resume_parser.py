"""
Resume Parser Service — Merged from existing LangChain parser + ATS pdfplumber/PyPDF2/docx extraction.
Uses Claude for intelligent extraction and includes file-based text extraction and Celery task wrapper.
"""
import io
import json
import logging
import re
from typing import Dict, Any, Optional
from datetime import datetime, timezone

from anthropic import Anthropic
import PyPDF2
import pdfplumber
from docx import Document as DocxDocument

from config import settings

logger = logging.getLogger(__name__)


# ================================================================
# FILE TEXT EXTRACTION (from ATS resume_parser.py)
# ================================================================

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from PDF using pdfplumber (primary) with PyPDF2 fallback."""
    text = ""

    # Try pdfplumber first (better formatting)
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        if text.strip():
            return text.strip()
    except Exception as e:
        logger.warning(f"pdfplumber failed, trying PyPDF2: {e}")

    # Fallback to PyPDF2
    try:
        reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    except Exception as e:
        logger.error(f"PyPDF2 also failed: {e}")

    return text.strip()


def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract text from DOCX file."""
    try:
        doc = DocxDocument(io.BytesIO(file_bytes))
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        return "\n".join(paragraphs)
    except Exception as e:
        logger.error(f"DOCX extraction failed: {e}")
        return ""


def extract_resume_text(file_bytes: bytes, filename: str) -> str:
    """Route to correct extractor based on file type."""
    lower = filename.lower()
    if lower.endswith(".pdf"):
        return extract_text_from_pdf(file_bytes)
    elif lower.endswith(".docx") or lower.endswith(".doc"):
        return extract_text_from_docx(file_bytes)
    else:
        # Try both
        text = extract_text_from_pdf(file_bytes)
        if not text:
            text = extract_text_from_docx(file_bytes)
        return text


# ================================================================
# ATS AI RESUME PARSING (structured extraction via Claude)
# ================================================================

ATS_EXTRACTION_PROMPT = """You are an expert resume parser. Extract structured data from the following resume text.

RESUME TEXT:
---
{resume_text}
---

Extract the following information and respond ONLY with valid JSON, no other text:

{{
    "first_name": "string",
    "last_name": "string",
    "email": "string or null",
    "phone": "string or null",
    "location": "string (city, state/country) or null",
    "current_role": "string (most recent job title) or null",
    "current_company": "string (most recent employer) or null",
    "experience_years": number (estimate total years of professional experience),
    "education": "string (highest degree: Bachelor's, Master's, PhD, Self-taught, Bootcamp) or null",
    "education_institution": "string or null",
    "skills": ["list", "of", "all", "technical", "skills", "mentioned"],
    "primary_skills": ["top", "3-5", "strongest", "skills"],
    "expertise_domain": "string (one of: AI/ML, Data Engineering, DevOps/Cloud, Full Stack, Frontend, Backend, Mobile, Cybersecurity, QA/Testing, Other) or null",
    "industries": ["list of industries they have worked in: Fintech, HealthTech, SaaS, EdTech, E-commerce, Logistics, InsurTech, Crypto/Web3, Media, Marketplace, etc."],
    "certifications": ["list of certifications mentioned"],
    "linkedin_url": "string or null",
    "github_url": "string or null",
    "portfolio_url": "string or null",
    "summary": "2-3 sentence professional summary"
}}

Be accurate. If information is not present in the resume, use null. For experience_years, estimate based on work history dates. For skills, extract ALL technical skills, frameworks, tools, and languages mentioned."""


async def parse_resume_with_ai(resume_text: str) -> Optional[dict]:
    """Use Claude API to extract structured data from resume text (ATS-style)."""
    if not resume_text or len(resume_text) < 50:
        logger.warning("Resume text too short for parsing")
        return None

    if not settings.ANTHROPIC_API_KEY and not settings.anthropic_api_key:
        logger.error("ANTHROPIC_API_KEY not configured")
        return None

    api_key = settings.ANTHROPIC_API_KEY or settings.anthropic_api_key

    try:
        client = Anthropic(api_key=api_key)
        response = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=2000,
            messages=[
                {
                    "role": "user",
                    "content": ATS_EXTRACTION_PROMPT.format(resume_text=resume_text[:8000])
                }
            ],
        )

        # Extract JSON from response
        response_text = response.content[0].text.strip()
        # Remove markdown code fences if present
        if response_text.startswith("```"):
            response_text = response_text.split("\n", 1)[1]
            response_text = response_text.rsplit("```", 1)[0]

        parsed = json.loads(response_text)
        return parsed

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse AI response as JSON: {e}")
        return None
    except Exception as e:
        logger.error(f"AI resume parsing failed: {e}")
        return None


# ================================================================
# CELERY TASK WRAPPER (from ATS resume_parser.py)
# ================================================================

def parse_resume_task(candidate_id: int, file_bytes: bytes, filename: str):
    """
    Background task: Parse resume and update candidate record.
    Called via: parse_resume_task.delay(candidate_id, file_bytes, filename)
    """
    import asyncio
    from sqlalchemy import select
    from core.database import async_session as ats_async_session
    from models.candidate import Candidate

    async def _run():
        # Extract text
        resume_text = extract_resume_text(file_bytes, filename)
        if not resume_text:
            logger.error(f"No text extracted from resume for candidate {candidate_id}")
            return

        # Parse with AI
        parsed = await parse_resume_with_ai(resume_text)
        if not parsed:
            logger.error(f"AI parsing failed for candidate {candidate_id}")
            return

        # Update candidate record
        async with ats_async_session() as session:
            result = await session.execute(
                select(Candidate).where(Candidate.id == candidate_id)
            )
            candidate = result.scalar_one_or_none()
            if not candidate:
                logger.error(f"Candidate {candidate_id} not found")
                return

            # Update fields from parsed data
            if parsed.get("skills"):
                candidate.skills = parsed["skills"]
            if parsed.get("primary_skills"):
                candidate.primary_skills = parsed["primary_skills"]
            if parsed.get("expertise_domain"):
                candidate.expertise_domain = parsed["expertise_domain"]
            if parsed.get("industries"):
                candidate.industries = parsed["industries"]
            if parsed.get("certifications"):
                candidate.certifications = parsed["certifications"]
            if parsed.get("experience_years"):
                candidate.experience_years = parsed["experience_years"]
            if parsed.get("education"):
                candidate.education = parsed["education"]
            if parsed.get("education_institution"):
                candidate.education_institution = parsed["education_institution"]
            if parsed.get("current_role") and not candidate.current_role:
                candidate.current_role = parsed["current_role"]
            if parsed.get("current_company") and not candidate.current_company:
                candidate.current_company = parsed["current_company"]
            if parsed.get("linkedin_url") and not candidate.linkedin_url:
                candidate.linkedin_url = parsed["linkedin_url"]
            if parsed.get("github_url") and not candidate.github_url:
                candidate.github_url = parsed["github_url"]

            candidate.resume_parsed = parsed
            candidate.resume_text = resume_text
            candidate.resume_parsed_at = datetime.now(timezone.utc)
            candidate.last_activity_at = datetime.now(timezone.utc)

            await session.commit()
            logger.info(f"Resume parsed successfully for candidate {candidate_id}")

    asyncio.run(_run())


# ================================================================
# EXISTING LANGCHAIN-STYLE RESUME PARSER CLASS
# ================================================================

class ResumeParser:
    """
    Service for parsing resumes and extracting structured data using Claude.
    Handles various resume formats and extracts comprehensive candidate information.
    """

    def __init__(self):
        api_key = settings.anthropic_api_key or settings.ANTHROPIC_API_KEY
        self.client = Anthropic(api_key=api_key)
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
        from datetime import datetime as dt
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
                    start_date = dt(int(start), 1, 1)
                else:
                    start_date = date_parser.parse(start)

                # Parse end date
                if end.lower() == "present" or job.get("is_current"):
                    end_date = dt.now()
                elif len(end) == 4:
                    end_date = dt(int(end), 12, 31)
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

        return min(score, 100)

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
