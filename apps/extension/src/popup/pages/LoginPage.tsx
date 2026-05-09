import { useState } from 'react'
import { LogoIcon } from '@applybuddy/ui'

interface LoginPageProps {
  backendUrl: string
  onLogin: () => void
}

const FEATURES = [
  { icon: '✨', title: 'AI-Powered Emails', desc: 'Personalized subject & body' },
  { icon: '📄', title: 'Resume Attachment', desc: 'Auto-attach to every app' },
  { icon: '🔒', title: 'Preview Before Sending', desc: 'You stay in control' },
  { icon: '📊', title: 'Track Applications', desc: 'Never miss a follow-up' },
]

export default function LoginPage({ backendUrl, onLogin }: LoginPageProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')

    try {
      const token = await new Promise<string>((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: true }, (token) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
          } else {
            resolve(token as string)
          }
        })
      })

      if (!token) {
        throw new Error('Failed to get auth token')
      }

      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!userResponse.ok) {
        throw new Error('Failed to get user info')
      }

      const userInfo = await userResponse.json()

      const sessionResponse = await fetch(`${backendUrl}/auth/extension/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })

      if (!sessionResponse.ok) {
        throw new Error('Failed to create session')
      }

      const sessionData = await sessionResponse.json()

      await chrome.storage.local.set({
        auth_token: sessionData.access_token,
        user_email: userInfo.email,
      })

      onLogin()
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <style>{`
        .login-page {
          width: 380px;
          min-height: 520px;
          background: #001e2b;
          color: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          flex-direction: column;
        }
        .login-header {
          text-align: center;
          padding: 32px 20px 24px;
        }
        .logo-wrapper {
          display: flex;
          justify-content: center;
          margin-bottom: 12px;
        }
        .logo-title {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .logo-title h1 {
          font-size: 22px;
          font-weight: 600;
          color: #00ed64;
          margin: 0;
        }
        .tagline {
          color: #a8b3bc;
          font-size: 14px;
          margin: 0;
          line-height: 1.5;
        }
        .features-section {
          flex: 1;
          padding: 0 20px;
        }
        .features-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .feature-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px;
          background: #0d1f2b;
          border-radius: 10px;
          border: 1px solid #1c2d38;
        }
        .feature-icon {
          font-size: 18px;
          flex-shrink: 0;
        }
        .feature-text h3 {
          font-size: 13px;
          font-weight: 600;
          color: #fff;
          margin: 0 0 4px 0;
        }
        .feature-text p {
          font-size: 12px;
          color: #6b7280;
          margin: 0;
        }
        .button-section {
          padding: 20px;
        }
        .error-message {
          background: rgba(255,107,107,0.1);
          border: 1px solid #ff6b6b;
          color: #ff6b6b;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 13px;
        }
        .google-btn {
          width: 100%;
          padding: 14px 20px;
          background: #0d1f2b;
          border: 1px solid #1c2d38;
          border-radius: 10px;
          color: #fff;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          transition: all 0.2s;
        }
        .google-btn:hover:not(:disabled) {
          background: #132836;
          border-color: #00ed64;
        }
        .google-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .google-icon {
          width: 18px;
          height: 18px;
        }
        .loading-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid #1c2d38;
          border-top-color: #00ed64;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div className="login-header">
        <div className="logo-wrapper">
          <div className="logo-title">
            <LogoIcon style={{ width: '36px', height: '36px' }} />
            <h1>ApplyBuddy</h1>
          </div>
        </div>
        <p className="tagline">
          Automate your job applications<br />with AI — right from LinkedIn
        </p>
      </div>

      <div className="features-section">
        <div className="features-list">
          {FEATURES.map((feature, index) => (
            <div key={index} className="feature-item">
              <span className="feature-icon">{feature.icon}</span>
              <div className="feature-text">
                <h3>{feature.title}</h3>
                <p>{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="button-section">
        {error && <div className="error-message">{error}</div>}

        <button
          className="google-btn"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          {loading ? (
            <span className="loading-spinner" />
          ) : (
            <>
              <svg className="google-icon" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </>
          )}
        </button>
      </div>
    </div>
  )
}