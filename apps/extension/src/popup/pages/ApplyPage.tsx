import { useState, useRef } from 'react'
import { StepIndicator, ProcessingState } from '@applymate/ui'

interface ApplyPageProps {
  backendUrl: string
  onGenerated: (data: any) => void
}

const STEPS = [
  { key: 'url', label: 'URL' },
  { key: 'resume', label: 'Resume' },
  { key: 'processing', label: 'Processing' },
]

type Step = 'url' | 'resume' | 'processing'

export default function ApplyPage({ backendUrl, onGenerated }: ApplyPageProps) {
  const [step, setStep] = useState<Step>('url')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [resumePath, setResumePath] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUrlSubmit = () => {
    if (!linkedinUrl.trim()) {
      setError('Please enter a LinkedIn URL')
      return
    }
    setError('')
    setStep('resume')
  }

  const handleResumeUpload = async () => {
    if (!resumeFile) return

    setLoading(true)
    setError('')

    try {
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
      setResumePath(data.path)
      generateEmail(data.path)
    } catch (err: any) {
      setError(err.message || 'Failed to upload resume')
    } finally {
      setLoading(false)
    }
  }

  const generateEmail = async (path?: string) => {
    setStep('processing')
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
          resume_path: path || resumePath || undefined,
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
      setStep('url')
    } finally {
      setLoading(false)
    }
  }

  const handleSkipResume = () => {
    setStep('processing')
    generateEmail()
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const files = e.dataTransfer.files
    if (files && files[0] && files[0].type === 'application/pdf') {
      setResumeFile(files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setResumeFile(e.target.files[0])
    }
  }

  return (
    <div className="apply-page">
      <div className="header">
        <h1>ApplyMate</h1>
        <button className="settings-icon" onClick={() => chrome.tabs.create({ url: 'http://localhost:3000/settings' })}>
          ⚙️
        </button>
      </div>

      <StepIndicator steps={STEPS} currentStep={step} />

      {error && <div className="error-message">{error}</div>}

      {step === 'url' && (
        <div className="url-step">
          <h2>Enter LinkedIn Job Post URL</h2>
          <p className="subtitle">Paste the LinkedIn job posting URL to start</p>

          <input
            type="url"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            placeholder="https://www.linkedin.com/posts/..."
            onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
            autoFocus
          />

          <button className="primary-btn" onClick={handleUrlSubmit}>
            Next →
          </button>
        </div>
      )}

      {step === 'resume' && (
        <div className="resume-step">
          <h2>Upload Your Resume</h2>
          <p className="subtitle">Optional - Attach your resume to the application</p>

          <div
            className={`dropzone ${dragActive ? 'active' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
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
              <div>
                <div className="file-icon">📄</div>
                <p>{resumeFile.name}</p>
                <span className="hint">Click or drag to change</span>
              </div>
            ) : (
              <div>
                <div className="file-icon">📁</div>
                <p>Drop PDF here or click to upload</p>
                <span className="hint">PDF files only</span>
              </div>
            )}
          </div>

          <div className="btn-row">
            <button className="secondary-btn" onClick={handleSkipResume}>
              Skip
            </button>
            <button
              className="primary-btn"
              onClick={handleResumeUpload}
              disabled={loading || !resumeFile}
            >
              {loading ? 'Uploading...' : 'Generate Email'}
            </button>
          </div>
        </div>
      )}

      {step === 'processing' && (
        <ProcessingState 
          message="Generating Email..." 
          emoji="🤖"
        />
      )}

      <style>{`
        .apply-page {
          width: 600px;
          min-height: 500px;
          padding: 24px;
          background: #001e2b;
          color: #ffffff;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .header h1 {
          font-size: 20px;
          font-weight: 600;
          color: #00ed64;
          margin: 0;
        }
        .settings-icon {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          opacity: 0.7;
          transition: opacity 0.2s;
        }
        .settings-icon:hover {
          opacity: 1;
        }
        .error-message {
          background: #fff8e0;
          color: #946f3f;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          font-size: 14px;
        }
        .url-step h2, .resume-step h2 {
          font-size: 22px;
          margin: 0 0 8px 0;
        }
        .subtitle {
          color: #a8b3bc;
          margin: 0 0 24px 0;
          font-size: 14px;
        }
        .url-step input {
          width: 100%;
          padding: 14px 16px;
          background: #0d1f2b;
          border: 1px solid #1c2d38;
          border-radius: 8px;
          color: #fff;
          font-size: 16px;
          margin-bottom: 16px;
          box-sizing: border-box;
        }
        .url-step input:focus {
          outline: none;
          border-color: #00ed64;
        }
        .primary-btn {
          width: 100%;
          padding: 14px;
          background: #00ed64;
          border: none;
          border-radius: 8px;
          color: #001e2b;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .primary-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .dropzone {
          border: 2px dashed rgba(255,255,255,0.2);
          border-radius: 12px;
          padding: 32px;
          text-align: center;
          cursor: pointer;
          margin-bottom: 16px;
          transition: all 0.2s;
        }
        .dropzone.active {
          border-color: #00ed64;
          background: rgba(0,237,100,0.1);
        }
        .file-icon {
          font-size: 36px;
          margin-bottom: 8px;
        }
        .dropzone p {
          margin: 0 0 8px 0;
          font-size: 14px;
        }
        .hint {
          color: #a8b3bc;
          font-size: 12px;
        }
        .btn-row {
          display: flex;
          gap: 12px;
        }
        .secondary-btn {
          flex: 1;
          padding: 14px;
          background: transparent;
          border: 1px solid #1c2d38;
          border-radius: 8px;
          color: #a8b3bc;
          font-size: 16px;
          cursor: pointer;
        }
        .secondary-btn:hover {
          border-color: #00ed64;
          color: #00ed64;
        }
        .primary-btn {
          flex: 1;
        }
      `}</style>
    </div>
  )
}