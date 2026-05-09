import { useCallback } from 'react'
import { useAuthStorage } from './useStorage'

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: object
  headers?: Record<string, string>
}

interface ApiResponse<T> {
  data: T | null
  error: string | null
  ok: boolean
}

export function useApi() {
  const { getToken } = useAuthStorage()

  const request = useCallback(async <T>(
    endpoint: string,
    baseUrl: string,
    options: ApiOptions = {}
  ): Promise<ApiResponse<T>> => {
    const token = await getToken()

    if (!token) {
      return { data: null, error: 'Not authenticated', ok: false }
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    }

    if (options.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json'
    }

    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return {
          data: null,
          error: errorData.detail || `Request failed with status ${response.status}`,
          ok: false,
        }
      }

      const data = await response.json()
      return { data, error: null, ok: true }
    } catch (err: any) {
      console.error('API request error:', err)
      return { data: null, error: err.message || 'Network error', ok: false }
    }
  }, [getToken])

  return { request }
}

export function useApiWithToken(token: string | null) {
  const request = useCallback(async <T>(
    endpoint: string,
    baseUrl: string,
    options: ApiOptions = {}
  ): Promise<ApiResponse<T>> => {
    if (!token) {
      return { data: null, error: 'Not authenticated', ok: false }
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    }

    if (options.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json'
    }

    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return {
          data: null,
          error: errorData.detail || `Request failed with status ${response.status}`,
          ok: false,
        }
      }

      const data = await response.json()
      return { data, error: null, ok: true }
    } catch (err: any) {
      console.error('API request error:', err)
      return { data: null, error: err.message || 'Network error', ok: false }
    }
  }, [token])

  return { request }
}