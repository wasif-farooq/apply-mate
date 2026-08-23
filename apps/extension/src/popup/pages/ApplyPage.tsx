import { useCallback, useEffect, useState } from 'react'
import { Header, LoadingOverlay, ErrorToast } from '../components'
import { useAuthStorage, useSettingsStorage, useResumes } from '../../hooks'
import { applyToJob } from '../../services/api'
import { captureCurrentPost } from '../../services/pageBridge'
import type { CapturedPost } from '../../types'
import { DEFAULT_FEATURES, type FeatureSettings } from '../../utils/constants'
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
  onReview?: () => void
}

export default function ApplyPage({
  backendUrl,
  initialLinkedinUrl = '',
  initialResumeId = 0,
  onGenerated,
  onLogout,
  onSettings,
  onReview,
}: ApplyPageProps) {
  const { getToken } = useAuthStorage()
  const { setLinkedInUrl, setSelectedResume, getFeatures } = useSettingsStorage()
  const { resumes, loading: resumesLoading, selectedResume, selectResume } = useResumes(
    backendUrl,
    initialResumeId
  )

  const [linkedinUrl, setLinkedinUrl] = useState(initialLinkedinUrl)
  const [captured, setCaptured] = useState<CapturedPost | null>(null)
  const [capturing, setCapturing] = useState(false)
  const [features, setFeatures] = useState<FeatureSettings>(DEFAULT_FEATURES)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    getFeatures().then(setFeatures)
  }, [getFeatures])

  useEffect(() => {
    if (initialLinkedinUrl) setLinkedinUrl(initialLinkedinUrl)
  }, [initialLinkedinUrl])

  const capture = useCallback(async () => {
    setCapturing(true)
    setError('')
    setNotice('')
    try {
      const result = await captureCurrentPost()
      if (!result.ok || !result.post) {
        // Say what went wrong. The whole reason capture exists is that silent
        // empty results used to reach the model as a blank job description.
        setError(result.reason || 'Could not read this page.')
        setCaptured(null)
        return
      }
      setCaptured(result.post)
      setLinkedinUrl(result.post.post_url)
      setLinkedInUrl(result.post.post_url)
      setNotice(`Captured ${result.post.raw_content.length} characters from the page.`)
    } catch (err: any) {
      setError(err?.message || 'Could not reach the page.')
    } finally {
      setCapturing(false)
    }
  }, [setLinkedInUrl])

  // Try once on open. If the user is sitting on a job post this fills
  // everything in before they touch anything.
  useEffect(() => {
    if (!features.capturePosts) return
    capture().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [features.capturePosts])

  const handleUrlChange = (url: string) => {
    setLinkedinUrl(url)
    setLinkedInUrl(url)
    // A hand-typed URL replaces whatever was captured, otherwise we would
    // generate from the old post while showing the new URL.
    setCaptured(null)
  }

  const handleResumeSelect = (id: number) => {
    selectResume(id)
    const resume = resumes.find((r) => r.id === id)
    setSelectedResume(id, resume?.filename || '')
  }

  const handleSubmit = async () => {
    if (!captured && !linkedinUrl.trim()) {
      setError('Capture a post, or paste a LinkedIn URL.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')

      const response = await applyToJob(backendUrl, token, {
        linkedin_url: linkedinUrl || undefined,
        // With captured text the backend skips scraping entirely, which is
        // the only path that reliably gets past LinkedIn's auth wall.
        job_post_text: captured?.raw_content,
        resume_id: selectedResume?.id,
      })

      onGenerated(response)
    } catch (err: any) {
      setError(err.message || 'Failed to generate email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="apply-page">
      <Header onSettings={onSettings} onLogout={onLogout} />

      <div className="main-content">
        {error && <ErrorToast message={error} onDismiss={() => setError('')} />}

        {captured ? (
          <div className="job-preview">
            <div className="job-preview-header">
              <div className="job-icon">💼</div>
              <div className="job-info">
                <h3>{captured.title || 'Post captured'}</h3>
                <p>{captured.company || captured.author_name || 'LinkedIn'}</p>
              </div>
            </div>
            <div className="job-meta">
              {captured.location && <span>📍 {captured.location}</span>}
              <span>📄 {captured.raw_content.length} chars</span>
              {captured.has_easy_apply && <span>⚡ Easy Apply</span>}
            </div>
          </div>
        ) : (
          <div className="job-preview">
            <div className="job-preview-header">
              <div className="job-icon">🔍</div>
              <div className="job-info">
                <h3>Nothing captured yet</h3>
                <p>Open a LinkedIn job or post, then capture.</p>
              </div>
            </div>
          </div>
        )}

        <button
          className="ext-secondary-btn"
          onClick={capture}
          disabled={capturing || !features.capturePosts}
        >
          {capturing ? '⏳ Reading page...' : '🔍 Capture this post'}
        </button>

        {notice && <div className="ext-notice">{notice}</div>}

        <div className="section">
          <div className="section-label">
            LinkedIn URL {captured ? '(captured)' : '(fallback)'}
          </div>
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
          disabled={loading || (!captured && !linkedinUrl.trim())}
        >
          {loading ? '⏳ Processing...' : '✨ Generate Application Email'}
        </button>

        {features.feedScan && onReview && (
          <button className="ext-secondary-btn" onClick={onReview}>
            📋 Scan feed & review jobs
          </button>
        )}
      </div>

      <LoadingOverlay visible={loading} message="Analyzing job post & generating email..." />
    </div>
  )
}
