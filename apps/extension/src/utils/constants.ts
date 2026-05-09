export const DEFAULT_BACKEND_URL = 'http://localhost:8000'

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_EMAIL: 'user_email',
  BACKEND_URL: 'backend_url',
  LINKEDIN_URL: 'apply_buddy_linkedin_url',
  SELECTED_RESUME_ID: 'apply_buddy_selected_resume_id',
  SELECTED_RESUME_NAME: 'apply_buddy_selected_resume_name',
} as const

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS]