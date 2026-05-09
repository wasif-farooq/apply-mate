import { useState, useEffect } from 'react'
import LoginPage from './pages/LoginPage'
import ApplyPage from './pages/ApplyPage'
import PreviewPage from './pages/PreviewPage'
import SettingsPage from './pages/SettingsPage'
import { useAuthStorage, useSettingsStorage, useAuth } from '../hooks'
import { EmailData } from '../types'

type Page = 'login' | 'apply' | 'preview' | 'settings'

export default function App() {
  const [page, setPage] = useState<Page>('login')
  const [emailData, setEmailData] = useState<EmailData | null>(null)
  
  const { getToken } = useAuthStorage()
  const { getBackendUrl, getLinkedInUrl, getSelectedResumeId } = useSettingsStorage()
  const { logout } = useAuth()

  const [backendUrl, setBackendUrl] = useState('http://localhost:8000')
  const [linkedInUrl, setLinkedInUrl] = useState('')
  const [resumeId, setResumeId] = useState(0)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    loadInitialState()
  }, [])

  const loadInitialState = async () => {
    try {
      const [token, url, linkedUrl, selectedResumeId] = await Promise.all([
        getToken(),
        getBackendUrl(),
        getLinkedInUrl(),
        getSelectedResumeId(),
      ])

      setBackendUrl(url)
      setLinkedInUrl(linkedUrl)
      setResumeId(selectedResumeId)
      setIsAuthenticated(!!token)
      setPage(!!token ? 'apply' : 'login')
    } catch (err) {
      console.error('Failed to load state:', err)
    }
  }

  const handleLogin = () => {
    setIsAuthenticated(true)
    setPage('apply')
  }

  const handleLogout = async () => {
    await logout()
    setIsAuthenticated(false)
    setPage('login')
  }

  const handleGeneratedEmail = (data: EmailData) => {
    setEmailData(data)
    setPage('preview')
  }

  const handleBackToApply = () => {
    setEmailData(null)
    setPage('apply')
  }

  const handleSentEmail = () => {
    setEmailData(null)
    setPage('apply')
  }

  const handleNavigate = (targetPage: Page) => {
    setPage(targetPage)
  }

  const handleBackendUrlChange = (url: string) => {
    setBackendUrl(url)
  }

  const handleSettings = () => {
    setPage('settings')
  }

  switch (page) {
    case 'login':
      return (
        <LoginPage
          backendUrl={backendUrl}
          onLogin={handleLogin}
        />
      )

    case 'apply':
      return (
        <ApplyPage
          backendUrl={backendUrl}
          initialLinkedinUrl={linkedInUrl}
          initialResumeId={resumeId}
          onGenerated={handleGeneratedEmail}
          onLogout={handleLogout}
          onSettings={handleSettings}
        />
      )

    case 'preview':
      return (
        <PreviewPage
          backendUrl={backendUrl}
          emailData={emailData!}
          onBack={handleBackToApply}
          onSent={handleSentEmail}
        />
      )

    case 'settings':
      return (
        <SettingsPage
          backendUrl={backendUrl}
          onBackendUrlChange={handleBackendUrlChange}
          onLogout={handleLogout}
          onBack={() => handleNavigate(isAuthenticated ? 'apply' : 'login')}
        />
      )

    default:
      return null
  }
}