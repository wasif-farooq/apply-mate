export interface Resume {
  id: number
  filename: string
  file_path: string
  is_default: boolean
  created_at: string
  file_size: number
  char_count?: number
}

export interface EmailData {
  email: string
  subject: string
  body: string
  title: string
  company: string
  location?: string
  application_id?: number
  resume_id?: number
}

export interface ApplyResponse {
  email: string
  subject: string
  body: string
  title: string
  company: string
  location?: string
  application_id?: number
  resume_id?: number
  total_experience_years?: string
}

export interface SendEmailRequest {
  to_email: string
  subject: string
  body: string
  resume_id?: number
  application_id?: number
}

export interface FeedJob {
  id: number
  url: string
  title?: string | null
  company?: string | null
  location?: string | null
  has_easy_apply: boolean
  ai_score?: number | null
  match_reason?: string | null
  status: string
}

export interface SendEmailResponse {
  success: boolean
  message?: string
}