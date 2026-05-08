import { useState, useCallback } from 'react'
import { applyToJob, sendEmail, uploadResume, ApplyResponse } from '@/lib/api'

export type Step = 'url' | 'resume' | 'processing' | 'preview'

const STEPS = [
  { key: 'url', label: 'URL' },
  { key: 'resume', label: 'Resume' },
  { key: 'processing', label: 'Processing' },
  { key: 'preview', label: 'Preview' },
]

export function cleanEmailHTML(html: string): string {
  if (!html) return ''
  
  let cleaned = html
  
  const ensureGreeting = (content: string): string => {
    if (!content) return '<p>Dear Hiring Manager,</p>'
    const firstLine = content.trim().split('\n')[0].toLowerCase()
    const greetings = ['dear', 'hello', 'hi', 'greetings']
    const hasGreeting = greetings.some(g => firstLine.includes(g))
    if (!hasGreeting) {
      return '<p>Dear Hiring Manager,</p>' + content
    }
    return content
  }
  
  cleaned = ensureGreeting(cleaned)
  
  cleaned = cleaned.replace(/<li>\s*<\/li>/gi, '')
  cleaned = cleaned.replace(/<li>\s*<br\s*\/?>\s*<\/li>/gi, '')
  cleaned = cleaned.replace(/<li>\s*&nbsp;\s*<\/li>/gi, '')
  cleaned = cleaned.replace(/<ul>\s*<\/ul>/gi, '')
  cleaned = cleaned.replace(/<ol>\s*<\/ol>/gi, '')
  cleaned = cleaned.replace(/<ul>\s*<li>\s*<\/li>\s*<\/ul>/gi, '')
  cleaned = cleaned.replace(/(<br\s*\/?>\s*){2,}/gi, '<br/>')
  cleaned = cleaned.replace(/<p>\s*<\/p>/gi, '')
  cleaned = cleaned.replace(/<p>\s*<br\s*\/?>\s*<\/p>/gi, '')
  return cleaned.trim()
}

export interface UseApplyFlowReturn {
  step: Step
  steps: typeof STEPS
  linkedinUrl: string
  resumeFile: File | null
  resumePath: string
  loading: boolean
  uploading: boolean
  error: string
  generatedEmail: ApplyResponse | null
  sent: boolean
  dragActive: boolean
  bodyEditMode: boolean
  setLinkedinUrl: (url: string) => void
  setResumeFile: (file: File | null) => void
  setResumePath: (path: string) => void
  setError: (error: string) => void
  setGeneratedEmail: (email: ApplyResponse | null) => void
  setSent: (sent: boolean) => void
  setDragActive: (active: boolean) => void
  setBodyEditMode: (edit: boolean) => void
  setStep: (step: Step) => void
  handleUrlSubmit: () => void
  handleResumeUpload: () => Promise<void>
  handleNext: () => Promise<void>
  handleSkipResume: () => void
  generateEmail: () => Promise<void>
  handleSend: () => Promise<void>
  handleReset: () => void
  handleDragOver: (e: React.DragEvent) => void
  handleDragLeave: (e: React.DragEvent) => void
  handleDrop: (e: React.DragEvent) => void
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function useApplyFlow(): UseApplyFlowReturn {
  const [step, setStep] = useState<Step>('url')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [resumePath, setResumePath] = useState('')
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [generatedEmail, setGeneratedEmail] = useState<ApplyResponse | null>(null)
  const [sent, setSent] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [bodyEditMode, setBodyEditMode] = useState(false)

  const handleUrlSubmit = useCallback(() => {
    if (!linkedinUrl.trim()) {
      setError('Please enter a LinkedIn URL')
      return
    }
    setError('')
    setStep('resume')
  }, [linkedinUrl])

  const handleResumeUpload = useCallback(async () => {
    if (!resumeFile) return
    
    setUploading(true)
    setError('')
    
    try {
      const data = await uploadResume(resumeFile)
      setResumePath(data.path)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload resume')
    } finally {
      setUploading(false)
    }
  }, [resumeFile])

  const generateEmail = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await applyToJob({
        linkedin_url: linkedinUrl,
        resume_path: resumePath || undefined
      })
      setGeneratedEmail(result)
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setStep('url')
    } finally {
      setLoading(false)
    }
  }, [linkedinUrl, resumePath])

  const handleNext = useCallback(async () => {
    if (resumeFile && !resumePath) {
      await handleResumeUpload()
    }
    setStep('processing')
    generateEmail()
  }, [resumeFile, resumePath, handleResumeUpload, generateEmail])

  const handleSkipResume = useCallback(() => {
    setStep('processing')
    generateEmail()
  }, [generateEmail])

  const handleSend = useCallback(async () => {
    if (!generatedEmail) return

    setLoading(true)
    setError('')

    try {
      await sendEmail({
        to_email: generatedEmail.email,
        subject: generatedEmail.subject,
        body: generatedEmail.body,
        resume_path: resumePath || undefined,
        application_id: generatedEmail.application_id
      })
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email')
    } finally {
      setLoading(false)
    }
  }, [generatedEmail, resumePath])

  const handleReset = useCallback(() => {
    setStep('url')
    setLinkedinUrl('')
    setResumeFile(null)
    setResumePath('')
    setGeneratedEmail(null)
    setSent(false)
    setError('')
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const files = e.dataTransfer.files
    if (files && files[0] && files[0].type === 'application/pdf') {
      setResumeFile(files[0])
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setResumeFile(e.target.files[0])
    }
  }, [])

  return {
    step,
    steps: STEPS,
    linkedinUrl,
    resumeFile,
    resumePath,
    loading,
    uploading,
    error,
    generatedEmail,
    sent,
    dragActive,
    bodyEditMode,
    setLinkedinUrl,
    setResumeFile,
    setResumePath,
    setError,
    setGeneratedEmail,
    setSent,
    setDragActive,
    setBodyEditMode,
    setStep,
    handleUrlSubmit,
    handleResumeUpload,
    handleNext,
    handleSkipResume,
    generateEmail,
    handleSend,
    handleReset,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileSelect,
  }
}