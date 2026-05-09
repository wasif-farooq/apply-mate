import { useState, useEffect } from 'react'
import { useAuthStorage, useSettingsStorage } from '../../hooks'
import '../../styles/theme.css'
import '../../styles/components.css'
import '../../styles/pages.css'

interface SettingsPageProps {
  backendUrl: string
  onBackendUrlChange: (url: string) => void
  onLogout: () => void
  onBack: () => void
}

export default function SettingsPage({ backendUrl, onBackendUrlChange, onLogout, onBack }: SettingsPageProps) {
  const [url, setUrl] = useState(backendUrl)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const { getUserEmail } = useAuthStorage()
  const { setBackendUrl } = useSettingsStorage()
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    loadUserEmail()
  }, [])

  const loadUserEmail = async () => {
    const email = await getUserEmail()
    if (email) {
      setUserEmail(email)
    }
  }

  const handleSaveUrl = async () => {
    setSaving(true)
    try {
      await setBackendUrl(url)
      onBackendUrlChange(url)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const handleTestConnection = async () => {
    try {
      const response = await fetch(`${url}/health`)
      if (response.ok) {
        alert('✓ Connection successful!')
      } else {
        alert('✗ Connection failed')
      }
    } catch {
      alert('✗ Could not connect to backend')
    }
  }

  return (
    <div className="settings-page">
      <div className="preview-header">
        <button className="back-btn" onClick={onBack}>
          ← Back
        </button>
        <h1>Settings</h1>
      </div>

      <div className="settings-content">
        <div className="settings-section">
          <h2 className="settings-title">Account</h2>
          {userEmail ? (
            <div className="settings-user-info">
              <span className="settings-value">{userEmail}</span>
              <button className="settings-btn settings-btn--danger" onClick={onLogout}>
                Sign Out
              </button>
            </div>
          ) : (
            <p className="settings-label">Not signed in</p>
          )}
        </div>

        <div className="settings-section">
          <h2 className="settings-title">Backend URL</h2>
          <p className="settings-label">The URL of your ApplyBuddy backend server</p>

          <div className="settings-input-row">
            <input
              type="url"
              className="settings-input"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://localhost:8000"
            />
            <button className="settings-btn settings-btn--secondary" onClick={handleTestConnection}>
              Test
            </button>
          </div>

          <button
            className={`settings-btn settings-btn--primary ${saved ? 'saved' : ''}`}
            onClick={handleSaveUrl}
            disabled={saving || url === backendUrl}
          >
            {saved ? '✓ Saved' : saving ? 'Saving...' : 'Save'}
          </button>
        </div>

        <div className="settings-section">
          <h2 className="settings-title">About</h2>
          <p className="settings-label">ApplyBuddy Chrome Extension v1.0.0</p>
        </div>
      </div>
    </div>
  )
}