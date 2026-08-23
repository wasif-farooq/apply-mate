'use client'

import { useEffect, useState } from 'react'
import { getToken } from '@/lib/auth'
import { useEmailSettings } from '@/hooks/useEmailSettings'
import { Header } from '@applybuddy/ui'
import { Navigation } from '@/components/Navigation'
import { ProtectedRoute } from '@/components/ProtectedRoute'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function EmailSettingsTab() {
  const {
    loading,
    saving,
    error,
    emailConfig,
    handleSaveSmtp,
    handleConnectGoogle,
    handleDisconnect,
    loadEmailConfig
  } = useEmailSettings()

  const [smtpForm, setSmtpForm] = useState({
    host: '',
    port: 587,
    username: '',
    password: '',
    from_email: '',
    use_tls: true
  })
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ status: string; message: string } | null>(null)

  const [activeOption, setActiveOption] = useState<'google' | 'smtp' | null>(
    emailConfig?.type || null
  )

  useEffect(() => {
    if (emailConfig?.type) {
      setActiveOption(emailConfig.type)
      if (emailConfig.type === 'smtp') {
        setSmtpForm({
          host: emailConfig.host || '',
          port: emailConfig.port || 587,
          username: emailConfig.username || '',
          password: '',
          from_email: emailConfig.from_email || '',
          use_tls: true
        })
      }
    }
  }, [emailConfig])

  const handleTestSmtp = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const { testSmtpConnection } = await import('@/lib/api')
      await testSmtpConnection(smtpForm)
      setTestResult({ status: 'success', message: 'Connection successful!' })
    } catch (err) {
      setTestResult({ status: 'error', message: err instanceof Error ? err.message : 'Connection failed' })
    } finally {
      setTesting(false)
    }
  }

  const handleSaveSmtpClick = async () => {
    await handleSaveSmtp(smtpForm)
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px', color: '#5c6c7a' }}>
        Loading email settings...
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '8px' }}>
          Email Configuration
        </h2>
        <p style={{ fontSize: '13px', color: '#a8b3bc' }}>
          Configure how you want to send job application emails
        </p>
      </div>

      {error && (
        <div style={{ 
          background: 'rgba(255,107,107,0.1)', 
          border: '1px solid #ff6b6b',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '20px',
          color: '#ff6b6b',
          fontSize: '13px'
        }}>
          {error}
        </div>
      )}

      {emailConfig?.configured && (
        <div style={{ 
          background: 'rgba(0,237,100,0.1)', 
          border: '1px solid #00ed64',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '14px', color: '#00ed64', fontWeight: 600 }}>
              ✓ Connected via {emailConfig.type === 'google' ? 'Google' : 'SMTP'}
            </div>
            <div style={{ fontSize: '12px', color: '#a8b3bc', marginTop: '4px' }}>
              {emailConfig.type === 'google' ? emailConfig.email : emailConfig.username}
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            disabled={saving}
            style={{
              background: 'transparent',
              border: '1px solid #ff6b6b',
              borderRadius: '6px',
              padding: '8px 16px',
              color: '#ff6b6b',
              cursor: saving ? 'default' : 'pointer',
              fontSize: '13px'
            }}
          >
            Disconnect
          </button>
        </div>
      )}

      <div style={{ marginBottom: '24px' }}>
        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          padding: '16px',
          background: activeOption === 'google' ? 'rgba(0,237,100,0.1)' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${activeOption === 'google' ? '#00ed64' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: '10px',
          cursor: 'pointer',
          marginBottom: '12px'
        }}>
          <input 
            type="radio" 
            name="emailOption" 
            checked={activeOption === 'google'}
            onChange={() => setActiveOption('google')}
            style={{ accentColor: '#00ed64' }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '15px', fontWeight: 500, color: '#fff' }}>
              Connect Google Account
            </div>
            <div style={{ fontSize: '12px', color: '#a8b3bc', marginTop: '4px' }}>
              Use your Gmail account to send emails via Google API
            </div>
          </div>
        </label>

        {activeOption === 'google' && !emailConfig?.configured && (
          <button
            onClick={handleConnectGoogle}
            style={{
              marginLeft: '36px',
              marginBottom: '16px',
              background: '#00ed64',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              color: '#001e2b',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500
            }}
          >
            Connect Google
          </button>
        )}

        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          padding: '16px',
          background: activeOption === 'smtp' ? 'rgba(0,237,100,0.1)' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${activeOption === 'smtp' ? '#00ed64' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: '10px',
          cursor: 'pointer'
        }}>
          <input 
            type="radio" 
            name="emailOption" 
            checked={activeOption === 'smtp'}
            onChange={() => setActiveOption('smtp')}
            style={{ accentColor: '#00ed64' }}
          />
          <div>
            <div style={{ fontSize: '15px', fontWeight: 500, color: '#fff' }}>
              Use SMTP
            </div>
            <div style={{ fontSize: '12px', color: '#a8b3bc', marginTop: '4px' }}>
              Enter your SMTP server details manually
            </div>
          </div>
        </label>

        {activeOption === 'smtp' && (
          <div style={{ 
            marginLeft: '36px', 
            marginTop: '16px',
            padding: '20px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '10px'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: '#a8b3bc', fontSize: '12px' }}>
                  Host
                </label>
                <input
                  type="text"
                  value={smtpForm.host}
                  onChange={(e) => setSmtpForm({ ...smtpForm, host: e.target.value })}
                  placeholder="smtp.gmail.com"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: '#0d1f2b',
                    border: '1px solid #1c2d38',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: '#a8b3bc', fontSize: '12px' }}>
                  Port
                </label>
                <input
                  type="number"
                  value={smtpForm.port}
                  onChange={(e) => setSmtpForm({ ...smtpForm, port: parseInt(e.target.value) || 587 })}
                  placeholder="587"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: '#0d1f2b',
                    border: '1px solid #1c2d38',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', color: '#a8b3bc', fontSize: '12px' }}>
                Username
              </label>
              <input
                type="text"
                value={smtpForm.username}
                onChange={(e) => setSmtpForm({ ...smtpForm, username: e.target.value })}
                placeholder="your@email.com"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#0d1f2b',
                  border: '1px solid #1c2d38',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', color: '#a8b3bc', fontSize: '12px' }}>
                Password / App Password
              </label>
              <input
                type="password"
                value={smtpForm.password}
                onChange={(e) => setSmtpForm({ ...smtpForm, password: e.target.value })}
                placeholder="Enter password or app password"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#0d1f2b',
                  border: '1px solid #1c2d38',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', color: '#a8b3bc', fontSize: '12px' }}>
                From Email (optional)
              </label>
              <input
                type="text"
                value={smtpForm.from_email}
                onChange={(e) => setSmtpForm({ ...smtpForm, from_email: e.target.value })}
                placeholder="Same as username if empty"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#0d1f2b',
                  border: '1px solid #1c2d38',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '14px'
                }}
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', color: '#a8b3bc', fontSize: '13px' }}>
              <input 
                type="checkbox" 
                checked={smtpForm.use_tls}
                onChange={(e) => setSmtpForm({ ...smtpForm, use_tls: e.target.checked })}
                style={{ accentColor: '#00ed64' }}
              />
              Use TLS/SSL
            </label>

            {testResult && (
              <div style={{ 
                marginBottom: '16px',
                padding: '12px',
                borderRadius: '6px',
                background: testResult.status === 'success' ? 'rgba(0,237,100,0.1)' : 'rgba(255,107,107,0.1)',
                color: testResult.status === 'success' ? '#00ed64' : '#ff6b6b',
                fontSize: '13px'
              }}>
                {testResult.message}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleTestSmtp}
                disabled={testing || !smtpForm.host || !smtpForm.username || !smtpForm.password}
                style={{
                  padding: '10px 20px',
                  background: testing || !smtpForm.host || !smtpForm.username || !smtpForm.password ? '#1c2d38' : 'transparent',
                  border: `1px solid ${testing || !smtpForm.host || !smtpForm.username || !smtpForm.password ? '#5c6c7a' : '#00ed64'}`,
                  borderRadius: '8px',
                  color: testing || !smtpForm.host || !smtpForm.username || !smtpForm.password ? '#5c6c7a' : '#00ed64',
                  cursor: testing || !smtpForm.host || !smtpForm.username || !smtpForm.password ? 'default' : 'pointer',
                  fontSize: '14px'
                }}
              >
                {testing ? 'Testing...' : 'Test Connection'}
              </button>
              <button
                onClick={handleSaveSmtpClick}
                disabled={saving || !smtpForm.host || !smtpForm.username || !smtpForm.password}
                style={{
                  padding: '10px 20px',
                  background: saving || !smtpForm.host || !smtpForm.username || !smtpForm.password ? '#1c2d38' : '#00ed64',
                  border: 'none',
                  borderRadius: '8px',
                  color: saving || !smtpForm.host || !smtpForm.username || !smtpForm.password ? '#5c6c7a' : '#001e2b',
                  cursor: saving || !smtpForm.host || !smtpForm.username || !smtpForm.password ? 'default' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 500
                }}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const navItems = [
    { href: '/apply', label: 'Apply' },
    { href: '/history', label: 'History' },
    { href: '/settings', label: 'Settings' },
    { href: '/resumes', label: 'Resumes' },
  ]

  return (
    <ProtectedRoute
      loadingFallback={
        <div style={{ minHeight: '100vh', background: '#001e2b', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p>Loading...</p>
        </div>
      }
    >
      <div style={{ minHeight: '100vh', background: '#001e2b', color: '#ffffff' }}>
        <Header
          logo="ApplyBuddy"
          showLogoIcon={true}
          rightElement={<Navigation items={navItems} activeHref="/settings" />}
        />

        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px' }}>
          <main
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              padding: '24px',
            }}
          >
            <EmailSettingsTab />
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
