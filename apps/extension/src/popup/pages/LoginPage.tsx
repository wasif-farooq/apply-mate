import { useState } from 'react'

interface LoginPageProps {
  backendUrl: string
  onLogin: () => void
}

export default function LoginPage({ backendUrl, onLogin }: LoginPageProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')

    try {
      // Use chrome.identity.getAuthToken for extension OAuth
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

      // Get user info using the token
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!userResponse.ok) {
        throw new Error('Failed to get user info')
      }

      const userInfo = await userResponse.json()

      // Send token to backend to create session
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
      <div className="login-header">
        <h1>ApplyMate</h1>
        <p>Sign in to start applying</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <button
        className="google-login-btn"
        onClick={handleGoogleLogin}
        disabled={loading}
      >
        {loading ? (
          <span className="loading-spinner" />
        ) : (
          <>
            <svg viewBox="0 0 24 24" width="20" height="20">
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
            Sign in with Google
          </>
        )}
      </button>

      <style>{`
        .login-page {
          width: 600px;
          min-height: 400px;
          padding: 40px;
          background: #001e2b;
          color: #ffffff;
        }
        .login-header {
          text-align: center;
          margin-bottom: 32px;
        }
        .login-header h1 {
          font-size: 28px;
          font-weight: 600;
          color: #00ed64;
          margin: 0 0 8px 0;
        }
        .login-header p {
          color: #a8b3bc;
          margin: 0;
        }
        .error-message {
          background: #fff8e0;
          color: #946f3f;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          font-size: 14px;
        }
        .google-login-btn {
          width: 100%;
          padding: 16px;
          background: #ffffff;
          color: #333;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          transition: background 0.2s;
        }
        .google-login-btn:hover:not(:disabled) {
          background: #f5f5f5;
        }
        .google-login-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid #ddd;
          border-top-color: #333;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}