# Implementation Plan: LLM-Powered Resume Parsing

## Overview
Parse resume PDF using user's configured LLM provider, extract structured data, and pass it to email generation for personalized body creation.

---

## Architecture

```
User uploads resume (PDF)
        │
        ▼
Extract text from PDF (pdfminer/pypdf)
        │
        ▼
Call user's LLM with resume parsing prompt
(Ollama/OpenAI/etc. - already configured)
        │
        ▼
Parse structured JSON response
        │
        ▼
Inject into email body generation
```

---

## Step 1: Add PDF Text Extraction
**File**: `src/resume_handler.py`

Add function to extract raw text from PDF file:

```python
def extract_text_from_pdf(file_path: str) -> str:
    """Extract text content from PDF resume."""
    from pypdf import PdfReader

    reader = PdfReader(file_path)
    text = "\n".join(page.extract_text() for page in reader.pages)
    return text
```

**Dependency**: `pip install pypdf`

---

## Step 2: Create Resume Parsing Prompt
**File**: `src/ai_generator.py` (new constant)

```python
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
      "description": "Key responsibilities and achievements"
    }
  ],
  "certifications": ["AWS Solutions Architect", "PMP"],
  "languages": ["English (Native)", "Spanish (Fluent)"]
}

Rules:
- If a field is missing or unclear, use empty string or empty array []
- Return ONLY the JSON - no preamble, no postamble
- Be precise: extract actual skills from the resume, don't guess
- Calculate total_experience_years from work history dates if available
- Include only technical/professional skills (not soft skills)

Resume text:
---
{RESUME_TEXT}
---
"""
```

---

## Step 3: Create LLM Resume Parser Function
**File**: `src/ai_generator.py` (new function)

```python
def parse_resume_with_llm(
    resume_text: str,
    provider: str = None,
    model: str = None,
    api_key: str = None
) -> dict:
    """Parse resume text using LLM and return structured data."""

    prompt = RESUME_EXTRACTION_PROMPT.format(RESUME_TEXT=resume_text[:4000])

    result = LLMProvider.generate(prompt, provider=provider, model=model, api_key=api_key)

    import json
    import re

    json_match = re.search(r'\{.+\}', result, re.DOTALL)
    if json_match:
        parsed = json.loads(json_match.group())
    else:
        parsed = json.loads(result)

    return parsed
```

---

## Step 4: Update Email Body Generation
**File**: `src/ai_generator.py` - modify `generate_email_body()`

Add parameter: `resume_data: dict = None`

```python
def generate_email_body(
    job_data: dict,
    resume_data: dict = None,  # NEW: structured dict instead of text
    candidate_name: str = None,
    provider: str = None,
    model: str = None,
    api_key: str = None
) -> str:
    # Extract data from structured dict
    if resume_data:
        skills = resume_data.get("skills", [])
        experience_years = resume_data.get("total_experience_years", "extensive")
        experience = resume_data.get("experience", [])
        education = resume_data.get("education", [])

        resume_text = f"""
Candidate's Resume:
- Name: {resume_data.get('name', candidate_name)}
- Experience: {experience_years} years
- Skills: {', '.join(skills[:10])}
- Latest role: {experience[0].get('position', 'N/A') if experience else 'N/A'} at {experience[0].get('company', 'N/A') if experience else 'N/A'}
- Education: {education[0].get('degree', 'N/A') if education else 'N/A'} from {education[0].get('institution', 'N/A') if education else 'N/A'}
"""
    else:
        resume_text = "[Resume attached]"

    # ... rest of existing function
```

---

## Step 5: Wire in `main.py`
**File**: `main.py` - update `/api/apply` endpoint

```python
# In apply_to_job() function, before generating email:

resume_parsed = None
if request.resume_path:
    try:
        resume_text = extract_text_from_pdf(request.resume_path)
        resume_parsed = parse_resume_with_llm(
            resume_text,
            provider=provider,
            model=model,
            api_key=api_key
        )
        logger.info(f"[API] Resume parsed: {resume_parsed.get('name')}, {resume_parsed.get('total_experience_years')} years exp")
    except Exception as e:
        logger.warning(f"[API] Resume parsing failed: {e}, using fallback")

# Then pass to generate_email_body:
body = generate_email_body(
    post_data,
    resume_data=resume_parsed,
    candidate_name=resume_parsed.get("name") if resume_parsed else config.GMAIL_SENDER_NAME,
    provider=provider,
    model=model,
    api_key=api_key
)
```

---

## Files to Modify

| File | Action |
|------|--------|
| `requirements.txt` | Add `pypdf` |
| `src/resume_handler.py` | Add `extract_text_from_pdf()` |
| `src/ai_generator.py` | Add `RESUME_EXTRACTION_PROMPT`, `parse_resume_with_llm()`, modify `generate_email_body()` |
| `main.py` | Wire resume parsing in `/api/apply` |

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| PDF extraction fails | Log warning, use fallback placeholder |
| LLM parsing fails | Log error, use fallback placeholder |
| Missing fields in parsed | Use empty defaults in email prompt |
| Large PDF (>4000 chars) | Truncate to 4000 chars before sending to LLM |

---

## Testing Checklist

1. Upload valid PDF resume → returns structured JSON
2. Upload corrupted PDF → graceful fallback
3. User with Ollama → uses Ollama
4. User with OpenAI → uses OpenAI
5. Generated email contains actual skills from resume
6. Generated email contains correct experience years