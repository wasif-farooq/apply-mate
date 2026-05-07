import re
import json
import logging
from typing import Optional
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.chat_models import ChatOllama

from core.config import get_settings
from core.constants import PROVIDER_BASE_URLS
from utils.logger import logger
from utils.resume_handler import extract_text_from_pdf

logger = logging.getLogger("job-applier")


class LLMService:
    def __init__(self, provider: str = None, model: str = None, api_key: str = None, base_url: str = None):
        self.settings = get_settings()
        self.provider = (provider or self.settings.AI_PROVIDER).lower()
        self.model = model
        self.api_key = api_key
        self.base_url = base_url

    def _get_llm(self):
        provider = self.provider

        if provider == "openai":
            key = self.api_key or self.settings.OPENAI_API_KEY
            if not key:
                raise ValueError("OPENAI_API_KEY not configured")
            return ChatOpenAI(model=self.model or self.settings.OPENAI_MODEL, api_key=key, temperature=0.7)

        elif provider == "anthropic":
            key = self.api_key or self.settings.ANTHROPIC_API_KEY
            if not key:
                raise ValueError("ANTHROPIC_API_KEY not configured")
            return ChatAnthropic(model=self.model or self.settings.ANTHROPIC_MODEL, api_key=key, temperature=0.7)

        elif provider == "google":
            key = self.api_key or self.settings.GOOGLE_API_KEY
            if not key:
                raise ValueError("GOOGLE_API_KEY not configured")
            return ChatGoogleGenerativeAI(model=self.model or self.settings.GOOGLE_MODEL, google_api_key=key, temperature=0.7)

        elif provider == "ollama":
            return ChatOllama(
                model=self.model or self.settings.OLLAMA_MODEL,
                base_url=self.base_url or self.settings.OLLAMA_BASE_URL,
                temperature=0.7
            )

        elif provider in PROVIDER_BASE_URLS:
            key = self.api_key
            if not key:
                raise ValueError(f"{provider} API key not configured")
            return ChatOpenAI(
                model=self.model,
                base_url=PROVIDER_BASE_URLS[provider],
                api_key=key,
                temperature=0.7
            )

        else:
            raise ValueError(f"Unknown AI provider: {provider}")

    def generate(self, prompt: str, system_prompt: str = None) -> str:
        llm = self._get_llm()

        if system_prompt:
            messages = [("system", system_prompt), ("human", prompt)]
        else:
            messages = [("human", prompt)]

        try:
            response = llm.invoke(messages)
            return response.content
        except Exception as e:
            logger.error(f"[LLM] Generation failed: {e}")
            raise

    def parse_json_response(self, text: str) -> dict:
        json_match = re.search(r'\{.+\}', text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
        return json.loads(text)


class ResumeParser:
    PROMPT = """You are an expert resume parser. Analyze the resume below and extract structured information.

Return ONLY valid JSON - no markdown, no explanations.

{
  "name": "Full name of candidate",
  "email": "Email address",
  "phone": "Phone number",
  "location": "City, State/Country",
  "summary": "2-3 sentence professional summary",
  "total_experience_years": "Number as string (e.g., '5' or '5+')",
  "skills": ["Python", "AWS", "Docker"],
  "education": [{"degree": "Degree type", "institution": "University", "year": "Year"}],
  "experience": [{"company": "Company", "position": "Title", "duration": "Start - End", "description": "Key responsibilities", "achievements": ["Achievement 1"]}],
  "key_achievements": ["Quantified achievement"],
  "certifications": ["Certification"],
  "languages": ["Language"]
}

Rules:
- If a field is missing, use empty string or empty array []
- Return ONLY the JSON
- Calculate total_experience_years from work history
- EXTRACT QUANTIFIABLE ACHIEVEMENTS (%, $, team sizes)

Resume text:
---
{RESUME_TEXT}
---"""

    def __init__(self, llm_service: LLMService):
        self.llm = llm_service

    def parse(self, resume_text: str) -> dict:
        prompt = self.PROMPT.format(RESUME_TEXT=resume_text[:4000])
        result = self.llm.generate(prompt)
        return self.llm.parse_json_response(result)


class EmailGenerator:
    PROMPT = """You are an expert job application assistant. Given the job posting and candidate resume, generate:

1. **email**: Extract ONLY the email address. Return null if not found.
2. **subject**: Professional job application subject (max 60 chars, no emojis)
3. **body**: Professional HTML email body (150-200 words)

Job Details:
- Position: [{job_title}]({job_url})
- Company: {company}
- Location: {location}

Job Description:
{job_description}

Resume/CV:
{resume_text}

Candidate: {candidate_name}

Return ONLY valid JSON with exactly these 3 fields:
{{"email": "extracted@email.com or null", "subject": "Application for...", "body": "<p>Dear Hiring Manager,</p>..."}}

CRITICAL RULES:
- FIRST LINE: <p>Dear Hiring Manager,</p> (nothing before)
- Use <p>, <ul>, <li>, <strong>, <br/> tags
- Position must be clickable link: <a href="{job_url}">{job_title}</a>
- Mention years of experience from resume
- Map EXACT skills from resume to requirements
- Include 1-2 quantified achievements
- Include AI tools integration paragraph
- NO emojis or special characters
- Return ONLY the JSON"""

    def __init__(self, llm_service: LLMService):
        self.llm = llm_service

    def generate(self, job_data: dict, resume_data: dict = None, candidate_name: str = None) -> dict:
        job_url = job_data.get('url', '')
        job_title = self._sanitize_title(job_data.get('title', 'Unknown Position'))
        company = job_data.get('company', 'Company')
        location = job_data.get('location', 'Unknown')
        job_description = job_data.get('description', '')

        resume_text = self._build_resume_text(resume_data, candidate_name)

        prompt = self.PROMPT.format(
            job_title=job_title,
            job_url=job_url,
            company=company,
            location=location,
            job_description=job_description[:1500],
            resume_text=resume_text[:1800],
            candidate_name=candidate_name or "Candidate"
        )

        logger.debug(f"[EmailGenerator] Prompt length: {len(prompt)} chars")

        try:
            result = self.llm.generate(prompt)
            content = self.llm.parse_json_response(result)

            return {
                'subject': content.get('subject', f"Application for {job_title}").strip(),
                'body': self._clean_body(content.get('body', '')),
                'email': self._extract_email(content.get('email'))
            }
        except json.JSONDecodeError as e:
            logger.error(f"[EmailGenerator] JSON parse failed: {e}")
            raise Exception(f"Failed to parse AI response as JSON: {e}")

    def _sanitize_title(self, title: str) -> str:
        title = title.strip()
        title = re.sub(r'#\w+', '', title)
        title = re.sub(r'^(Hiring|hiring|HIRING)[\s:]*', '', title)
        title = re.sub(r'^(we are|our team is)\s+hiring\s+', '', title, flags=re.IGNORECASE)
        title = title.strip(':-').strip()

        if len(title.split()) < 2:
            title = "the position"

        return title

    def _build_resume_text(self, resume_data: dict = None, candidate_name: str = None) -> str:
        if not resume_data:
            return "[Resume attached]"

        skills = resume_data.get("skills", [])
        experience_years = resume_data.get("total_experience_years", "extensive")
        experience = resume_data.get("experience", [])
        education = resume_data.get("education", [])
        key_achievements = resume_data.get("key_achievements", [])
        certifications = resume_data.get("certifications", [])

        exp_context = ""
        for exp in experience[:3]:
            achievements = exp.get('achievements', [])
            desc = exp.get('description', '')
            achievements_str = f" | Achievements: {', '.join(achievements)}" if achievements else ""
            exp_context += f"- {exp.get('position', 'N/A')} at {exp.get('company', 'N/A')}: {desc[:200]}{achievements_str}\n"

        return f"""Candidate's Resume:
- Name: {resume_data.get('name', candidate_name or 'Candidate')}
- Experience: {experience_years} years
- Skills: {', '.join(skills[:15]) if skills else 'Not specified'}
- Key Achievements: {', '.join(key_achievements[:5]) if key_achievements else 'Not specified'}
- Certifications: {', '.join(certifications[:3]) if certifications else 'None'}
- Experience Detail:
{exp_context}"""

    def _clean_body(self, body: str) -> str:
        body = re.sub(r'^\s*#\w+\s*', '', body, flags=re.MULTILINE)
        body = re.sub(r'\s+#\w+\s*', ' ', body)
        body = re.sub(r'^\s*#Hiring:?\s*', '', body, flags=re.MULTILINE | re.IGNORECASE)
        body = re.sub(r'\s*#Hiring:?\s*', ' ', body, flags=re.IGNORECASE)
        body = re.sub(r'\s{2,}', ' ', body)
        return body.strip()

    def _extract_email(self, email: str) -> Optional[str]:
        if not email:
            return None

        match = re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', str(email))
        return match.group() if match else None