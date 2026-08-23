export const DEFAULT_BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_EMAIL: 'user_email',
  BACKEND_URL: 'backend_url',
  LINKEDIN_URL: 'apply_buddy_linkedin_url',
  SELECTED_RESUME_ID: 'apply_buddy_selected_resume_id',
  SELECTED_RESUME_NAME: 'apply_buddy_selected_resume_name',
  CAPTURED_POST: 'apply_buddy_captured_post',
  FEATURES: 'apply_buddy_features',
} as const

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS]

/** What the extension is allowed to do, all user-toggleable. */
export interface FeatureSettings {
  capturePosts: boolean
  feedScan: boolean
  easyApply: boolean
  /** false = fill the form and stop so the user presses Submit. */
  easyApplyAutoSubmit: boolean
  maxPostsPerScan: number
  minScoreToQueue: number
}

export const DEFAULT_FEATURES: FeatureSettings = {
  capturePosts: true,
  feedScan: false,
  easyApply: false,
  easyApplyAutoSubmit: true,
  maxPostsPerScan: 50,
  minScoreToQueue: 70,
}
