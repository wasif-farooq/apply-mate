import { getToken, refreshToken } from './auth'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

let isRefreshing = false
let refreshPromise: Promise<boolean> | null = null

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, { ...options, headers })

  if (response.status === 401) {
    if (!isRefreshing) {
      isRefreshing = true
      refreshPromise = refreshToken()
    }

    const refreshed = await refreshPromise
    isRefreshing = false
    refreshPromise = null

    if (refreshed) {
      const newToken = getToken()
      if (newToken) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`
        return fetch(url, { ...options, headers })
      }
    }

    localStorage.removeItem('token')
    window.location.href = '/'
  }

  return response
}

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
  application_id?: number
  resume_id?: number
  total_experience_years?: string
}

export interface ApplyRequest {
  linkedin_url?: string
  /** Post text captured from the page by the extension. Skips server scraping. */
  job_post_text?: string
  resume_id?: number
  to_email?: string
}

export interface SendRequest {
  to_email: string
  subject: string
  body: string
  resume_id?: number
  application_id?: number
}

export interface Resume {
  id: number
  filename: string
  file_path: string
  is_default: boolean
  created_at: string
  file_size: number
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export interface Application {
  id: number
  linkedin_url: string
  title: string | null
  company: string | null
  location: string | null
  status: 'generated' | 'sent' | 'failed'
  sent_to_email: string | null
  subject: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface ApplicationStats {
  total: number
  sent: number
  generated: number
  failed: number
}

export async function applyToJob(data: ApplyRequest): Promise<ApplyResponse> {
  const response = await fetchWithAuth(`${API_BASE}/api/apply`, {
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
  const response = await fetchWithAuth(`${API_BASE}/api/send`, {
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

export async function uploadResume(file: File): Promise<{ status: string; path: string; filename: string; resume_id: number; char_count: number }> {
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

export async function getResumes(): Promise<Resume[]> {
  const response = await fetchWithAuth(`${API_BASE}/api/resumes`, {
    headers: getHeaders(),
  })

  if (!response.ok) {
    throw new Error('Failed to get resumes')
  }

  return response.json()
}

export async function setDefaultResume(resumeId: number): Promise<Resume> {
  const response = await fetchWithAuth(`${API_BASE}/api/resumes/${resumeId}/set-default`, {
    method: 'POST',
    headers: getHeaders(),
  })

  if (!response.ok) {
    throw new Error('Failed to set default resume')
  }

  return response.json()
}

export async function deleteResume(resumeId: number): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE}/api/resumes/${resumeId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  })

  if (!response.ok) {
    throw new Error('Failed to delete resume')
  }
}

export async function checkHealth(): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE}/health`)
  return response.json()
}

export async function getApplications(
  page: number = 1,
  limit: number = 50,
  status?: string
): Promise<{ applications: Application[]; total: number; page: number; limit: number }> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (status) params.append('status', status)
  
  const response = await fetchWithAuth(`${API_BASE}/api/applications?${params}`, {
    headers: getHeaders()
  })
  if (!response.ok) {
    throw new Error('Failed to get applications')
  }
  return response.json()
}

export async function getApplicationStats(): Promise<ApplicationStats> {
  const response = await fetchWithAuth(`${API_BASE}/api/applications/stats`, {
    headers: getHeaders()
  })
  if (!response.ok) {
    throw new Error('Failed to get application stats')
  }
  return response.json()
}

export async function getApplication(id: number): Promise<Application> {
  const response = await fetchWithAuth(`${API_BASE}/api/applications/${id}`, {
    headers: getHeaders()
  })
  if (!response.ok) {
    throw new Error('Failed to get application')
  }
  return response.json()
}

export async function deleteApplication(id: number): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE}/api/applications/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  })
  if (!response.ok) {
    throw new Error('Failed to delete application')
  }
}

export interface EmailConfig {
  type: 'google' | 'smtp' | null
  email?: string
  host?: string
  port?: number
  username?: string
  from_email?: string
  configured: boolean
}

export interface EmailConfigSave {
  type: 'google' | 'smtp'
  google?: {
    refresh_token: string
    email: string
  }
  smtp?: {
    host: string
    port: number
    username: string
    password: string
    from_email: string
    use_tls: boolean
  }
}

export async function getEmailConfig(): Promise<EmailConfig> {
  const response = await fetchWithAuth(`${API_BASE}/api/settings/email`, {
    headers: getHeaders()
  })
  if (!response.ok) {
    throw new Error('Failed to get email config')
  }
  return response.json()
}

export async function saveEmailConfig(config: EmailConfigSave): Promise<{ status: string; type: string }> {
  const response = await fetchWithAuth(`${API_BASE}/api/settings/email`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(config)
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to save email config')
  }
  return response.json()
}

export async function connectGoogleEmail(): Promise<{ authorization_url: string; state: string }> {
  const response = await fetchWithAuth(`${API_BASE}/api/settings/email/connect-google`, {
    headers: getHeaders()
  })
  if (!response.ok) {
    throw new Error('Failed to connect Google email')
  }
  return response.json()
}

export interface SmtpTestRequest {
  host: string
  port: number
  username: string
  password: string
  from_email?: string
  use_tls?: boolean
}

export async function testSmtpConnection(smtpConfig: SmtpTestRequest): Promise<{ status: string; email: string }> {
  const response = await fetchWithAuth(`${API_BASE}/api/settings/email/smtp/test`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(smtpConfig)
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to test SMTP connection')
  }
  return response.json()
}