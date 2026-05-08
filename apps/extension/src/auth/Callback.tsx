import { useEffect, useState } from 'react'

export default function AuthCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    handleCallback()
  }, [])

  const handleCallback = async () => {
    try {
      const url = new URL(window.location.href)
      const code = url.searchParams.get('code')
      const errorParam = url.searchParams.get('error')
      const state = url.searchParams.get('state')

      if (errorParam) {
        throw new Error(errorParam)
      }

      if (!code) {
        throw new Error('No authorization code received')
      }

      const storage = await chrome.storage.local.get(['oauth_state', 'backend_url'])
      const expectedState = storage.oauth_state
      const backendUrl = storage.backend_url || 'http://localhost:8000'

      if (state !== expectedState) {
        throw new Error('Invalid state parameter - possible CSRF attack')
      }

      const response = await fetch(`${backendUrl}/auth/callback?code=${code}`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to complete authentication')
      }

      const tokenData = await response.json()

      await chrome.storage.local.set({
        auth_token: tokenData.access_token,
        user_email: tokenData.email,
      })

      setStatus('success')

      setTimeout(() => {
        window.close()
      }, 1500)
    } catch (err: any) {
      setStatus('error')
      setError(err.message || 'Authentication failed')
    }
  }

  return (
    <div className="auth-callback">
      {status === 'loading' && (
        <div className="loading">
          <div className="spinner" />
          <p>Completing authentication...</p>
        </div>
      )}

      {status === 'success' && (
        <div className="success">
          <div className="icon">✓</div>
          <p>Authentication successful!</p>
          <span>Closing window...</span>
        </div>
      )}

      {status === 'error' && (
        <div className="error">
          <div className="icon">✗</div>
          <p>Authentication failed</p>
          <span>{error}</span>
          <button onClick={() => window.close()}>Close</button>
        </div>
      )}

      <style>{`
        .auth-callback {
          width: 400px;
          min-height: 300px;
          padding: 32px;
          background: #001e2b;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .loading, .success, .error {
          text-align: center;
        }
        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #1c2d38;
          border-top-color: #00ed64;
          border-radius: 50%;
          margin: 0 auto 16px;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          margin: 0 auto 16px;
        }
        .success .icon {
          background: #00ed64;
          color: #001e2b;
        }
        .error .icon {
          background: #ff6b6b;
          color: #fff;
        }
        p {
          font-size: 16px;
          margin: 0 0 8px 0;
        }
        span {
          color: #a8b3bc;
          font-size: 14px;
        }
        button {
          margin-top: 16px;
          padding: 10px 20px;
          background: #1c2d38;
          border: none;
          border-radius: 6px;
          color: #fff;
          cursor: pointer;
        }
        button:hover {
          background: #2a3f4f;
        }
      `}</style>
    </div>
  )
}