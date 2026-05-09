import { useState, useCallback } from 'react'
import { useAuthStorage } from './useStorage'

interface UseAuthReturn {
  isAuthenticated: boolean
  loading: boolean
  error: string | null
  login: (backendUrl: string) => Promise<void>
  logout: () => Promise<void>
  getToken: () => Promise<string | null>
}

export function useAuth(): UseAuthReturn {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { getToken, setToken, clearAuth, setUserEmail } = useAuthStorage()

  const login = useCallback(async (backendUrl: string): Promise<void> => {
    setLoading(true)
    setError(null)

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

      await setToken(sessionData.access_token)
      await setUserEmail(userInfo.email)

      setIsAuthenticated(true)
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message || 'Login failed. Please try again.')
      throw err
    } finally {
      setLoading(false)
    }
  }, [setToken, setUserEmail])

  const logout = useCallback(async (): Promise<void> => {
    await clearAuth()
    setIsAuthenticated(false)
  }, [clearAuth])

  const getAuthToken = useCallback(async (): Promise<string | null> => {
    return await getToken()
  }, [getToken])

  return {
    isAuthenticated,
    loading,
    error,
    login,
    logout,
    getToken: getAuthToken,
  }
}