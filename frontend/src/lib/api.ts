import { getToken } from './auth'

const API_BASE = 'http://localhost:8000'

function getHeaders(): HeadersInit {
  const token = getToken()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

export interface ApplyResponse {
  title: string
  company: string
  location: string
  description: string
  email: string
  subject: string
  body: string
  status: string
}

export interface ApplyRequest {
  linkedin_url: string
  resume_path?: string
  to_email?: string
}

export interface SendRequest {
  to_email: string
  subject: string
  body: string
  resume_path?: string
}

export interface Settings {
  providers: ProviderConfig[]
  models: Record<string, ModelConfig[]>
  available_models: Record<string, string[]>
}

export interface ProviderConfig {
  provider: string
  enabled: boolean
  config: {
    url?: string
    api_key?: string
  }
}

export interface ModelConfig {
  model_name: string
  is_default: boolean
}

export async function getSettings(): Promise<Settings> {
  const response = await fetch(`${API_BASE}/api/settings`, {
    headers: getHeaders()
  })
  if (!response.ok) {
    throw new Error('Failed to get settings')
  }
  return response.json()
}

export async function updateProviderConfig(provider: string, enabled: boolean, config: Record<string, string>): Promise<ProviderConfig> {
  const response = await fetch(`${API_BASE}/api/settings/providers/${provider}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ enabled, config })
  })
  if (!response.ok) {
    throw new Error('Failed to update provider config')
  }
  return response.json()
}

export async function updateProviderModels(provider: string, models: { model_name: string; is_default: boolean }[]): Promise<void> {
  const response = await fetch(`${API_BASE}/api/settings/models/${provider}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ models })
  })
  if (!response.ok) {
    throw new Error('Failed to update provider models')
  }
}

export async function applyToJob(data: ApplyRequest): Promise<ApplyResponse> {
  const response = await fetch(`${API_BASE}/api/apply`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to apply')
  }

  return response.json()
}

export async function sendEmail(data: SendRequest): Promise<{ status: string; message: string }> {
  const response = await fetch(`${API_BASE}/api/send`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to send email')
  }

  return response.json()
}

export async function uploadResume(file: File): Promise<{ status: string; path: string; filename: string }> {
  const token = getToken()
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_BASE}/api/upload-resume`, {
    method: 'POST',
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    body: formData,
  })

  if (!response.ok) {
    throw new Error('Failed to upload resume')
  }

  return response.json()
}

export async function checkHealth(): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE}/health`)
  return response.json()
}