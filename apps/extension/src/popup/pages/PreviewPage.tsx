import { useState } from 'react'
import DOMPurify from 'dompurify'
import { ErrorToast } from '../components'
import { useAuthStorage } from '../../hooks'
import { sendEmail } from '../../services/api'
import { EmailData } from '../../types'
import '../../styles/theme.css'
import '../../styles/components.css'
import '../../styles/pages.css'

interface PreviewPageProps {
  backendUrl: string
  emailData: EmailData
  onBack: () => void
  onSent: () => void
}

export default function PreviewPage({ backendUrl, emailData, onBack, onSent }: PreviewPageProps) {
  const { getToken } = useAuthStorage()
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
      const token = await getToken()
      if (!token) {
        throw new Error('Not authenticated')
      }

      await sendEmail(backendUrl, token, {
        to_email: toEmail,
        subject: subject,
        body: body,
      })

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
      </div>
    )
  }

  const cleanBody = DOMPurify.sanitize(body)

  return (
    <div className="preview-page">
      <div className="preview-header">
        <button className="back-btn" onClick={onBack}>
          ← Back
        </button>
        <h1>Preview</h1>
      </div>

      {error && <ErrorToast message={error} onDismiss={() => setError('')} />}

      <div className="preview-job-info">
        <div className="preview-job-title">{emailData.title}</div>
        <div className="preview-job-company">{emailData.company}</div>
        {emailData.location && <div className="preview-job-location">{emailData.location}</div>}
      </div>

      <div className="preview-field">
        <label>To</label>
        <input
          type="email"
          value={toEmail}
          onChange={(e) => setToEmail(e.target.value)}
        />
      </div>

      <div className="preview-field">
        <label>Subject</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>

      <div className="preview-field">
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
    </div>
  )
}