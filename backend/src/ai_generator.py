import re
import json
import config
from src.logger import logger
from src.ai.llm import LLMProvider


RESUME_EXTRACTION_PROMPT = """You are an expert resume parser. Analyze the resume below and extract structured information.

Return ONLY valid JSON - no markdown, no explanations, no text before or after.

{
  "name": "Full name of candidate",
  "email": "Email address",
  "phone": "Phone number",
  "location": "City, State/Country",
  "summary": "2-3 sentence professional summary",
  "total_experience_years": "Number as string (e.g., '5' or '5+')",
  "skills": ["Python", "AWS", "Docker", "React", "PostgreSQL"],
  "education": [
    {
      "degree": "Degree type and field (e.g., B.S. Computer Science)",
      "institution": "University name",
      "year": "Graduation year"
    }
  ],
  "experience": [
    {
      "company": "Company name",
      "position": "Job title",
      "duration": "Start - End (e.g., 2020 - Present)",
      "description": "Key responsibilities and achievements",
      "achievements": ["Reduced latency by 40%", "Led team of 5", "$50K budget managed"]
    }
  ],
  "key_achievements": ["Increased sales 30%", "Reduced CI/CD time by 50%", "99.9% uptime achieved"],
  "certifications": ["AWS Solutions Architect", "PMP"],
  "languages": ["English (Native)", "Spanish (Fluent)"]
}

Rules:
- If a field is missing or unclear, use empty string or empty array []
- Return ONLY the JSON - no preamble, no postamble
- Be precise: extract actual skills from the resume, don't guess
- Calculate total_experience_years from work history dates if available
- Include only technical/professional skills (not soft skills)
- EXTRACT QUANTIFIABLE ACHIEVEMENTS: Look for percentages (%, %), dollar amounts ($), team sizes, performance metrics, time reductions, efficiency gains
- Extract achievements as short, specific phrases (e.g., "40% faster", "5-person team", "$100K saved")

Resume text:
---
{RESUME_TEXT}
---
"""


def parse_resume_with_llm(
    resume_text: str,
    provider: str = None,
    model: str = None,
    api_key: str = None
) -> dict:
    """Parse resume text using LLM and return structured data."""
    prompt = RESUME_EXTRACTION_PROMPT.format(RESUME_TEXT=resume_text[:4000])

    try:
        result = LLMProvider.generate(prompt, provider=provider, model=model, api_key=api_key)
        logger.debug(f"[Resume Parse] Raw response: {result}")

        json_match = re.search(r'\{.+\}', result, re.DOTALL)
        if json_match:
            parsed = json.loads(json_match.group())
        else:
            parsed = json.loads(result)

        logger.info(f"[Resume Parse] Successfully parsed: {parsed.get('name', 'Unknown')}, {parsed.get('total_experience_years', '?')} years exp")
        return parsed
    except Exception as e:
        logger.error(f"[Resume Parse] Failed: {e}")
        raise


def generate_subject(job_data: dict, candidate_name: str, provider: str = None, model: str = None, api_key: str = None) -> str:
    job_title = job_data.get('title', 'Unknown Position')
    company = job_data.get('company', 'Company')
    
    # Sanitize job title - if it looks like a person's name or UI text, use generic
    title_lower = job_title.lower()
    if any(t in title_lower for t in ["report", "like", "comment", "share"]) or \
       any(t in title_lower for t in ["hour", "minute", "day", "week", "yesterday", "ago"]) or \
       (len(job_title.split()) <= 3 and not any(kw in title_lower for kw in ["job", "position", "role", "hiring"])):
        job_title = "the position"
    
    prompt = f"""Generate a professional job application email subject line (max 60 characters).

    Job Title: {job_title}
    Company: {company}
    Candidate Name: {candidate_name}

    Format: "Application for [Job Title] at [Company] - [Candidate Name]"

    IMPORTANT: Use exactly "{candidate_name}" as the candidate name - do NOT use "[Your Name]" or any placeholder.

    Return ONLY the subject line, nothing else."""

    logger.debug(f"[AI Subject] Prompt:\n{prompt}")

    try:
        result = LLMProvider.generate(prompt, provider=provider, model=model, api_key=api_key)
        logger.debug(f"[AI Subject] Raw response: {result}")
        return result.strip()
    except Exception as e:
        logger.error(f"[AI Subject] Generation failed: {e}")
        raise


