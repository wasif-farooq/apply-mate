# Auto-Scan LinkedIn Feed & Auto-Apply

## Overview
Extend ApplyBuddy to automatically scan the user's LinkedIn feed, detect job posts, score them for relevance, and apply via two modes: Email-based or LinkedIn Easy Apply. All applications go through a review queue before submission.

## Architecture

### New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| Feed Scanner | `apps/extension/src/content/feedScanner.ts` | Content script that scrolls LinkedIn feed, detects job posts |
| Job Detector | `apps/extension/src/content/jobDetector.ts` | Identifies job posts via DOM patterns (hiring keywords, Easy Apply buttons) |
| Apply Automator | `apps/extension/src/content/applyAutomator.ts` | Handles Easy Apply form filling + email-based apply |
| Backend Feed API | `backend/app/routes/feed.py` | New endpoints for batch job processing, AI matching |
| Review Queue UI | `apps/extension/src/popup/pages/ReviewPage.tsx` | Page to review discovered jobs before applying |
| Filter Settings | `apps/extension/src/popup/pages/FilterSettings.tsx` | Keywords, job types, location preferences |

### Execution Flow

```
1. User opens LinkedIn → Extension content script activates
2. Scanner scrolls feed → Detector extracts every post
3. EVERY post scanned is saved to database (all posts, not just jobs)
4. Posts are classified: job, general, ad, unknown
5. For job posts: extract title, company, description, URL, Easy Apply flag
6. Send job batch to backend → AI scores relevance against resume
7. Matching jobs appear in extension Review Queue
8. User reviews → selects apply mode (Email or Easy Apply)
9. System executes apply → updates status
```

## Key Technical Decisions

1. **Content script** (not background script) — runs in LinkedIn tab context, can read DOM and click buttons
2. **No LinkedIn credentials stored** — uses browser's authenticated session
3. **Rate-limited scrolling** — mimics human behavior (random delays, scroll pauses) to avoid detection
4. **Easy Apply automation** — fills form fields via DOM manipulation, attaches resume, submits
5. **Email apply** — reuses existing backend pipeline (job analysis → email generation → send)

## Backend Changes

### New Endpoints

#### `POST /api/feed/save-scan`
- Receives batch of ALL scanned posts from extension (not just jobs)
- Saves each to `feed_scans` table (deduped by URL)
- Classifies post type (job/general/ad/unknown)
- For job posts, creates linked `feed_jobs` records
- Returns: `{ saved: N, jobs_found: M, duplicates_skipped: K }`

#### `POST /api/feed/scan`
- Receives batch of job posts from extension for AI scoring
- Each job: `{ url, title, company, location, description, hasEasyApply }`
- Returns AI relevance scores: `[{ jobId, score, matchReason, recommendedAction }]`
- Uses existing `LLMService` + resume data for scoring

#### `POST /api/feed/batch-apply`
- Receives list of jobs to apply to with apply mode per job
- For email mode: reuses existing `JobService.apply_to_job()`
- For Easy Apply mode: signals extension to execute DOM automation

#### `GET /api/feed/jobs`
- Returns queued jobs for the review queue UI
- Supports pagination, filtering by status (pending, approved, applied, skipped)

### Modified Files

- `backend/main.py` — register new feed router
- `backend/app/routes/feed.py` — new file
- `backend/services/job_service.py` — add `score_job_relevance()` method
- `backend/models/domain.py` — add `FeedScan`, `FeedJob` models
- `backend/models/__init__.py` — export new models
- `backend/repositories/feed_repo.py` — new repository for feed_scans and feed_jobs
- `backend/src/db/database.py` — add new table definitions

## Extension Changes

### manifest.json Updates

```json
{
  "content_scripts": [
    {
      "matches": ["https://www.linkedin.com/*"],
      "js": ["src/content/feedScanner.js"],
      "run_at": "document_idle"
    }
  ],
  "permissions": ["storage", "tabs", "scripting"],
  "host_permissions": ["https://www.linkedin.com/*"]
}
```

### Content Scripts

