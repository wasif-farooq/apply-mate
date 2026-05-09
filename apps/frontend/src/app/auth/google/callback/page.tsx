'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const API_BASE = 'http://localhost:8000'

export default function CallbackPage() {
  const router = useRouter()
  const [error, setError] = useState('')

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const state = params.get('state')

      if (!code || !state) {
        setError('Missing code or state parameter')
        return
      }

      const isEmailFlow = localStorage.getItem('email_oauth_flow') === 'true'
      const storageKey = isEmailFlow ? 'email_oauth_state' : 'oauth_state'
      const storedState = localStorage.getItem(storageKey)

      if (state !== storedState) {
        setError('Invalid state parameter - possible CSRF attack')
        localStorage.removeItem(storageKey)
        if (isEmailFlow) localStorage.removeItem('email_oauth_flow')
        return
      }

      try {
        if (isEmailFlow) {
          const res = await fetch(`${API_BASE}/api/settings/email/callback`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ code, state }),
          })

          if (!res.ok) {
            const data = await res.json()
            throw new Error(data.detail || 'Failed to connect Google email')
          }

          localStorage.removeItem(storageKey)
          localStorage.removeItem('email_oauth_flow')
          window.location.href = '/settings?tab=email'
        } else {
          const res = await fetch(`${API_BASE}/api/auth/callback`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code, state }),
          })

          if (!res.ok) {
            const data = await res.json()
            throw new Error(data.detail || 'Authentication failed')
          }

          const data = await res.json()
          localStorage.setItem('token', data.token)
          localStorage.removeItem(storageKey)
          window.location.href = '/apply'
        }
      } catch (err) {
        console.error('Callback error:', err)
        setError(err instanceof Error ? err.message : 'Authentication failed')
      }
    }

    handleCallback()
  }, [router])

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #001e2b 0%, #003d4f 100%)',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <h2>Authentication Failed</h2>
        <p style={{ color: '#ff6b6b' }}>{error}</p>
        <button 
          onClick={() => window.location.href = '/'}
          className="btn btn-primary"
        >
          Go Home
        </button>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #001e2b 0%, #003d4f 100%)',
      color: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <p>Processing...</p>
    </div>
  )
}