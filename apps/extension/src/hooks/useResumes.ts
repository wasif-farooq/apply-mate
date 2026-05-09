import { useState, useCallback, useEffect } from 'react'
import { Resume } from '../types'
import { useAuthStorage } from './useStorage'

interface UseResumesReturn {
  resumes: Resume[]
  loading: boolean
  error: string | null
  selectedResume: Resume | null
  selectResume: (id: number) => void
  refetch: () => Promise<void>
}

export function useResumes(
  backendUrl: string,
  initialResumeId: number = 0
): UseResumesReturn {
  const [resumes, setResumes] = useState<Resume[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedResumeId, setSelectedResumeId] = useState(initialResumeId)
  const { getToken } = useAuthStorage()

  const fetchResumes = useCallback(async () => {
    setLoading(true)
    setError(null)

    const token = await getToken()
    if (!token) {
      setLoading(false)
      setError('Not authenticated')
      return
    }

    try {
      const response = await fetch(`${backendUrl}/api/resumes`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch resumes')
      }

      const data = await response.json()
      setResumes(data)

      if (!selectedResumeId && data.length > 0) {
        const defaultResume = data.find((r: Resume) => r.is_default)
        setSelectedResumeId(defaultResume?.id || data[0].id)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch resumes')
    } finally {
      setLoading(false)
    }
  }, [backendUrl, getToken, selectedResumeId])

  useEffect(() => {
    fetchResumes()
  }, [fetchResumes])

  const selectedResume = resumes.find((r) => r.id === selectedResumeId) || null

  const selectResume = useCallback((id: number) => {
    setSelectedResumeId(id)
  }, [])

  return {
    resumes,
    loading,
    error,
    selectedResume,
    selectResume,
    refetch: fetchResumes,
  }
}