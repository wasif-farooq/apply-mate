export interface Resume {
  id: number
  filename: string
  file_path: string
  is_default: boolean
  created_at: string
  file_size: number
}

export interface EmailData {
  email: string
  subject: string
  body: string
  title: string
  company: string
  location?: string
}

export interface ApplyResponse {
  email: string
  subject: string
  body: string
  title: string
  company: string
  location?: string
}

export interface SendEmailRequest {
  to_email: string
  subject: string
  body: string
}

export interface SendEmailResponse {
  success: boolean
  message?: string
}