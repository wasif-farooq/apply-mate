import { useState, useEffect, useCallback } from 'react'
import { getApplications, getApplicationStats, deleteApplication, Application, ApplicationStats } from '@/lib/api'

export interface UseApplicationsReturn {
  applications: Application[]
  stats: ApplicationStats | null
  loading: boolean
  error: string
  filter: string
  setFilter: (filter: string) => void
  loadData: () => Promise<void>
  handleDelete: (id: number) => Promise<void>
  getStatusColor: (status: string) => { bg: string; text: string }
  formatDate: (dateStr: string) => string
}

export function useApplications(): UseApplicationsReturn {
  const [applications, setApplications] = useState<Application[]>([])
  const [stats, setStats] = useState<ApplicationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [appsRes, statsRes] = await Promise.all([
        getApplications(1, 50, filter || undefined),
        getApplicationStats()
      ])
      setApplications(appsRes.applications)
      setStats(statsRes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleDelete = useCallback(async (id: number) => {
    if (!confirm('Are you sure you want to delete this application?')) return
    
    try {
      await deleteApplication(id)
      setApplications(applications.filter(app => app.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete application')
    }
  }, [applications])

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'sent': return { bg: '#e3fcef', text: '#00684a' }
      case 'generated': return { bg: '#e0f4ff', text: '#005ea2' }
      case 'failed': return { bg: '#fff8e0', text: '#946f3f' }
      default: return { bg: '#f0f0f0', text: '#666' }
    }
  }, [])

  const formatDate = useCallback((dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }, [])

  return {
    applications,
    stats,
    loading,
    error,
    filter,
    setFilter,
    loadData,
    handleDelete,
    getStatusColor,
    formatDate,
  }
}