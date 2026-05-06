'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface User {
  id: number
  email: string
  name: string | null
  picture: string | null
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: () => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const API_BASE = 'http://localhost:8000'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUser = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (res.ok) {
        const userData = await res.json()
        setUser(userData)
      } else {
        localStorage.removeItem('token')
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      localStorage.removeItem('token')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUser()
  }, [])

  const signIn = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`)
      if (!res.ok) {
        throw new Error('Failed to get auth URL')
      }
      const data = await res.json()
      
      // Store state for validation
      localStorage.setItem('oauth_state', data.state)
      
      // Redirect to Google
      window.location.href = data.authorization_url
    } catch (error) {
      console.error('Login failed:', error)
      alert('Login failed. Please try again.')
    }
  }

  const signOut = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST' })
    } catch (e) {
      // Ignore logout errors
    }
    localStorage.removeItem('token')
    localStorage.removeItem('oauth_state')
    setUser(null)
    window.location.href = '/'
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function getToken(): string | null {
  return localStorage.getItem('token')
}