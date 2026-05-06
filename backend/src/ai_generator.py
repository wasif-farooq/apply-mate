import re
import config
from src.logger import logger
from src.ai.llm import LLMProvider


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
    
    prompt = f"""Write a professional job application cover letter for:

Job Details:
- Position: [{job_title}]({job_url})
- Company: {company}
- Location: {location}

Job Description:
{job_description[:1000]}

Resume/CV:
{resume_text[:1500]}

Candidate: {candidate_name}

Structure:
1. Opening: Express interest in the position at {company}, mention years of experience (use <p> tag)
2. Core stack section: <p><strong>My core stack aligns closely with your requirements:</strong></p> followed by <ul><li><strong>Category:</strong> Description</li>...</ul>
3. AI integration paragraph (use <p> tag)
4. Why interested: One sentence about why this company interests you (use <p> tag)
5. Closing: "My CV is attached for your review. Thank you for your time and consideration." (use <p> tag) + sign off with <br/>

Sign off:
<p>Best regards,<br/>{candidate_name}</p>

IMPORTANT: 
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
