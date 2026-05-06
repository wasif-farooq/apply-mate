from langgraph.prebuilt import ToolNode
from langchain_core.tools import tool
import requests
from bs4 import BeautifulSoup
import re
import smtplib
import json
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
import config
from src.logger import logger


@tool
def fetch_linkedin_tool(url: str) -> str:
    """Fetch and parse a LinkedIn job post to extract job details.

    Args:
        url: The LinkedIn post URL to fetch

    Returns:
        JSON string with job title, company, location, description, and raw_html
    """
    import json
    from src.linkedin_fetcher import fetch_linkedin_post

    logger.info(f"[Agent] Fetching LinkedIn post: {url}")

    try:
        data = fetch_linkedin_post(url)
        logger.info(f"[Agent] Successfully fetched: {data.get('title', '')} @ {data.get('company', '')}")

        return json.dumps({
            "title": data.get("title", ""),
            "company": data.get("company", ""),
            "location": data.get("location", ""),
            "description": data.get("description", ""),
            "raw_html": data.get("raw_html", "")
        }, ensure_ascii=False)

    except Exception as e:
        logger.error(f"[Agent] Failed to fetch LinkedIn: {e}")
        return json.dumps({"error": f"Failed to fetch LinkedIn post: {str(e)}"})


@tool
def extract_email_tool(text: str) -> str:
    """Extract email address from text content.

    Args:
        text: Text content to search for email addresses

    Returns:
        JSON string with extracted email or error
    """
    logger.info("[Agent] Extracting email from content")

    patterns = [
        r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}",
        r"email:\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})",
        r"contact:\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})",
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            email = match.group(1) if match.lastindex else match.group()
            logger.info(f"[Agent] Extracted email: {email}")
            import json
            return json.dumps({"email": email})

    logger.info("[Agent] No email found in content")
    import json
    return json.dumps({"email": ""})


@tool
def generate_email_ai_tool(job_title: str, company: str, location: str, description: str, candidate_name: str, resume_info: str) -> str:
    """Generate job application email subject and body using AI (Ollama).

    Args:
        job_title: The job title
        company: Company name
        location: Job location
        description: Job description/requirements
        candidate_name: Candidate's name
        resume_info: Resume details or "[Resume attached]"

    Returns:
        JSON string with subject and body
    """
    logger.info(f"[Agent] Generating email for {job_title} @ {company}")

    import requests

    subject_prompt = f"""Generate a professional job application email subject line (max 60 characters).

IMPORTANT: 
1. The job title is NOT the LinkedIn post title. You MUST find the actual job title in the job description text below.
2. Use the EXACT candidate name provided: {candidate_name}

Job Description (extract actual job title from here): {description[:600]}

Company: {company}
Candidate Name: {candidate_name}

Format: "Application for [Actual Job Title] - [Candidate Name]"
Example: "Application for Frontend Developer - Wasif Farooq"

IMPORTANT: Use exactly "{candidate_name}" as the candidate name - do NOT use "[Your Name]" or any placeholder.

Return ONLY the subject line, nothing else."""

    body_prompt = f"""Write a concise, professional job application cover letter (150-200 words) for:
Job: {job_title} at {company} (Location: {location})
Requirements: {description[:800]}
Resume: {resume_info}
Candidate: {candidate_name}

Write in a professional style. End with a call to action and include:
Best regards,
{candidate_name}

Return ONLY the complete email body with signature."""

    try:
        from src.ai.llm import LLMProvider

        subject = LLMProvider.generate(subject_prompt)
        body = LLMProvider.generate(body_prompt)

        logger.info(f"[Agent] Generated email - Subject: {subject[:50]}...")

        import json
        return json.dumps({
            "subject": subject,
            "body": body
        })

    except Exception as e:
        logger.error(f"[Agent] AI generation failed: {e}")
        return f'{{"error": "AI generation failed: {str(e)}"}}'


@tool
def validate_email_quality_tool(subject: str, body: str) -> str:
    """Validate the quality of generated email subject and body.

    Args:
        subject: The email subject to validate
        body: The email body to validate

    Returns:
        JSON string with quality score and feedback
    """
    logger.info("[Agent] Validating email quality")

    issues = []

    if len(subject) > 60:
        issues.append("Subject too long (max 60 chars)")

    if not subject:
        issues.append("Missing subject")

    if not body:
        issues.append("Missing body")

    if len(body) < 50:
        issues.append("Body too short")

    if "Best regards" not in body and "Sincerely" not in body:
        issues.append("Missing signature")

    if not issues:
        logger.info("[Agent] Email quality: GOOD")
        import json
        return json.dumps({"quality": "good", "feedback": "Email looks professional", "issues": []})
    else:
        logger.info(f"[Agent] Email quality issues: {issues}")
        import json
        return json.dumps({"quality": "needs_improvement", "feedback": "Issues found", "issues": issues})


@tool
def send_gmail_tool(to_email: str, subject: str, body: str, resume_path: str = "") -> str:
    """Send email via Gmail using app password.

    Args:
        to_email: Recipient email address
        subject: Email subject
        body: Email body
        resume_path: Path to resume PDF (optional)

    Returns:
        JSON string with success/failure status
    """
    logger.info(f"[Agent] Sending email to {to_email}")
    return '{"error": "Email sending not configured. Please configure email provider in Settings."}'


@tool
def request_user_approval_tool(subject: str, body: str, to_email: str) -> str:
    """Request user approval before sending email.

    Args:
        subject: Email subject
        body: Email body
        to_email: Recipient email

    Returns:
        JSON string asking for approval
    """
    import json
    logger.info("[Agent] Requesting user approval")
    return json.dumps({
        "needs_approval": True,
        "message": "Review email before sending",
        "to": to_email,
        "subject": subject,
        "body": body[:200] + "..."
    })


def get_tools():
    return [
        fetch_linkedin_tool,
        extract_email_tool,
        generate_email_ai_tool,
        validate_email_quality_tool,
        send_gmail_tool,
        request_user_approval_tool,
    ]