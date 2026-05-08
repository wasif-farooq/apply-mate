import { useState } from 'react'
import DOMPurify from 'dompurify'

interface PreviewPageProps {
  backendUrl: string
  emailData: {
    email: string
    subject: string
    body: string
    title: string
    company: string
    location?: string
  }
  onBack: () => void
  onSent: () => void
}

export default function PreviewPage({ backendUrl, emailData, onBack, onSent }: PreviewPageProps) {
  const [toEmail, setToEmail] = useState(emailData.email)
  const [subject, setSubject] = useState(emailData.subject)
  const [body, setBody] = useState(emailData.body)
  const [editMode, setEditMode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleSend = async () => {
    setLoading(true)
    setError('')

    try {
      const authData = await chrome.storage.local.get('auth_token')
      const token = authData.auth_token

      const response = await fetch(`${backendUrl}/api/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to_email: toEmail,
          subject: subject,
          body: body,
        }),
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.detail || 'Failed to send email')
      }

      setSent(true)
      setTimeout(() => {
        onSent()
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to send email')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="preview-page sent">
        <div className="success-icon">✓</div>
        <h2>Email Sent!</h2>
        <p>Your application has been sent successfully.</p>
        <style>{sentStyles}</style>
      </div>
    )
  }

  const cleanBody = DOMPurify.sanitize(body)

  return (
    <div className="preview-page">
      <div className="header">
        <button className="back-btn" onClick={onBack}>
          ← Back
        </button>
        <h1>Preview</h1>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="job-info">
        <div className="job-title">{emailData.title}</div>
        <div className="job-company">{emailData.company}</div>
        {emailData.location && <div className="job-location">{emailData.location}</div>}
      </div>

      <div className="field">
        <label>To</label>
        <input
          type="email"
          value={toEmail}
          onChange={(e) => setToEmail(e.target.value)}
        />
      </div>

      <div className="field">
        <label>Subject</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>

      <div className="field">
        <div className="label-row">
          <label>Body</label>
          <div className="toggle-btns">
            <button
              className={!editMode ? 'active' : ''}
              onClick={() => setEditMode(false)}
            >
              Preview
            </button>
            <button
              className={editMode ? 'active' : ''}
              onClick={() => setEditMode(true)}
            >
              Edit
            </button>
          </div>
        </div>

        {editMode ? (
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
          />
        ) : (
          <div
            className="body-preview"
            dangerouslySetInnerHTML={{ __html: cleanBody }}
          />
        )}
      </div>

      <button className="send-btn" onClick={handleSend} disabled={loading}>
        {loading ? 'Sending...' : 'Send Application'}
      </button>

      <style>{previewStyles}</style>
    </div>
  )
}

const sentStyles = `
  .preview-page.sent {
    width: 600px;
    min-height: 400px;
    padding: 48px;
    background: #001e2b;
    color: #ffffff;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .success-icon {
    width: 64px;
    height: 64px;
    background: #00ed64;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    color: #001e2b;
    margin-bottom: 16px;
  }
  .preview-page.sent h2 {
    font-size: 24px;
    margin: 0 0 8px 0;
    color: #00ed64;
  }
  .preview-page.sent p {
    color: #a8b3bc;
    margin: 0;
  }
`

const previewStyles = `
  .preview-page {
    width: 600px;
    min-height: 600px;
    padding: 24px;
    background: #001e2b;
    color: #ffffff;
  }
  .header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 24px;
  }
  .back-btn {
    background: none;
    border: none;
    color: #a8b3bc;
    font-size: 14px;
    cursor: pointer;
    padding: 4px 8px;
  }
  .back-btn:hover {
    color: #00ed64;
  }
  .header h1 {
    font-size: 18px;
    font-weight: 500;
    margin: 0;
  }
  .error-message {
    background: #fff8e0;
    color: #946f3f;
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 16px;
    font-size: 14px;
  }
  .job-info {
    background: rgba(255,255,255,0.03);
    border-radius: 8px;
    padding: 12px 16px;
    margin-bottom: 20px;
  }
  .job-title {
    font-weight: 600;
    margin-bottom: 4px;
  }
  .job-company {
    color: #a8b3bc;
    font-size: 14px;
  }
  .job-location {
    color: #a8b3bc;
    font-size: 12px;
    margin-top: 4px;
  }
  .field {
    margin-bottom: 16px;
  }
  .field label {
    display: block;
    font-size: 12px;
    color: #a8b3bc;
    margin-bottom: 6px;
  }
  .field input {
    width: 100%;
    padding: 10px 12px;
    background: #0d1f2b;
    border: 1px solid #1c2d38;
    border-radius: 6px;
    color: #fff;
    font-size: 14px;
    box-sizing: border-box;
  }
  .field input:focus {
    outline: none;
    border-color: #00ed64;
  }
  .label-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }
  .label-row label {
    margin-bottom: 0;
  }
  .toggle-btns {
    display: flex;
    gap: 4px;
  }
  .toggle-btns button {
    padding: 4px 10px;
    font-size: 12px;
    border: 1px solid #1c2d38;
    background: transparent;
    color: #a8b3bc;
    border-radius: 4px;
    cursor: pointer;
  }
  .toggle-btns button.active {
    border-color: #00ed64;
    background: rgba(0,237,100,0.2);
    color: #00ed64;
  }
  .field textarea {
    width: 100%;
    padding: 12px;
    background: #0d1f2b;
    border: 1px solid #1c2d38;
    border-radius: 6px;
    color: #fff;
    font-size: 14px;
    font-family: inherit;
    resize: vertical;
    box-sizing: border-box;
  }
  .field textarea:focus {
    outline: none;
    border-color: #00ed64;
  }
  .body-preview {
    background: #0d1f2b;
    border: 1px solid #1c2d38;
    border-radius: 6px;
    padding: 12px;
    min-height: 200px;
    max-height: 300px;
    overflow-y: auto;
    font-size: 14px;
    line-height: 1.6;
  }
  .body-preview p {
    margin: 0 0 12px 0;
  }
  .body-preview ul, .body-preview ol {
    padding-left: 20px;
    margin: 0 0 12px 0;
  }
  .send-btn {
    width: 100%;
    padding: 14px;
    background: #00ed64;
    border: none;
    border-radius: 8px;
    color: #001e2b;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    margin-top: 16px;
  }
  .send-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .send-btn:hover:not(:disabled) {
    background: #00d75a;
  }
`