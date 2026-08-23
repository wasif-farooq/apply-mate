export * from './types'
export * from './api-client'

export const DEFAULT_BACKEND_URL = 'http://localhost:8000'
export const API_ENDPOINTS = {
  apply: '/api/apply',
  send: '/api/send',
  uploadResume: '/api/upload-resume',
  emailSettings: '/api/settings/email',
  feedSaveScan: '/api/feed/save-scan',
  feedScan: '/api/feed/scan',
  feedJobs: '/api/feed/jobs',
  feedBatchApply: '/api/feed/batch-apply',
  health: '/health',
  extensionToken: '/auth/extension/token',
} as const