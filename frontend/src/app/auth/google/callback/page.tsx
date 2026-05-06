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
      const storedState = localStorage.getItem('oauth_state')

      if (!code || !state) {
        setError('Missing code or state parameter')
        return
      }

      if (state !== storedState) {
        setError('Invalid state parameter - possible CSRF attack')
        localStorage.removeItem('oauth_state')
        return
      }

      try {
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
        
        // Store token
        localStorage.setItem('token', data.token)
        localStorage.removeItem('oauth_state')
        
        // Use window.location.href instead of router.push() to ensure
        // full page reload so AuthProvider can properly read the token
        window.location.href = '/apply'
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
      <p>Logging you in...</p>
    </div>
  )
}