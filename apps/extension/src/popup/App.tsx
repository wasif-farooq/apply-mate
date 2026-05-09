import { useState, useEffect } from 'react'
import LoginPage from './pages/LoginPage'
import ApplyPage from './pages/ApplyPage'
import PreviewPage from './pages/PreviewPage'
import SettingsPage from './pages/SettingsPage'

type Page = 'login' | 'apply' | 'preview' | 'settings'

interface AppState {
  page: Page
  isAuthenticated: boolean
  backendUrl: string
}

const DEFAULT_BACKEND_URL = 'http://localhost:8000'

export default function App() {
  const [state, setState] = useState<AppState>({
    page: 'login',
    isAuthenticated: false,
    backendUrl: DEFAULT_BACKEND_URL,
  })
  const [emailData, setEmailData] = useState<any>(null)

  useEffect(() => {
    loadState()
  }, [])

  const loadState = async () => {
    try {
      const [auth, settings] = await Promise.all([
        chrome.storage.local.get('auth_token'),
        chrome.storage.local.get('backend_url'),
      ])

      const isAuthenticated = !!auth.auth_token
      const backendUrl = settings.backend_url || DEFAULT_BACKEND_URL

      setState({
        page: isAuthenticated ? 'apply' : 'login',
        isAuthenticated,
        backendUrl,
      })
    } catch (err) {
      console.error('Failed to load state:', err)
    }
  }

  const handleLogin = () => {
    setState((prev) => ({ ...prev, isAuthenticated: true, page: 'apply' }))
  }

  const handleLogout = async () => {
    await chrome.storage.local.remove(['auth_token', 'user_email'])
    setState((prev) => ({ ...prev, isAuthenticated: false, page: 'login' }))
  }

  const handleGeneratedEmail = (data: any) => {
    setEmailData(data)
    setState((prev) => ({ ...prev, page: 'preview' }))
  }

  const handleBackToApply = () => {
    setEmailData(null)
    setState((prev) => ({ ...prev, page: 'apply' }))
  }

  const handleSentEmail = () => {
    setEmailData(null)
    setState((prev) => ({ ...prev, page: 'apply' }))
  }

  const handleNavigate = (page: Page) => {
    setState((prev) => ({ ...prev, page }))
  }

  const handleBackendUrlChange = (url: string) => {
    setState((prev) => ({ ...prev, backendUrl: url }))
  }

  switch (state.page) {
    case 'login':
      return (
        <LoginPage
          backendUrl={state.backendUrl}
          onLogin={handleLogin}
        />
      )

    case 'apply':
      return (
        <ApplyPage
          backendUrl={state.backendUrl}
          onGenerated={handleGeneratedEmail}
          onLogout={handleLogout}
        />
      )

    case 'preview':
      return (
        <PreviewPage
          backendUrl={state.backendUrl}
          emailData={emailData}
          onBack={handleBackToApply}
          onSent={handleSentEmail}
        />
      )

    case 'settings':
      return (
        <SettingsPage
          backendUrl={state.backendUrl}
          onBackendUrlChange={handleBackendUrlChange}
          onLogout={handleLogout}
          onBack={() => handleNavigate(state.isAuthenticated ? 'apply' : 'login')}
        />
      )

    default:
      return null
  }
}