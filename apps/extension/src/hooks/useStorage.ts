import { useState, useCallback } from 'react'
import { STORAGE_KEYS } from '../utils/constants'

type StorageValue = string | number | boolean | object | null

export function useStorage() {
  const [error, setError] = useState<string | null>(null)

  const get = useCallback(async <T extends StorageValue>(key: string): Promise<T | null> => {
    try {
      const result = await chrome.storage.local.get(key)
      return (result[key] as T) ?? null
    } catch (err) {
      console.error(`Storage get error for ${key}:`, err)
      return null
    }
  }, [])

  const set = useCallback(async (key: string, value: StorageValue): Promise<void> => {
    try {
      await chrome.storage.local.set({ [key]: value })
    } catch (err) {
      console.error(`Storage set error for ${key}:`, err)
      setError(String(err))
    }
  }, [])

  const remove = useCallback(async (key: string | string[]): Promise<void> => {
    try {
      const keys = Array.isArray(key) ? key : [key]
      await chrome.storage.local.remove(keys)
    } catch (err) {
      console.error('Storage remove error:', err)
      setError(String(err))
    }
  }, [])

  return {
    get,
    set,
    remove,
    error,
  }
}

export function useAuthStorage() {
  const { get, set, remove } = useStorage()

  const getToken = useCallback(async (): Promise<string | null> => {
    const result = await get<string>(STORAGE_KEYS.AUTH_TOKEN)
    return result
  }, [get])

  const setToken = useCallback(async (token: string): Promise<void> => {
    await set(STORAGE_KEYS.AUTH_TOKEN, token)
  }, [set])

  const clearAuth = useCallback(async (): Promise<void> => {
    await remove([STORAGE_KEYS.AUTH_TOKEN, STORAGE_KEYS.USER_EMAIL])
  }, [remove])

  const getUserEmail = useCallback(async (): Promise<string | null> => {
    return await get<string>(STORAGE_KEYS.USER_EMAIL)
  }, [get])

  const setUserEmail = useCallback(async (email: string): Promise<void> => {
    await set(STORAGE_KEYS.USER_EMAIL, email)
  }, [set])

  return {
    getToken,
    setToken,
    clearAuth,
    getUserEmail,
    setUserEmail,
  }
}

export function useSettingsStorage() {
  const { get, set } = useStorage()

  const getBackendUrl = useCallback(async (): Promise<string> => {
    const url = await get<string>(STORAGE_KEYS.BACKEND_URL)
    return url || 'http://localhost:8000'
  }, [get])

  const setBackendUrl = useCallback(async (url: string): Promise<void> => {
    await set(STORAGE_KEYS.BACKEND_URL, url)
  }, [set])

  const getLinkedInUrl = useCallback(async (): Promise<string> => {
    const url = await get<string>(STORAGE_KEYS.LINKEDIN_URL)
    return url || ''
  }, [get])

  const setLinkedInUrl = useCallback(async (url: string): Promise<void> => {
    await set(STORAGE_KEYS.LINKEDIN_URL, url)
  }, [set])

  const getSelectedResumeId = useCallback(async (): Promise<number> => {
    const id = await get<number>(STORAGE_KEYS.SELECTED_RESUME_ID)
    return id || 0
  }, [get])

  const setSelectedResume = useCallback(async (id: number, name: string): Promise<void> => {
    await set(STORAGE_KEYS.SELECTED_RESUME_ID, id)
    if (name) {
      await set(STORAGE_KEYS.SELECTED_RESUME_NAME, name)
    }
  }, [set])

  return {
    getBackendUrl,
    setBackendUrl,
    getLinkedInUrl,
    setLinkedInUrl,
    getSelectedResumeId,
    setSelectedResume,
  }
}