def clean_email_body(body: str) -> str:
    """Clean the generated email body - remove hashtags, fix formatting, ensure proper word count."""
    # Remove standalone hashtags
    body = re.sub(r'^\s*#\w+\s*', '', body, flags=re.MULTILINE)
    body = re.sub(r'\s+#\w+\s*', ' ', body)
    
    # Remove #hiring patterns at the start of lines
    body = re.sub(r'^\s*#Hiring:?\s*', '', body, flags=re.MULTILINE | re.IGNORECASE)
    body = re.sub(r'\s*#Hiring:?\s*', ' ', body, flags=re.IGNORECASE)
    
    # Clean up multiple spaces
    body = re.sub(r'\s{2,}', ' ', body)
    
    # Count words and log
    word_count = len(body.split())
    logger.debug(f"[AI Body] Generated word count: {word_count}")
    
    return body.strip()


def generate_email_body(job_data: dict, resume_text: str, candidate_name: str, provider: str = None, model: str = None, api_key: str = None) -> str:
    job_url = job_data.get('url', '')
    job_title = job_data.get('title', 'Unknown Position')
    company = job_data.get('company', 'Company')
    location = job_data.get('location', 'Unknown')
    job_description = job_data.get('description', '')
    
    # Enhanced sanitization - remove hashtags, prefixes, clean titles
    job_title = job_title.strip()
    
    # Remove hashtags (#word)
    job_title = re.sub(r'#\w+', '', job_title)
    
    # Remove "Hiring:" or "hiring:" or "HIRING:" prefix
    job_title = re.sub(r'^(Hiring|hiring|HIRING)[\s:]*', '', job_title)
    
    # Remove "We are hiring" or similar patterns
    job_title = re.sub(r'^(we are|our team is)\s+hiring\s+', '', job_title, flags=re.IGNORECASE)
    
    # Clean up any leading/trailing colons, dashes, whitespace
    job_title = job_title.strip(':-').strip()
    
    # If title is now empty or too short (less than 2 words), use generic
    if len(job_title.split()) < 2:
        job_title = "the position"
        logger.debug(f"[AI Body] Sanitized job title to 'the position'")
    

        prompt = f"""Write a professional job application email body in HTML format, following the structure below exactly. The email must map the candidate's real experience to the job requirements, include AI tool usage, and stay between 150-200 words.

Candidate Name: {candidate_name}
Job Title: {job_title}
Job Posting URL (LinkedIn): {job_url}
Company: {company}
Location: {location}

Job Description (truncated):
{job_description[:1000]}

Candidate's Resume/CV (truncated):
{resume_text[:1500]}

STRUCTURE – REPRODUCE EXACTLY:

1. OPENING (2 paragraphs):
   <p>Dear Hiring Manager,</p>
   <p>I’m writing to express my strong interest in the <a href="{job_url}">{job_title}</a> position at {company}. With [X] years of hands-on experience in [key domain from resume], I’m confident I can make an immediate impact on your team.</p>
   Replace [X] with exact years of experience deduced from the resume; if unclear, use “extensive”. Replace [key domain] with the primary field from the resume (e.g., back-end development, full-stack engineering). The job title MUST be a clickable HTML link pointing to the job_url.

2. SKILLS MAPPING (1 paragraph + bullet list):
   <p><strong>My core stack aligns closely with your requirements:</strong></p>
   <ul>
     <li><strong>Category/Technology:</strong> Concrete, experiential description referencing specific tools, systems, and results from the resume and job description.</li>
     ... (4–6 bullets total)
   </ul>

3. AI INTEGRATION (1 paragraph):
   <p>Beyond the stack, I integrate AI deeply into my daily development. I use Claude, Codex, or equivalent tools to accelerate boilerplate, generate tests, debug complex logic, and refactor efficiently — treating them as force multipliers, not crutches.</p>

4. COMPANY INTEREST (1 paragraph):
   <p>I am drawn to {company}’s [mission/product/engineering culture] and would welcome the chance to discuss how I can contribute.</p>
   Fill the bracketed part with a plausible, short descriptor based on the company or a neutral phrase like “engineering team” if nothing specific is known.

5. CLOSING (1 paragraph):
   <p>My CV is attached for your review. Thank you for your time and consideration.</p>

6. SIGN-OFF (1 paragraph):
   <p>Best regards,<br/>{candidate_name}</p>

CRITICAL RULES:
- The VERY FIRST LINE of the output must be <p>Dear Hiring Manager,</p> and absolutely nothing else. Do NOT include the company name in the greeting (e.g., no “Dear [Company] Hiring Team”). Ignore any company name in the greeting.
- Output ONLY the HTML email body — no subject line, no markdown, no code fences, no “Here is the email”.
- All placeholders like [X] must be replaced with real numbers or details from the resume.
- Bullets must be specific and truthful; never fabricate skills not in the resume.
- The job title must be a clickable link: <a href="{job_url}">{job_title}</a>.
- 150–200 words total. No hashtags, no metadata, no stray characters.
"""

        logger.debug(f"[AI Body] Prompt:\n{prompt}")

    try:
        result = LLMProvider.generate(prompt, provider=provider, model=model, api_key=api_key)
        logger.debug(f"[AI Body] Raw response: {result}")
        cleaned = clean_email_body(result)
        return cleaned.strip()
    except Exception as e:
        logger.error(f"[AI Body] Generation failed: {e}")
        raise


