'use client'

import { useState, useEffect, useCallback } from 'react'
import { getEmailConfig, saveEmailConfig, connectGoogleEmail, testSmtpConnection, EmailConfig, EmailConfigSave, SmtpTestRequest } from '@/lib/api'

export interface UseEmailSettingsReturn {
  loading: boolean
  saving: boolean
  testing: boolean
  error: string | null
  emailConfig: EmailConfig | null
  setEmailConfig: (config: EmailConfig | null) => void
  setError: (error: string | null) => void
  loadEmailConfig: () => Promise<void>
  handleSaveSmtp: (smtpConfig: SmtpTestRequest) => Promise<void>
  handleConnectGoogle: () => Promise<void>
  handleDisconnect: () => Promise<void>
}

export function useEmailSettings(): UseEmailSettingsReturn {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailConfig, setEmailConfig] = useState<EmailConfig | null>(null)

  const loadEmailConfig = useCallback(async () => {
    try {
      setLoading(true)
      const config = await getEmailConfig()
      setEmailConfig(config)
      setError(null)
    } catch (err) {
      console.error('Failed to load email config:', err)
      setError('Failed to load email configuration')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadEmailConfig()
  }, [loadEmailConfig])

  const handleSaveSmtp = useCallback(async (smtpConfig: SmtpTestRequest) => {
    setSaving(true)
    setError(null)
    try {
      const config: EmailConfigSave = {
        type: 'smtp',
        smtp: {
          host: smtpConfig.host,
          port: smtpConfig.port,
          username: smtpConfig.username,
          password: smtpConfig.password,
          from_email: smtpConfig.from_email || smtpConfig.username,
          use_tls: smtpConfig.use_tls ?? true
        }
      }
      await saveEmailConfig(config)
      await loadEmailConfig()
    } catch (err) {
      console.error('Failed to save SMTP config:', err)
      setError(err instanceof Error ? err.message : 'Failed to save SMTP configuration')
    } finally {
      setSaving(false)
    }
  }, [loadEmailConfig])

  const handleConnectGoogle = useCallback(async () => {
    try {
      const { authorization_url, state } = await connectGoogleEmail()
      localStorage.setItem('email_oauth_state', state)
      localStorage.setItem('email_oauth_flow', 'true')
      window.location.href = authorization_url
    } catch (err) {
      console.error('Failed to connect Google:', err)
      setError(err instanceof Error ? err.message : 'Failed to connect Google account')
    }
  }, [])

  const handleDisconnect = useCallback(async () => {
    setSaving(true)
    setError(null)
    try {
      await saveEmailConfig({ type: 'smtp', smtp: { host: '', port: 0, username: '', password: '', from_email: '', use_tls: true } } as unknown as EmailConfigSave)
      await loadEmailConfig()
    } catch (err) {
      console.error('Failed to disconnect email:', err)
      setError(err instanceof Error ? err.message : 'Failed to disconnect email')
    } finally {
      setSaving(false)
    }
  }, [loadEmailConfig])

  return {
    loading,
    saving,
    testing,
    error,
    emailConfig,
    setEmailConfig,
    setError,
    loadEmailConfig,
    handleSaveSmtp,
    handleConnectGoogle,
    handleDisconnect
  }
}