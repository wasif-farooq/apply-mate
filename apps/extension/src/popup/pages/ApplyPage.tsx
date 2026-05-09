import { useState, useRef } from 'react'
import { LogoIcon } from '@applybuddy/ui'

interface ApplyPageProps {
  backendUrl: string
  onGenerated: (data: any) => void
  onLogout?: () => void
}

export default function ApplyPage({ backendUrl, onGenerated, onLogout }: ApplyPageProps) {
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleResumeUpload = async () => {
    setLoading(true)
    setError('')

    try {
      let resumePath = ''
      
      if (resumeFile) {
        const authData = await chrome.storage.local.get('auth_token')
        const token = authData.auth_token

        const formData = new FormData()
        formData.append('file', resumeFile)

        const response = await fetch(`${backendUrl}/api/upload-resume`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        })

        if (!response.ok) {
          throw new Error('Failed to upload resume')
        }

        const data = await response.json()
        resumePath = data.path
      }

      generateEmail(resumePath)
    } catch (err: any) {
      setError(err.message || 'Failed to process')
    } finally {
      setLoading(false)
    }
  }

  const generateEmail = async (path?: string) => {
    setLoading(true)
    setError('')

    try {
      const authData = await chrome.storage.local.get('auth_token')
      const token = authData.auth_token

      const response = await fetch(`${backendUrl}/api/apply`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          linkedin_url: linkedinUrl,
          resume_path: path || undefined,
        }),
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.detail || 'Failed to generate email')
      }

      const data = await response.json()
      onGenerated(data)
    } catch (err: any) {
      setError(err.message || 'Failed to generate email')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setResumeFile(e.target.files[0])
    }
  }

  return (
    <div className="apply-page">
      <style>{`
        .apply-page {
          width: 380px;
          min-height: 520px;
          background: #001e2b;
          color: #fff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: #0d1f2b;
          border-bottom: 1px solid #1c2d38;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .header h1 {
          font-size: 18px;
          font-weight: 600;
          color: #00ed64;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .header-actions {
          display: flex;
          gap: 8px;
        }
        .icon-btn {
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          opacity: 0.7;
          padding: 4px;
          transition: opacity 0.2s;
        }
        .icon-btn:hover {
          opacity: 1;
        }
        .main-content {
          padding: 20px;
        }
        .section {
          margin-bottom: 20px;
        }
        .section-label {
          font-size: 12px;
          font-weight: 600;
          color: #a8b3bc;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .job-preview {
          background: #0d1f2b;
          border: 1px solid #1c2d38;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 20px;
        }
        .job-preview-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        .job-icon {
          width: 40px;
          height: 40px;
          background: rgba(0,237,100,0.1);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        }
        .job-info h3 {
          font-size: 15px;
          font-weight: 600;
          margin: 0 0 4px 0;
          color: #fff;
        }
        .job-info p {
          font-size: 13px;
          color: #a8b3bc;
          margin: 0;
        }
        .job-meta {
          display: flex;
          gap: 12px;
          font-size: 12px;
          color: #6b7280;
        }
        .input-field {
          width: 100%;
          padding: 14px 16px;
          background: #0d1f2b;
          border: 1px solid #1c2d38;
          border-radius: 10px;
          color: #fff;
          font-size: 14px;
          box-sizing: border-box;
          transition: border-color 0.2s;
        }
        .input-field:focus {
          outline: none;
          border-color: #00ed64;
        }
        .input-field::placeholder {
          color: #6b7280;
        }
        .resume-area {
          background: #0d1f2b;
          border: 2px dashed #1c2d38;
          border-radius: 12px;
          padding: 24px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .resume-area:hover {
          border-color: #00ed64;
          background: rgba(0,237,100,0.05);
        }
        .resume-area.has-file {
          border-style: solid;
          border-color: #00ed64;
        }
        .resume-icon {
          font-size: 32px;
          margin-bottom: 8px;
        }
        .resume-area p {
          font-size: 14px;
          color: #a8b3bc;
          margin: 0 0 4px 0;
        }
        .resume-area span {
          font-size: 12px;
          color: #6b7280;
        }
        .resume-file {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #00ed64;
        }
        .action-btn {
          width: 100%;
          padding: 16px;
          background: #00ed64;
          color: #001e2b;
          border: none;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .action-btn:hover {
          background: #00d75a;
        }
        .action-btn:disabled {
          background: #1c2d38;
          color: #6b7280;
          cursor: not-allowed;
        }
        .error-toast {
          background: rgba(255,107,107,0.1);
          border: 1px solid #ff6b6b;
          color: #ff6b6b;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 13px;
          margin-bottom: 16px;
        }
        .loading-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,30,43,0.9);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          z-index: 100;
        }
        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #1c2d38;
          border-top-color: #00ed64;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .loading-text {
          font-size: 14px;
          color: #a8b3bc;
        }
      `}</style>

      <div className="header">
        <div className="header-left">
          <LogoIcon style={{ width: '24px', height: '24px' }} />
          <h1>ApplyBuddy</h1>
        </div>
        <div className="header-actions">
          <button className="icon-btn" onClick={() => chrome.tabs.create({ url: 'http://localhost:3000/settings' })} title="Settings">⚙️</button>
          {onLogout && (
            <button className="icon-btn" onClick={onLogout} title="Sign Out">🚪</button>
          )}
        </div>
      </div>

      <div className="main-content">
        {error && <div className="error-toast">{error}</div>}

        {linkedinUrl && (
          <div className="job-preview">
            <div className="job-preview-header">
              <div className="job-icon">💼</div>
              <div className="job-info">
                <h3>Job Post Detected</h3>
                <p>{linkedinUrl.slice(0, 50)}...</p>
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
            className="input-field"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            placeholder="Paste LinkedIn job post URL..."
          />
        </div>

        <div className="section">
          <div className="section-label">Resume (Optional)</div>
          <div
            className={`resume-area ${resumeFile ? 'has-file' : ''}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            {resumeFile ? (
              <div className="resume-file">
                <span>📄</span>
                <span>{resumeFile.name}</span>
              </div>
            ) : (
              <div>
                <div className="resume-icon">📁</div>
                <p>Click to upload resume</p>
                <span>PDF only</span>
              </div>
            )}
          </div>
        </div>

        <button
          className="action-btn"
          onClick={async () => {
            if (!linkedinUrl.trim()) {
              setError('Please enter a LinkedIn URL')
              return
            }
            setError('')
            setLoading(true)
            // Continue with the flow - upload resume if exists, then generate
            await handleResumeUpload()
          }}
          disabled={loading || !linkedinUrl.trim()}
        >
          {loading ? '⏳ Processing...' : '✨ Generate Application Email'}
        </button>
      </div>

      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <div className="loading-text">Analyzing job post & generating email...</div>
        </div>
      )}
    </div>
  )
}