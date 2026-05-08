import { useState, useEffect } from 'react'

interface SettingsPageProps {
  backendUrl: string
  onBackendUrlChange: (url: string) => void
  onLogout: () => void
  onBack: () => void
}

export default function SettingsPage({ backendUrl, onBackendUrlChange, onLogout, onBack }: SettingsPageProps) {
  const [url, setUrl] = useState(backendUrl)
  const [userEmail, setUserEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    loadUserEmail()
  }, [])

  const loadUserEmail = async () => {
    const data = await chrome.storage.local.get('user_email')
    if (data.user_email) {
      setUserEmail(data.user_email)
    }
  }

  const handleSaveUrl = async () => {
    setSaving(true)
    try {
      await chrome.storage.local.set({ backend_url: url })
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
      <div className="header">
        <button className="back-btn" onClick={onBack}>
          ← Back
        </button>
        <h1>Settings</h1>
      </div>

      <div className="section">
        <h2>Account</h2>
        {userEmail ? (
          <div className="user-info">
            <span className="email">{userEmail}</span>
            <button className="logout-btn" onClick={onLogout}>
              Sign Out
            </button>
          </div>
        ) : (
          <p className="hint">Not signed in</p>
        )}
      </div>

      <div className="section">
        <h2>Backend URL</h2>
        <p className="hint">The URL of your ApplyMate backend server</p>

        <div className="input-row">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="http://localhost:8000"
          />
          <button className="test-btn" onClick={handleTestConnection}>
            Test
          </button>
        </div>

        <button
          className={`save-btn ${saved ? 'saved' : ''}`}
          onClick={handleSaveUrl}
          disabled={saving || url === backendUrl}
        >
          {saved ? '✓ Saved' : saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="section">
        <h2>About</h2>
        <p className="hint">ApplyMate Chrome Extension v1.0.0</p>
      </div>

      <style>{settingsStyles}</style>
    </div>
  )
}

const settingsStyles = `
  .settings-page {
    width: 600px;
    min-height: 500px;
    padding: 24px;
    background: #001e2b;
    color: #ffffff;
  }
  .header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 32px;
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
  .section {
    margin-bottom: 32px;
    padding-bottom: 24px;
    border-bottom: 1px solid #1c2d38;
  }
  .section:last-child {
    border-bottom: none;
  }
  .section h2 {
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 8px 0;
  }
  .hint {
    color: #a8b3bc;
    font-size: 14px;
    margin: 0 0 12px 0;
  }
  .user-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .email {
    color: #00ed64;
    font-size: 14px;
  }
  .logout-btn {
    padding: 6px 12px;
    background: transparent;
    border: 1px solid #ff6b6b;
    border-radius: 6px;
    color: #ff6b6b;
    font-size: 14px;
    cursor: pointer;
  }
  .logout-btn:hover {
    background: rgba(255,107,107,0.1);
  }
  .input-row {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }
  .input-row input {
    flex: 1;
    padding: 10px 12px;
    background: #0d1f2b;
    border: 1px solid #1c2d38;
    border-radius: 6px;
    color: #fff;
    font-size: 14px;
  }
  .input-row input:focus {
    outline: none;
    border-color: #00ed64;
  }
  .test-btn {
    padding: 10px 16px;
    background: #1c2d38;
    border: none;
    border-radius: 6px;
    color: #a8b3bc;
    font-size: 14px;
    cursor: pointer;
  }
  .test-btn:hover {
    background: #2a3f4f;
  }
  .save-btn {
    padding: 10px 20px;
    background: #00ed64;
    border: none;
    border-radius: 6px;
    color: #001e2b;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
  }
  .save-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .save-btn.saved {
    background: #00b84d;
  }
`