#### `feedScanner.ts`
- Injects into LinkedIn feed page
- Scrolls feed at human-like intervals (2-5s random delay)
- Extracts content from EVERY post in the feed
- Sends all posts to backend for storage in `feed_scans` table
- Sends job-classified posts separately for AI scoring
- Stops after configurable limit (default: 50 posts per session)

#### `jobDetector.ts`
- Classifies ALL posts into types: job, general, ad, unknown
- DOM pattern matching for job posts:
  - "Hiring" badges/keywords
  - "Easy Apply" buttons
  - Job title + company structure
  - Email addresses in post text
- For non-job posts: extracts author, raw text, URL for storage
- For job posts: returns structured job data

#### `applyAutomator.ts`
- Easy Apply mode:
  - Clicks "Easy Apply" button
  - Fills form fields (name, email, phone, resume upload)
  - Handles optional questions (years of experience, etc.)
  - Submits application
- Email mode:
  - Extracts email from post
  - Sends job data to backend for email generation
  - Queues result for review

### New Popup Pages

#### `ReviewPage.tsx`
- Lists discovered jobs with relevance scores
- Filter by score threshold, apply mode
- Actions: Approve (Email), Approve (Easy Apply), Skip, View Details
- Shows application status (pending, generated, sent, failed)
- Tab to view full scan history (all posts, not just jobs)
- Stats: posts scanned, jobs found, applications sent

#### `FilterSettings.tsx`
- Keywords: job titles, skills, companies to target
- Exclusions: keywords to skip (e.g., "intern", "contract")
- Location preferences
- Job type preferences (full-time, contract, remote)
- Scan limits (posts per session, max jobs per day)

### Modified Files

- `apps/extension/manifest.json` (or `manifest.ts` depending on build setup)
- `apps/extension/src/content/feedScanner.ts` — new
- `apps/extension/src/content/jobDetector.ts` — new
- `apps/extension/src/content/applyAutomator.ts` — new
- `apps/extension/src/popup/pages/ReviewPage.tsx` — new
- `apps/extension/src/popup/pages/FilterSettings.tsx` — new
- `apps/extension/src/popup/App.tsx` — add routing for new pages
- `apps/extension/src/services/api.ts` — add feed API methods
- `apps/extension/src/types/index.ts` — add FeedScan, FeedJob, FilterConfig types

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| LinkedIn account restriction | Random delays between actions, limit scans/hour, human-like scroll patterns |
| Easy Apply form structure changes | Flexible DOM selectors with fallbacks, regular selector updates |
| False positive job detection | AI scoring + keyword filter before presenting to user |
| Rate limiting | Configurable scan speed, pause between jobs |

## Implementation Order

1. **Phase 1: Backend Feed API** — endpoints, models, scoring logic
2. **Phase 2: Extension Content Scripts** — feed scanner, job detector
3. **Phase 3: Extension UI** — review queue, filter settings
4. **Phase 4: Easy Apply Automation** — DOM form filling
5. **Phase 5: Integration & Testing** — end-to-end flow, rate limiting

## Environment Variables

No new env vars required. Reuses existing:
- `DATABASE_URL` — store all scanned posts (`feed_scans`) and job records (`feed_jobs`)
- `AI_PROVIDER` + model config — for relevance scoring
- `JWT_SECRET` — auth for new endpoints

## Database Changes

### Table 1: `feed_scans` (every post scanned)
- `id` (PK)
- `user_id` (FK → users)
- `post_url` (unique per user)
- `post_type` (enum: job, general, ad, unknown)
- `raw_content` (text — full post text as scraped)
- `author_name`
- `author_url`
- `scanned_at` (timestamp)
- `is_duplicate` (boolean — skipped if already seen)
- `created_at`

### Table 2: `feed_jobs` (posts classified as jobs)
- `id` (PK)
- `scan_id` (FK → feed_scans, nullable)
- `user_id` (FK → users)
- `linkedin_url` (unique per user)
- `title`, `company`, `location`, `description`
- `has_easy_apply` (boolean)
- `ai_score` (float)
- `match_reason` (text)
- `status` (enum: detected, scored, pending_review, approved_email, approved_easy, applied, skipped, failed)
- `apply_mode` (enum: email, easy_apply)
- `created_at`, `updated_at`
