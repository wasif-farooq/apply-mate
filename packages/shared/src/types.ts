export interface User {
  id: number
  email: string
  name?: string
  picture?: string
}

export interface ApplyRequest {
  linkedin_url: string
  resume_path?: string
  to_email?: string
  provider?: string
  model?: string
  api_key?: string
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
}

export interface SendRequest {
  to_email: string
  subject: string
  body: string
  resume_path?: string
}

export interface Settings {
  selected_provider?: string
  selected_model?: string
  resume_path?: string
}

export interface ProviderConfig {
  provider: string
  enabled: boolean
  config: Record<string, string>
}

export interface ProviderModel {
  provider: string
  model_name: string
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