export interface User {
  id: number
  email: string
  name?: string
  picture?: string
}

export interface ApplyRequest {
  linkedin_url?: string
  /** Post text captured from the page; when set the backend does not scrape. */
  job_post_text?: string
  resume_id?: number
  to_email?: string
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
  total_experience_years?: string
  application_id?: number
  resume_id?: number
}

export interface SendRequest {
  to_email: string
  subject: string
  body: string
  resume_id?: number
  application_id?: number
}

export interface OAuthToken {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  scope?: string
}

export interface AuthCallbackResponse {
  access_token: string
  email: string
  name?: string
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

export interface SmtpTestRequest {
  host: string
  port: number
  username: string
  password: string
  from_email?: string
  use_tls?: boolean
}