'use client'

declare const chrome: any

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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function getExtensionToken(): Promise<string | null> {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
    return null
  }
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_TOKEN' })
    return response?.token || null
  } catch {
    return null
  }
}

async function setExtensionToken(token: string, email?: string): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
    return
  }
  try {
    await chrome.runtime.sendMessage({ type: 'SET_TOKEN', token, email })
  } catch {
    // Silent fail - extension may not be installed or just installed
  }
}

async function clearExtensionToken(): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
    return
  }
  try {
    await chrome.runtime.sendMessage({ type: 'LOGOUT' })
  } catch {
    // Silent fail
  }
}

async function validateToken(token: string): Promise<User | null> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    if (res.ok) {
      return await res.json()
    }
    return null
  } catch {
    return null
  }
}

async function resolveToken(): Promise<string | null> {
  const extToken = await getExtensionToken()
  if (extToken) {
    const user = await validateToken(extToken)
    if (user) {
      localStorage.setItem('token', extToken)
      return extToken
    }
  }

  const localToken = localStorage.getItem('token')
  if (localToken) {
    const user = await validateToken(localToken)
    if (user) {
      await setExtensionToken(localToken, user.email)
      return localToken
    }
    localStorage.removeItem('token')
  }

  return null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUser = async () => {
    const token = await resolveToken()
    if (!token) {
      setLoading(false)
      return
    }

    const userData = await validateToken(token)
    if (userData) {
      setUser(userData)
    } else {
      localStorage.removeItem('token')
    }
    setLoading(false)
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
      
      localStorage.setItem('oauth_state', data.state)
      
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
    await clearExtensionToken()
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

export async function refreshToken(): Promise<boolean> {
  const token = getToken()
  if (!token) return false

  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!res.ok) return false

    const data = await res.json()
    if (data.token) {
      localStorage.setItem('token', data.token)
      return true
    }
    return false
  } catch {
    return false
  }
}