def generate_email_content(
    job_data: dict,
    resume_data: dict = None,
    candidate_name: str = None,
    provider: str = None,
    model: str = None,
    api_key: str = None
) -> dict:
    """
    Generate email content in a single AI call.
    Returns dict with: subject, body, email (extracted from job post if present)
    """
    job_url = job_data.get('url', '')
    job_title = job_data.get('title', 'Unknown Position')
    company = job_data.get('company', 'Company')
    location = job_data.get('location', 'Unknown')
    job_description = job_data.get('description', '')

    # Build resume_text from structured data or use fallback
    resume_text = ""
    if resume_data:
        skills = resume_data.get("skills", [])
        experience_years = resume_data.get("total_experience_years", "extensive")
        experience = resume_data.get("experience", [])
        education = resume_data.get("education", [])
        key_achievements = resume_data.get("key_achievements", [])
        certifications = resume_data.get("certifications", [])

        latest_role = experience[0].get('position', 'N/A') if experience else 'N/A'
        latest_company = experience[0].get('company', 'N/A') if experience else 'N/A'
        latest_edu = education[0].get('degree', 'N/A') if education else 'N/A'
        latest_school = education[0].get('institution', 'N/A') if education else 'N/A'

        exp_context = ""
        for exp in experience[:3]:
            exp_achievements = exp.get('achievements', [])
            exp_desc = exp.get('description', '')
            achievements_str = f" | Achievements: {', '.join(exp_achievements)}" if exp_achievements else ""
            exp_context += f"- {exp.get('position', 'N/A')} at {exp.get('company', 'N/A')}: {exp_desc[:200]}{achievements_str}\n"

        resume_text = f"""
Candidate's Resume:
- Name: {resume_data.get('name', candidate_name or 'Candidate')}
- Experience: {experience_years} years
- Skills (EXACT): {', '.join(skills[:15]) if skills else 'Not specified'}
- Key Achievements: {', '.join(key_achievements[:5]) if key_achievements else 'Not specified'}
- Certifications: {', '.join(certifications[:3]) if certifications else 'None'}
- Latest Role: {latest_role} at {latest_company}
- Education: {latest_edu} from {latest_school}
- Summary: {resume_data.get('summary', 'Not provided')}
- Experience Detail:
{exp_context}
"""
        if not candidate_name:
            candidate_name = resume_data.get('name', 'Candidate')
    else:
        resume_text = "[Resume attached]"
        if not candidate_name:
            candidate_name = "Candidate"

    # Sanitize job_title
    clean_job_title = job_title.strip()
    clean_job_title = re.sub(r'#\w+', '', clean_job_title)
    clean_job_title = re.sub(r'^(Hiring|hiring|HIRING)[\s:]*', '', clean_job_title)
    clean_job_title = re.sub(r'^(we are|our team is)\s+hiring\s+', '', clean_job_title, flags=re.IGNORECASE)
    clean_job_title = clean_job_title.strip(':-').strip()
    
    if len(clean_job_title.split()) < 2:
        clean_job_title = "the position"

    # Combined prompt that extracts email, generates subject, and body
    prompt = f"""You are an expert job application assistant. Given the job posting and candidate resume, generate:

1. **email**: Extract email address ONLY from the job description text (the main posting content). 
   - IMPORTANT: Do NOT extract emails from comments, replies, or metadata.
   - Only extract if email is explicitly in the description section.
   - If no email in description, return null.
2. **subject**: A professional job application email subject line (max 60 characters).
3. **body**: A professional job application email body in HTML format (150-200 words).

Job Details:
- Position: [{clean_job_title}]({job_url})
- Company: {company}
- Location: {location}

Job Description:
{job_description[:1500]}

Resume/CV:
{resume_text[:1800]}

Candidate: {candidate_name}

Return ONLY valid JSON with exactly these 3 fields:
{{
  "email": "extracted@email.com" or null,
  "subject": "Application for [Position] at [Company] - [Name]",
  "body": "<p>Dear Hiring Manager,</p>...<p>Best regards,<br/>[Name]</p>"
}}

CRITICAL RULES FOR BODY:
- Use <p> tags for paragraphs, <ul>/<li> for lists, <strong> for bold, <br/> for line breaks
- Include the position as a clickable link: <a href="{job_url}">{clean_job_title}</a>
- Map EXACT skills from resume to job requirements
- Include 1-2 quantified achievements from resume (e.g., "40% faster", "5-person team")
- Include paragraph about AI tools integration
- FIRST LINE MUST BE: <p>Dear Hiring Manager,</p> (nothing else before)
- Return ONLY the JSON - no markdown, no explanations"""

    logger.debug(f"[AI Content] Combined prompt:\n{prompt}")

    try:
        result = LLMProvider.generate(prompt, provider=provider, model=model, api_key=api_key)
        logger.debug(f"[AI Content] Raw response: {result}")
        
        # Parse JSON from response
        json_match = re.search(r'\{[^}]+\}', result, re.DOTALL)
        if json_match:
            content = json.loads(json_match.group())
        else:
            content = json.loads(result)
        
        subject = content.get('subject', f"Application for {clean_job_title}").strip()
        body = content.get('body', '').strip()
        email = content.get('email')
        
        # Clean body
        body = clean_email_body(body)
        
        logger.info(f"[AI Content] Generated - subject: {subject[:50]}..., email found: {bool(email)}")
        return {
            'subject': subject,
            'body': body,
            'email': email
        }
    except json.JSONDecodeError as e:
        logger.error(f"[AI Content] JSON parse failed: {e}, response: {result}")
        raise Exception(f"Failed to parse AI response as JSON: {e}")
    except Exception as e:
        logger.error(f"[AI Content] Generation failed: {e}")
        raise


