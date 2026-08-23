import type {
  ApplyResponse,
  CapturedPost,
  FeedJob,
  Resume,
  SendEmailRequest,
  SendEmailResponse,
} from '../types'

export interface ApplyParams {
  linkedin_url?: string
  /** Post text captured from the page. When present the backend does not scrape. */
  job_post_text?: string
  resume_id?: number
  to_email?: string
}

async function request<T>(
  baseUrl: string,
  token: string,
  path: string,
  init: { method?: string; body?: unknown } = {}
): Promise<T> {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` }
  if (init.body !== undefined) headers['Content-Type'] = 'application/json'

  const response = await fetch(`${baseUrl}${path}`, {
    method: init.method ?? 'GET',
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    // The backend distinguishes 422 (this post is unreadable) from 503 (the
    // AI service is down). Pass its message through rather than flattening
    // everything into "Failed".
    throw new Error(data.detail || `Request failed (${response.status})`)
  }

  return response.json()
}

export function fetchResumes(baseUrl: string, token: string): Promise<Resume[]> {
  return request<Resume[]>(baseUrl, token, '/api/resumes')
}

export function applyToJob(
  baseUrl: string,
  token: string,
  params: ApplyParams
): Promise<ApplyResponse> {
  return request<ApplyResponse>(baseUrl, token, '/api/apply', {
    method: 'POST',
    body: params,
  })
}

export function sendEmail(
  baseUrl: string,
  token: string,
  email: SendEmailRequest
): Promise<SendEmailResponse> {
  return request<SendEmailResponse>(baseUrl, token, '/api/send', {
    method: 'POST',
    body: email,
  })
}

export function saveScan(
  baseUrl: string,
  token: string,
  posts: CapturedPost[]
): Promise<{ saved: number; jobs_found: number; duplicates_skipped: number }> {
  return request(baseUrl, token, '/api/feed/save-scan', {
    method: 'POST',
    body: { posts },
  })
}

export function scanJobs(
  baseUrl: string,
  token: string,
  posts: CapturedPost[],
  resumeId?: number
): Promise<{ scored: FeedJob[]; skipped: number }> {
  return request(baseUrl, token, '/api/feed/scan', {
    method: 'POST',
    body: {
      jobs: posts.map((p) => ({
        url: p.post_url,
        title: p.title,
        company: p.company,
        location: p.location,
        description: p.raw_content,
        has_easy_apply: p.has_easy_apply ?? false,
      })),
      resume_id: resumeId,
    },
  })
}

export function listFeedJobs(
  baseUrl: string,
  token: string,
  params: { status?: string; minScore?: number } = {}
): Promise<{ jobs: FeedJob[]; total: number }> {
  const query = new URLSearchParams()
  if (params.status) query.set('status', params.status)
  if (params.minScore !== undefined) query.set('min_score', String(params.minScore))
  const suffix = query.toString() ? `?${query}` : ''
  return request(baseUrl, token, `/api/feed/jobs${suffix}`)
}

export function skipFeedJob(baseUrl: string, token: string, jobId: number): Promise<FeedJob> {
  return request<FeedJob>(baseUrl, token, `/api/feed/jobs/${jobId}/skip`, { method: 'POST' })
}

export function batchApply(
  baseUrl: string,
  token: string,
  jobIds: number[],
  applyMode: 'email' | 'easy_apply',
  resumeId?: number
): Promise<{
  results: { job_id: number; status: string; application_id?: number; error?: string }[]
}> {
  return request(baseUrl, token, '/api/feed/batch-apply', {
    method: 'POST',
    body: { job_ids: jobIds, apply_mode: applyMode, resume_id: resumeId },
  })
}
