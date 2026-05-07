import logging
import re
from typing import Optional

from services.ai_service import LLMService, ResumeParser, EmailGenerator
from services.email_service import EmailService
from utils.linkedin_parser import fetch_linkedin_post
from utils.resume_handler import extract_text_from_pdf
from utils.email_extractor import extract_email as regex_extract_email
from utils.logger import logger
from repositories.user_repo import UserRepository
from repositories.settings_repo import SettingsRepository
from repositories.provider_repo import ProviderRepository
from models.domain import JobData, ResumeData, EmailContent

logger = logging.getLogger("job-applier")


class JobService:
    def __init__(
        self,
        user_repo: UserRepository,
        settings_repo: SettingsRepository,
        provider_repo: ProviderRepository
    ):
        self.user_repo = user_repo
        self.settings_repo = settings_repo
        self.provider_repo = provider_repo

    def _get_provider_config(self, user_id: int, provider: str) -> tuple[Optional[str], Optional[str]]:
        config = self.provider_repo.get_config(user_id, provider)
        if not config:
            return None, None
        api_key = config.config.get("api_key", "") if config.config else ""
        base_url = config.config.get("url", "") if config.config else ""
        return api_key, base_url

    def get_job_data(self, linkedin_url: str) -> JobData:
        logger.info(f"[Job] Fetching LinkedIn post: {linkedin_url}")
        data = fetch_linkedin_post(linkedin_url)
        return JobData(
            url=data.get('url', linkedin_url),
            title=data.get('title', ''),
            company=data.get('company', ''),
            location=data.get('location', ''),
            description=data.get('description', ''),
            raw_html=data.get('raw_html', '')
        )

    def parse_resume(self, resume_path: str, provider: str, model: str, api_key: str = None) -> ResumeData:
        logger.info(f"[Job] Parsing resume: {resume_path}")

        llm = LLMService(provider=provider, model=model, api_key=api_key)
        parser = ResumeParser(llm)

        resume_text = extract_text_from_pdf(resume_path)
        parsed = parser.parse(resume_text)

        return ResumeData(
            name=parsed.get('name', ''),
            email=parsed.get('email', ''),
            phone=parsed.get('phone', ''),
            location=parsed.get('location', ''),
            summary=parsed.get('summary', ''),
            total_experience_years=parsed.get('total_experience_years', '0'),
            skills=parsed.get('skills', []),
            education=parsed.get('education', []),
            experience=parsed.get('experience', []),
            key_achievements=parsed.get('key_achievements', []),
            certifications=parsed.get('certifications', []),
            languages=parsed.get('languages', [])
        )

    def generate_email(
        self,
        job_data: JobData,
        resume_data: ResumeData = None,
        candidate_name: str = None,
        provider: str = None,
        model: str = None,
        api_key: str = None
    ) -> EmailContent:
        logger.info(f"[Job] Generating email with {provider}/{model}")

        llm = LLMService(provider=provider, model=model, api_key=api_key)
        generator = EmailGenerator(llm)

        result = generator.generate(
            job_data={
                'url': job_data.url,
                'title': job_data.title,
                'company': job_data.company,
                'location': job_data.location,
                'description': job_data.description
            },
            resume_data={
                'name': resume_data.name if resume_data else None,
                'skills': resume_data.skills if resume_data else [],
                'total_experience_years': resume_data.total_experience_years if resume_data else '0',
                'experience': resume_data.experience if resume_data else [],
                'education': resume_data.education if resume_data else [],
                'key_achievements': resume_data.key_achievements if resume_data else [],
                'certifications': resume_data.certifications if resume_data else []
            } if resume_data else None,
            candidate_name=candidate_name
        )

        return EmailContent(
            subject=result['subject'],
            body=result['body'],
            email=result['email']
        )

    def send_job_email(
        self,
        user_id: int,
        to_email: str,
        subject: str,
        body: str,
        resume_path: str = None
    ) -> dict:
        user = self.user_repo.get_by_id(user_id)

        if not user or not user.refresh_token:
            raise ValueError("Gmail not connected. Please log in again.")

        email_service = EmailService(
            refresh_token=user.refresh_token,
            from_email=user.email
        )

        return email_service.send(
            to_email=to_email,
            subject=subject,
            body=body,
            resume_path=resume_path
        )

    def apply_to_job(
        self,
        user_id: int,
        linkedin_url: str,
        resume_path: str = None,
        to_email: str = None,
        provider: str = None,
        model: str = None,
        api_key: str = None
    ) -> dict:
        provider, model = provider or "", model or ""

        if not provider or not model:
            provider, model = self.provider_repo.get_default_provider_and_model(user_id)

        if not provider or not model:
            raise ValueError("Please configure AI provider and model in Settings first.")

        config_api_key, config_base_url = self._get_provider_config(user_id, provider)
        api_key = api_key or config_api_key

        job_data = self.get_job_data(linkedin_url)

        resume_data = None
        candidate_name = ""
        if resume_path:
            try:
                resume_data = self.parse_resume(resume_path, provider, model, api_key)
                candidate_name = resume_data.name
            except Exception as e:
                logger.warning(f"[Job] Resume parsing failed: {e}")

        email_content = self.generate_email(
            job_data=job_data,
            resume_data=resume_data,
            candidate_name=candidate_name,
            provider=provider,
            model=model,
            api_key=api_key
        )

        email = email_content.email or to_email
        if not email:
            email = regex_extract_email(f"{job_data.title} {job_data.company} {job_data.description}")

        if not email:
            raise ValueError("No email found in LinkedIn post and no recipient provided.")

        total_exp = resume_data.total_experience_years if resume_data else "0"

        return {
            'title': job_data.title,
            'company': job_data.company,
            'location': job_data.location,
            'description': job_data.description[:500],
            'email': email,
            'subject': email_content.subject,
            'body': email_content.body,
            'status': 'generated',
            'total_experience_years': total_exp
        }