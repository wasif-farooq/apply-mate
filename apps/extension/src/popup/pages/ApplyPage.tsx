import { useState, useEffect } from 'react'
import { Header, LoadingOverlay, ErrorToast } from '../components'
import { useAuthStorage, useSettingsStorage, useResumes } from '../../hooks'
import { applyToJob } from '../../services/api'
import { formatFileSize, formatDate } from '../../utils'
import '../../styles/theme.css'
import '../../styles/components.css'
import '../../styles/pages.css'

interface ApplyPageProps {
  backendUrl: string
  initialLinkedinUrl?: string
  initialResumeId?: number
  onGenerated: (data: any) => void
  onLogout?: () => void
  onSettings?: () => void
}

export default function ApplyPage({ 
  backendUrl, 
  initialLinkedinUrl = '', 
  initialResumeId = 0,
  onGenerated, 
  onLogout,
  onSettings
}: ApplyPageProps) {
  const { getToken } = useAuthStorage()
  const { setLinkedInUrl, setSelectedResume } = useSettingsStorage()
  const { resumes, loading: resumesLoading, selectedResume, selectResume } = useResumes(
    backendUrl,
    initialResumeId
  )

  const [linkedinUrl, setLinkedinUrl] = useState(initialLinkedinUrl)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (initialLinkedinUrl) {
      setLinkedinUrl(initialLinkedinUrl)
    }
  }, [initialLinkedinUrl])

  const handleUrlChange = (url: string) => {
    setLinkedinUrl(url)
    setLinkedInUrl(url)
  }

  const handleResumeSelect = (id: number) => {
    selectResume(id)
    const resume = resumes.find(r => r.id === id)
    setSelectedResume(id, resume?.filename || '')
  }

  const handleGenerateEmail = async () => {
    setLoading(true)
    setError('')

    try {
      const token = await getToken()
      if (!token) {
        throw new Error('Not authenticated')
      }

      const response = await applyToJob(backendUrl, token, {
        linkedin_url: linkedinUrl,
        resume_path: selectedResume?.file_path,
      })

      onGenerated(response)
    } catch (err: any) {
      setError(err.message || 'Failed to generate email')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!linkedinUrl.trim()) {
      setError('Please enter a LinkedIn URL')
      return
    }
    setError('')
    await handleGenerateEmail()
  }

  return (
    <div className="apply-page">
      <Header onSettings={onSettings} onLogout={onLogout} />

      <div className="main-content">
        {error && <ErrorToast message={error} onDismiss={() => setError('')} />}

        {linkedinUrl && (
          <div className="job-preview">
            <div className="job-preview-header">
              <div className="job-icon">💼</div>
              <div className="job-info">
                <h3>Job Post Detected</h3>
                <p>{linkedinUrl.length > 50 ? linkedinUrl.slice(0, 50) + '...' : linkedinUrl}</p>
              </div>
            </div>
            <div className="job-meta">
              <span>📍 LinkedIn</span>
              <span>🔗 URL</span>
            </div>
          </div>
        )}

        <div className="section">
          <div className="section-label">LinkedIn Job URL</div>
          <input
            type="url"
            className="ext-input"
            value={linkedinUrl}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="Paste LinkedIn job post URL..."
          />
        </div>

        <div className="section">
          <div className="section-label">Resume (Optional)</div>
          {resumesLoading ? (
            <div className="ext-loading-text" style={{ padding: '14px 16px', textAlign: 'center' }}>
              Loading resumes...
            </div>
          ) : resumes.length > 0 ? (
            <div className="resume-list">
              {resumes.map((resume) => (
                <div
                  key={resume.id}
                  className={`resume-item ${selectedResume?.id === resume.id ? 'selected' : ''}`}
                  onClick={() => handleResumeSelect(resume.id)}
                >
                  <span className="resume-icon">📄</span>
                  <div className="resume-info">
                    <div className="resume-name">
                      {resume.filename}
                      {resume.is_default && <span className="default-badge">Default</span>}
                    </div>
                    <div className="resume-meta">
                      {formatFileSize(resume.file_size)} • {formatDate(resume.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-resumes">
              <p>No resumes found.</p>
              <a 
                href={`${backendUrl.replace('8000', '3000')}/resumes`} 
                target="_blank"
                className="upload-resume-link"
              >
                Upload a resume →
              </a>
            </div>
          )}
        </div>

        <button
          className="action-btn"
          onClick={handleSubmit}
          disabled={loading || !linkedinUrl.trim()}
        >
          {loading ? '⏳ Processing...' : '✨ Generate Application Email'}
        </button>
      </div>

      <LoadingOverlay 
        visible={loading} 
        message="Analyzing job post & generating email..." 
      />
    </div>
  )
}