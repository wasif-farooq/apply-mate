/**
 * The content script <-> service worker <-> popup message contract.
 *
 * Network calls go content script -> service worker -> backend. A content
 * script runs in the page's origin, so its fetches are subject to CORS and the
 * backend does not allow the linkedin.com origin. The service worker fetches
 * under host_permissions, where CORS does not apply.
 */

export type PostType = 'job' | 'general' | 'ad' | 'unknown'

export interface CapturedPost {
  post_url: string
  post_type: PostType
  raw_content: string
  author_name?: string
  author_url?: string
  /** Job-specific fields, populated when post_type === 'job'. */
  title?: string
  company?: string
  location?: string
  has_easy_apply?: boolean
}

export interface CaptureResult {
  ok: boolean
  post?: CapturedPost
  /** Why capture failed, shown to the user rather than swallowed. */
  reason?: string
}

export interface ScanProgress {
  scanned: number
  jobs: number
  done: boolean
}

export type ExtensionMessage =
  /** popup -> content script */
  | { type: 'CAPTURE_CURRENT_POST' }
  | { type: 'SCAN_FEED'; maxPosts: number }
  | { type: 'EASY_APPLY'; url: string; autoSubmit: boolean }
  /** content script -> service worker */
  | { type: 'API_FETCH'; path: string; method?: string; body?: unknown }
  | { type: 'SCAN_PROGRESS'; progress: ScanProgress }

export interface ApiFetchResult<T = unknown> {
  ok: boolean
  status: number
  data?: T
  error?: string
}
