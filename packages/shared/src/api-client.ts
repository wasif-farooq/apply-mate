import type { ApplyRequest, ApplyResponse, SendRequest, Settings, EmailConfig, EmailConfigSave, SmtpTestRequest } from './types'

export class ApiClient {
  private baseUrl: string
  private token: string | null = null

  constructor(baseUrl: string, token?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.token = token || null
  }

  setToken(token: string) {
    this.token = token
  }

  clearToken() {
    this.token = null
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }))
      throw new Error(error.detail || `HTTP ${response.status}`)
    }

    return response.json()
  }

  async apply(request: ApplyRequest): Promise<ApplyResponse> {
    return this.request<ApplyResponse>('/api/apply', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  async sendEmail(request: SendRequest): Promise<{ status: string }> {
    return this.request<{ status: string }>('/api/send', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  async getSettings(): Promise<Settings> {
    return this.request<Settings>('/api/settings')
  }

  async uploadResume(file: File): Promise<{ path: string; filename: string }> {
    const formData = new FormData()
    formData.append('file', file)

    const headers: HeadersInit = {}
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    const response = await fetch(`${this.baseUrl}/api/upload-resume`, {
      method: 'POST',
      headers,
      body: formData,
    })

    if (!response.ok) {
      throw new Error('Failed to upload resume')
    }

    return response.json()
  }

  async getHealth(): Promise<{ status: string }> {
    return this.request<{ status: string }>('/health')
  }

  async getEmailConfig(): Promise<EmailConfig> {
    return this.request<EmailConfig>('/api/settings/email')
  }

  async saveEmailConfig(config: EmailConfigSave): Promise<{ status: string; type: string }> {
    return this.request<{ status: string; type: string }>('/api/settings/email', {
      method: 'PUT',
      body: JSON.stringify(config),
    })
  }

  async connectGoogleEmail(): Promise<{ authorization_url: string; state: string }> {
    return this.request<{ authorization_url: string; state: string }>('/api/settings/email/connect-google')
  }

  async testSmtpConnection(smtpConfig: SmtpTestRequest): Promise<{ status: string; email: string }> {
    return this.request<{ status: string; email: string }>('/api/settings/email/smtp/test', {
      method: 'POST',
      body: JSON.stringify(smtpConfig),
    })
  }
}

export function createApiClient(baseUrl: string, token?: string): ApiClient {
  return new ApiClient(baseUrl, token)
}