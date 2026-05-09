import { Resume, ApplyResponse, SendEmailRequest, SendEmailResponse } from '../types'

export interface ApplyParams {
  linkedin_url: string
  resume_path?: string
}

export async function fetchResumes(
  baseUrl: string,
  token: string
): Promise<Resume[]> {
  const response = await fetch(`${baseUrl}/api/resumes`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch resumes')
  }

  return response.json()
}

export async function applyToJob(
  baseUrl: string,
  token: string,
  params: ApplyParams
): Promise<ApplyResponse> {
  const response = await fetch(`${baseUrl}/api/apply`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Failed to generate email')
  }

  return response.json()
}

export async function sendEmail(
  baseUrl: string,
  token: string,
  email: SendEmailRequest
): Promise<SendEmailResponse> {
  const response = await fetch(`${baseUrl}/api/send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(email),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Failed to send email')
  }

  return response.json()
}