import { useState } from 'react'
import { LogoIcon } from '@applybuddy/ui'
import { useAuth } from '../../hooks'
import { ErrorToast } from '../components'
import '../../styles/theme.css'
import '../../styles/components.css'
import '../../styles/pages.css'

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
  const { login, loading, error } = useAuth()
  const [localError, setLocalError] = useState('')

  const handleGoogleLogin = async () => {
    setLocalError('')
    try {
      await login(backendUrl)
      onLogin()
    } catch (err: any) {
      setLocalError(err.message || 'Login failed. Please try again.')
    }
  }

  const displayError = error || localError

  return (
    <div className="login-page">
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
        {displayError && <ErrorToast message={displayError} onDismiss={() => setLocalError('')} />}

        <button
          className="google-btn"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          {loading ? (
            <span className="ext-spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
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