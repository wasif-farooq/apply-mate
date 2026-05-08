export * from './types'
export * from './api-client'

export const DEFAULT_BACKEND_URL = 'http://localhost:8000'
export const API_ENDPOINTS = {
  apply: '/api/apply',
  send: '/api/send',
  settings: '/api/settings',
  uploadResume: '/api/upload-resume',
  health: '/health',
  authGoogle: '/auth/google',
  authCallback: '/auth/callback',
} as const