def generate_email_body(job_data: dict, resume_data: dict = None, candidate_name: str = None, provider: str = None, model: str = None, api_key: str = None) -> str:
    job_url = job_data.get('url', '')
    job_title = job_data.get('title', 'Unknown Position')
    company = job_data.get('company', 'Company')
    location = job_data.get('location', 'Unknown')
    job_description = job_data.get('description', '')

    # Build resume_text from structured data or use fallback
    if resume_data:
        skills = resume_data.get("skills", [])
        experience_years = resume_data.get("total_experience_years", "extensive")
        experience = resume_data.get("experience", [])
        education = resume_data.get("education", [])
        key_achievements = resume_data.get("key_achievements", [])
        certifications = resume_data.get("certifications", [])

        latest_role = experience[0].get('position', 'N/A') if experience else 'N/A'
        latest_company = experience[0].get('company', 'N/A') if experience else 'N/A'
        latest_edu = education[0].get('degree', 'N/A') if education else 'N/A'
        latest_school = education[0].get('institution', 'N/A') if education else 'N/A'

        exp_context = ""
        for exp in experience[:3]:
            exp_achievements = exp.get('achievements', [])
            exp_desc = exp.get('description', '')
            achievements_str = f" | Achievements: {', '.join(exp_achievements)}" if exp_achievements else ""
            exp_context += f"- {exp.get('position', 'N/A')} at {exp.get('company', 'N/A')}: {exp_desc[:200]}{achievements_str}\n"

        resume_text = f"""
Candidate's Resume:
- Name: {resume_data.get('name', candidate_name or 'Candidate')}
- Experience: {experience_years} years
- Skills (EXACT): {', '.join(skills[:15]) if skills else 'Not specified'}
- Key Achievements: {', '.join(key_achievements[:5]) if key_achievements else 'Not specified'}
- Certifications: {', '.join(certifications[:3]) if certifications else 'None'}
- Latest Role: {latest_role} at {latest_company}
- Education: {latest_edu} from {latest_school}
- Summary: {resume_data.get('summary', 'Not provided')}
- Experience Detail:
{exp_context}
"""
        if not candidate_name:
            candidate_name = resume_data.get('name', 'Candidate')
    else:
        resume_text = "[Resume attached]"
        if not candidate_name:
            candidate_name = "Candidate"

    # Enhanced sanitization - remove hashtags, prefixes, clean titles
    job_title = job_title.strip()

    # Remove hashtags (#word)
    job_title = re.sub(r'#\w+', '', job_title)
    
    # Remove "Hiring:" or "hiring:" or "HIRING:" prefix
    job_title = re.sub(r'^(Hiring|hiring|HIRING)[\s:]*', '', job_title)
    
    # Remove "We are hiring" or similar patterns
    job_title = re.sub(r'^(we are|our team is)\s+hiring\s+', '', job_title, flags=re.IGNORECASE)
    
    # Clean up any leading/trailing colons, dashes, whitespace
    job_title = job_title.strip(':-').strip()
    
    # If title is now empty or too short (less than 2 words), use generic
    if len(job_title.split()) < 2:
        job_title = "the position"
        logger.debug(f"[AI Body] Sanitized job title to 'the position'")
    
    prompt = f"""Write a professional job application cover letter for:

Job Details:
- Position: [{job_title}]({job_url})
- Company: {company}
- Location: {location}

Job Description:
{job_description[:1000]}

Resume/CV:
{resume_text[:1800]}

Candidate: {candidate_name}

Structure:
1. Opening: Express interest in the position at {company}, mention years of experience and one specific achievement (use <p> tag)
2. Core stack section: <p><strong>My core stack aligns closely with your requirements:</strong></p> followed by <ul><li><strong>Category:</strong> Description</li>...</ul> - USE EXACT SKILLS FROM RESUME
3. ACHIEVEMENTS: Include 1-2 quantified results from resume (e.g., "reduced latency by 40%", "led team of 5")
4. AI integration paragraph (use <p> tag)
5. Why interested: One sentence about why this company interests you (use <p> tag)
6. Closing: "My CV is attached for your review. Thank you for your time and consideration." (use <p> tag) + sign off with <br/>

Sign off:
<p>Best regards,<br/>{candidate_name}</p>

CRITICAL INSTRUCTIONS:
- Use EXACT skills from resume - if resume lists "Python, AWS, Kubernetes", write about those specific skills
- Include 1-2 QUANTIFIED ACHIEVEMENTS from the resume (e.g., "40% faster", "99.9% uptime", "5-person team")
- Reference specific work from experience descriptions when connecting to job requirements
- Map resume achievements to job requirements - show how your past success translates to this role
- Use PROPER HTML TAGS for formatting - <p> for paragraphs, <ul>/<li> for lists, <strong> for bold/emphasis, <br/> for line breaks
- Include the position title AS A CLICKABLE LINK wrapped in <a> tag pointing to: {job_url}
- Use conversational but professional tone
- MUST be 150-200 words. Keep it concise.
- Use <ul><li> format for core skills - each skill as <li><strong>Category:</strong> Description</li>
- Include paragraph about AI tools integration
- Do NOT include hashtags, "#", or metadata in the letter.
- Return ONLY the complete HTML email body, no subject line, no markdown"""

    logger.debug(f"[AI Body] Prompt:\n{prompt}")

    try:
        result = LLMProvider.generate(prompt)
        logger.debug(f"[AI Body] Raw response: {result}")
        cleaned = clean_email_body(result)
        return cleaned.strip()
    except Exception as e:
        logger.error(f"[AI Body] Generation failed: {e}")
        raise
