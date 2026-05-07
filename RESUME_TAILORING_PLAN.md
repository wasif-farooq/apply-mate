# Resume Tailoring Feature Plan

## Overview
Update resume according to job description and requirements, save new resume, and attach that new resume.

## User Preferences (from Q&A)
- **Output Format**: Both Markdown/Text and PDF (user can choose)
- **Modification Strategy**: Full rewrite + keyword injection + reorder/reformat (all approaches)
- **Storage**: Local folder per job (resumes/company-job-date.pdf)

---

## Proposed Architecture

### 1. Backend: New Resume Tailoring Module
- `src/resume_tailor.py` - Core logic
- **Input**: Base resume (text/PDF) + job description
- **Process**:
  1. Parse job requirements (skills, keywords, experience)
  2. Analyze base resume content
  3. Generate tailored version using AI
     - Full rewrite for better alignment
     - Inject targeted keywords from job posting
     - Reorder/reformat to highlight relevant sections
  4. Convert to requested format (Markdown or PDF)

### 2. API Endpoints
- `POST /api/resume/tailor` - Generate tailored resume
- `GET /api/resume/formats` - List supported output formats

### 3. Frontend: Resume Tailor UI
- New page `/apply/tailor` or integrate into `/apply` page
- Options:
  - Format selector (Markdown/PDF)
  - Preview before saving
  - Save button → download + local save
- "Use this resume" button to attach to email

### 4. Storage Structure
```
backend/
  tailored_resumes/
    {company}_{job-title}_{date}.{md|pdf}
```

### 5. Integration with Email Flow
- After tailoring, user can attach tailored resume to application email

---

## Technical Details

### PDF Generation Options
- **Backend (Python)**: WeasyPrint, ReportLab, fpdf
- **Frontend (JS)**: jsPDF, react-pdf

### Resume Parsing
- Use libraries to extract text from existing PDF/DOCX resumes
- python-docx for .docx files
- pdfplumber or PyPDF2 for .pdf files

### AI Prompt Strategy
- Input: Job description + base resume + target format
- Output: Tailored resume in requested format
- Include instructions for keyword mapping, experience highlighting

---

## Open Questions (to resolve later)
1. PDF generation: Backend (Python) or Frontend (JS)?
2. Version history: Keep previous versions of tailored resumes?
3. Edit capability: Allow user to edit AI-generated resume before saving?

---

## Next Steps
1. Decide on PDF generation approach
2. Set up resume parsing for input formats
3. Create resume_tailor.py module
4. Add API endpoints
5. Build frontend UI
6. Integrate with email sending flow