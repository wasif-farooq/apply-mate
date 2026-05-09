'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import { useSettings, PROVIDER_LABELS } from '@/hooks/useSettings'
import { useEmailSettings } from '@/hooks/useEmailSettings'
import { Header } from '@applybuddy/ui'
import { useAuth, getToken } from '@/lib/auth'

function ActiveConfig({ activeProvider }: { activeProvider: [string, any] | undefined }) {
  return (
    <div style={{ 
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '8px'
    }}>
      <div style={{ fontSize: '12px', color: '#a8b3bc', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Active Configuration
      </div>
      <div style={{ fontSize: '14px', color: '#00ed64', fontWeight: 600 }}>
        {activeProvider?.[0] ? PROVIDER_LABELS[activeProvider[0]] : 'None'}
      </div>
      <div style={{ fontSize: '12px', color: '#a8b3bc', marginTop: '4px' }}>
        {activeProvider?.[1]?.models?.find((m: any) => m.selected)?.name || 'No model selected'}
      </div>
    </div>
  )
}

function ProviderSidebar({ 
  providers, 
  selectedProvider, 
  onSelect 
}: { 
  providers: Record<string, any>; 
  selectedProvider: string;
  onSelect: (name: string) => void;
}) {
  return (
    <aside style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ fontSize: '12px', color: '#a8b3bc', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '0 8px' }}>
        AI Providers
      </div>
      {Object.entries(providers).map(([name, state]) => (
        <button
          key={name}
          onClick={() => onSelect(name)}
          style={{
            background: selectedProvider === name ? 'rgba(0, 237, 100, 0.1)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${selectedProvider === name ? '#00ed64' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '10px',
            padding: '14px 16px',
            cursor: 'pointer',
            textAlign: 'left',
            color: '#fff',
            transition: 'all 0.2s'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '15px', fontWeight: 500 }}>{PROVIDER_LABELS[name]}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
{state.enabled && state.models.some((m: any) => m.selected) && (
                <span style={{ 
                  fontSize: '10px', 
                  background: '#00ed64', 
                  color: '#001e2b', 
                  padding: '2px 6px', 
                  borderRadius: '4px',
                  fontWeight: 600
                }}>
                  Active
                </span>
              )}
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: state.enabled ? '#00ed64' : '#5c6c7a'
              }} />
            </div>
          </div>
          {state.enabled && state.models.some((m: any) => m.selected) && (
            <div style={{ fontSize: '11px', color: '#a8b3bc', marginTop: '6px' }}>
              {state.models.find((m: any) => m.selected)?.name}
            </div>
          )}
        </button>
      ))}
    </aside>
  )
}

function ProviderHeader({ 
  selectedProvider, 
  currentProvider, 
  onToggle 
}: { 
  selectedProvider: string;
  currentProvider: { enabled: boolean };
  onToggle: () => void;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
      <div>
        <h2 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '4px' }}>
          {PROVIDER_LABELS[selectedProvider]}
        </h2>
        <p style={{ fontSize: '13px', color: '#a8b3bc' }}>
          Configure your {PROVIDER_LABELS[selectedProvider]} connection and models
        </p>
      </div>
      <button
        onClick={onToggle}
        style={{
          background: currentProvider.enabled ? '#00ed64' : 'transparent',
          border: `1px solid ${currentProvider.enabled ? '#00ed64' : '#5c6c7a'}`,
          borderRadius: '8px',
          padding: '8px 16px',
          fontSize: '13px',
          color: currentProvider.enabled ? '#001e2b' : '#a8b3bc',
          cursor: 'pointer',
          fontWeight: 500,
          transition: 'all 0.2s'
        }}
      >
        {currentProvider.enabled ? 'Enabled' : 'Disabled'}
      </button>
    </div>
  )
}

function ConfigInput({ 
  selectedProvider, 
  currentProvider, 
  showApiKey, 
  onConfigChange,
  onToggleApiKey 
}: { 
  selectedProvider: string;
  currentProvider: { config: { url: string; api_key: string } };
  showApiKey: boolean;
  onConfigChange: (key: string, value: string) => void;
  onToggleApiKey: () => void;
}) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <label style={{ display: 'block', marginBottom: '8px', color: '#a8b3bc', fontSize: '13px' }}>
        {selectedProvider === 'ollama' ? 'Base URL' : 'API Key'}
      </label>
      {selectedProvider === 'ollama' ? (
        <input
          type="text"
          value={currentProvider.config.url}
          onChange={(e) => onConfigChange('url', e.target.value)}
          placeholder="http://localhost:11434"
          style={{
            width: '100%',
            padding: '12px 16px',
            background: '#0d1f2b',
            border: '1px solid #1c2d38',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '14px',
            outline: 'none'
          }}
        />
      ) : (
        <div style={{ position: 'relative' }}>
          <input
            type={showApiKey ? 'text' : 'password'}
            value={currentProvider.config.api_key}
            onChange={(e) => onConfigChange('api_key', e.target.value)}
            placeholder={selectedProvider === 'openai' ? 'sk-...' : selectedProvider === 'anthropic' ? 'sk-ant-...' : 'AIza...'}
            style={{
              width: '100%',
              padding: '12px 16px',
              paddingRight: '48px',
              background: '#0d1f2b',
              border: '1px solid #1c2d38',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px',
              outline: 'none'
            }}
          />
          <button
            type="button"
            onClick={onToggleApiKey}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              color: '#a8b3bc',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            {showApiKey ? '🙈' : '👁️'}
          </button>
        </div>
      )}
    </div>
  )
}

function ModelGrid({ 
  models, 
  onSelect 
}: { 
  models: { name: string; selected: boolean }[]; 
  onSelect: (name: string) => void;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
      {models.map(model => (
        <button
          key={model.name}
          onClick={() => onSelect(model.name)}
          style={{
            background: model.selected 
              ? 'rgba(0, 237, 100, 0.15)' 
              : 'rgba(255,255,255,0.05)',
            border: `2px solid ${model.selected ? '#00ed64' : '#2a3f4f'}`,
            borderRadius: '10px',
            padding: '14px 16px',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.2s',
            position: 'relative'
          }}
        >
          {model.selected && (
            <div style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: '#00ed64',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              color: '#001e2b'
            }}>
              ✓
            </div>
          )}
          <div style={{ 
            color: model.selected ? '#00ed64' : '#fff', 
            fontSize: '13px', 
            fontWeight: model.selected ? 600 : 400,
            marginBottom: '4px'
          }}>
            {model.name}
          </div>
          <div style={{ 
            fontSize: '11px', 
            color: model.selected ? '#00ed64' : '#5c6c7a'
          }}>
            {model.selected ? 'Selected' : 'Available'}
          </div>
        </button>
      ))}
    </div>
  )
}

function FetchModelsButton({ 
  provider, 
  apiKey, 
  baseUrl, 
  fetching, 
  onFetch 
}: { 
  provider: string;
  apiKey: string;
  baseUrl: string;
  fetching: boolean;
  onFetch: () => void;
}) {
  if (fetching) {
    return (
      <button
        disabled={true}
        style={{
          marginTop: '16px',
          padding: '10px 16px',
          background: '#1c2d38',
          border: 'none',
          borderRadius: '8px',
          color: '#5c6c7a',
          fontSize: '14px',
          cursor: 'default',
          fontWeight: 500
        }}
      >
        Fetching...
      </button>
    )
  }

  return (
    <button
      onClick={onFetch}
      style={{
        marginTop: '16px',
        padding: '10px 16px',
        background: '#00ed64',
        border: 'none',
        borderRadius: '8px',
        color: '#001e2b',
        fontSize: '14px',
        cursor: 'pointer',
        fontWeight: 500
      }}
    >
      Fetch Models
    </button>
  )
}

function ProviderContent({ 
  selectedProvider,
  currentProvider,
  showApiKey,
  onConfigChange,
  onToggleApiKey,
  onModelSelect,
  onModelFetch,
  fetching
}: {
  selectedProvider: string;
  currentProvider: { enabled: boolean; config: { url: string; api_key: string }; models: { name: string; selected: boolean }[] };
  showApiKey: boolean;
  onConfigChange: (key: string, value: string) => void;
  onToggleApiKey: () => void;
  onModelSelect: (name: string) => void;
  onModelFetch: () => void;
  fetching: boolean;
}) {
  if (!currentProvider.enabled) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '48px 24px',
        color: '#5c6c7a'
      }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚙️</div>
        <p>This provider is disabled. Click "Disabled" above to enable it.</p>
      </div>
    )
  }

  const handleFetch = async () => {
    const apiKey = currentProvider.config.api_key
    const baseUrl = currentProvider.config.url || 'http://localhost:11434'
    onModelFetch()
  }

  return (
    <>
      <ConfigInput 
        selectedProvider={selectedProvider}
        currentProvider={currentProvider}
        showApiKey={showApiKey}
        onConfigChange={onConfigChange}
        onToggleApiKey={onToggleApiKey}
      />

      <div>
        <label style={{ display: 'block', marginBottom: '12px', color: '#a8b3bc', fontSize: '13px' }}>
          Select Model (click to select)
        </label>
        <ModelGrid models={currentProvider.models} onSelect={onModelSelect} />

        {selectedProvider === 'ollama' && (
          <FetchModelsButton
            provider={selectedProvider}
            apiKey={currentProvider.config.api_key}
            baseUrl={currentProvider.config.url}
            fetching={fetching}
            onFetch={handleFetch}
          />
        )}

        {selectedProvider === 'ollama_cloud' && (
          <FetchModelsButton
            provider={selectedProvider}
            apiKey={currentProvider.config.api_key}
            baseUrl=""
            fetching={fetching}
            onFetch={handleFetch}
          />
        )}

        {selectedProvider === 'openrouter' && (
          <FetchModelsButton
            provider={selectedProvider}
            apiKey={currentProvider.config.api_key}
            baseUrl=""
            fetching={fetching}
            onFetch={handleFetch}
          />
        )}

        {selectedProvider === 'opencode_zen' && (
          <FetchModelsButton
            provider={selectedProvider}
            apiKey={currentProvider.config.api_key}
            baseUrl=""
            fetching={fetching}
            onFetch={handleFetch}
          />
        )}

        {selectedProvider === 'opencode_go' && (
          <FetchModelsButton
            provider={selectedProvider}
            apiKey={currentProvider.config.api_key}
            baseUrl=""
            fetching={fetching}
            onFetch={handleFetch}
          />
        )}
      </div>
    </>
  )
}

function SaveSection({ hasChanges, saving, saved, onSave }: { 
  hasChanges: boolean; 
  saving: boolean; 
  saved: boolean; 
  onSave: () => void;
}) {
  return (
    <div style={{ 
      marginTop: '32px', 
      paddingTop: '24px', 
      borderTop: '1px solid #1c2d38',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div style={{ fontSize: '13px', color: hasChanges ? '#f59e0b' : '#5c6c7a' }}>
        {hasChanges ? '● Unsaved changes' : 'All changes saved'}
      </div>
      <button
        onClick={onSave}
        disabled={saving || !hasChanges}
        style={{
          background: saving || !hasChanges ? '#1c2d38' : '#00ed64',
          border: 'none',
          borderRadius: '8px',
          padding: '12px 24px',
          fontSize: '14px',
          color: saving || !hasChanges ? '#5c6c7a' : '#001e2b',
          cursor: saving || !hasChanges ? 'default' : 'pointer',
          fontWeight: 600,
          transition: 'all 0.2s'
        }}
      >
        {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Changes'}
      </button>
    </div>
  )
}

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
  const { user, loading: authLoading } = useAuthGuard()
  const { signOut } = useAuth()
  const [activeTab, setActiveTab] = useState<'ai' | 'email'>('ai')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab')
    if (tab === 'email') {
      setActiveTab('email')
    }
  }, [])

  const {
    loading,
    saving,
    saved,
    selectedProvider,
    hasChanges,
    showApiKey,
    fetchingStates,
    providers,
    activeProvider,
    currentProvider,
    setSelectedProvider,
    setShowApiKey,
    setFetchingState,
    setProviders,
    handleConfigChange,
    handleToggleProvider,
    handleModelSelect,
    handleModelFetch,
    handleSave,
  } = useSettings()

  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = '/'
      return
    }
  }, [user, authLoading])

  if (authLoading || loading || !user) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#001e2b',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <p>Loading...</p>
      </div>
    )
  }

  const triggerModelFetch = async () => {
    const currentProvider = providers[selectedProvider]
    const baseUrl = currentProvider?.config?.url || 'http://localhost:11434'
    const apiKey = currentProvider?.config?.api_key || ''

    setFetchingState(selectedProvider, true)

    try {
      let res, data

      if (selectedProvider === 'ollama') {
        res = await fetch(`http://localhost:8000/api/settings/models/fetch-ollama?url=${encodeURIComponent(baseUrl)}`, {
          headers: { 'Authorization': `Bearer ${getToken()}` }
        })
        data = await res.json()
      } else if (selectedProvider === 'ollama_cloud') {
        res = await fetch('http://localhost:8000/api/settings/models/fetch-ollama-cloud', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${getToken()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ api_key: apiKey })
        })
        data = await res.json()
      } else if (selectedProvider === 'openrouter') {
        res = await fetch('http://localhost:8000/api/settings/models/fetch-openrouter', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${getToken()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ api_key: apiKey })
        })
        data = await res.json()
      } else if (selectedProvider === 'opencode_zen') {
        res = await fetch('http://localhost:8000/api/settings/models/fetch-opencode', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${getToken()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ provider: 'zen', api_key: apiKey })
        })
        data = await res.json()
      } else if (selectedProvider === 'opencode_go') {
        res = await fetch('http://localhost:8000/api/settings/models/fetch-opencode', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${getToken()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ provider: 'go', api_key: apiKey })
        })
        data = await res.json()
      }

      if (data?.models) {
        const models = data.models.map((m: any, index: number) => ({
          name: m.model_name,
          selected: index === 0
        }))
        setProviders((prev: any) => ({
          ...prev,
          [selectedProvider]: { ...prev[selectedProvider], models }
        }))
        if (models[0]) {
          handleModelSelect(models[0].name)
        }
      } else if (data?.error) {
        alert(data.error)
      }
    } catch (err) {
      alert('Failed to fetch models. Check your connection.')
    } finally {
      setFetchingState(selectedProvider, false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#001e2b',
      color: '#ffffff'
    }}>
      <Header 
        logo="ApplyBuddy"
        showLogoIcon={true}
        rightElement={
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link href="/apply" style={{ color: '#a8b3bc', textDecoration: 'none', fontSize: '14px' }}>Apply</Link>
            <Link href="/history" style={{ color: '#a8b3bc', textDecoration: 'none', fontSize: '14px' }}>History</Link>
            <Link href="/settings" style={{ color: '#00ed64', textDecoration: 'none', fontSize: '14px' }}>Settings</Link>
            <Link href="/resumes" style={{ color: '#a8b3bc', textDecoration: 'none', fontSize: '14px' }}>Resumes</Link>
            <button 
              onClick={signOut}
              style={{ 
                background: 'transparent', 
                border: '1px solid #ff6b6b', 
                color: '#ff6b6b',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Sign Out
            </button>
          </div>
        }
      />

      <div style={{ 
        maxWidth: '1000px', 
        margin: '0 auto', 
        padding: '24px'
      }}>
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          marginBottom: '24px',
          borderBottom: '1px solid #1c2d38',
          paddingBottom: '16px'
        }}>
          <button
            onClick={() => setActiveTab('ai')}
            style={{
              background: activeTab === 'ai' ? 'rgba(0,237,100,0.1)' : 'transparent',
              border: `1px solid ${activeTab === 'ai' ? '#00ed64' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: '8px',
              padding: '12px 24px',
              color: activeTab === 'ai' ? '#00ed64' : '#a8b3bc',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500
            }}
          >
            AI Providers
          </button>
          <button
            onClick={() => setActiveTab('email')}
            style={{
              background: activeTab === 'email' ? 'rgba(0,237,100,0.1)' : 'transparent',
              border: `1px solid ${activeTab === 'email' ? '#00ed64' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: '8px',
              padding: '12px 24px',
              color: activeTab === 'email' ? '#00ed64' : '#a8b3bc',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500
            }}
          >
            Email Settings
          </button>
        </div>

        {activeTab === 'ai' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '24px' }}>
            <div>
              <ActiveConfig activeProvider={activeProvider} />
              <ProviderSidebar 
                providers={providers}
                selectedProvider={selectedProvider}
                onSelect={(name) => {
                  setSelectedProvider(name)
                  setShowApiKey((p: any) => ({ ...p, [name]: false }))
                }}
              />
            </div>

            <main style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              padding: '24px'
            }}>
              <ProviderHeader 
                selectedProvider={selectedProvider}
                currentProvider={currentProvider}
                onToggle={() => handleToggleProvider(selectedProvider)}
              />

              <ProviderContent
                selectedProvider={selectedProvider}
                currentProvider={currentProvider}
                showApiKey={!!showApiKey[selectedProvider]}
                onConfigChange={handleConfigChange}
                onToggleApiKey={() => setShowApiKey((p: any) => ({ ...p, [selectedProvider]: !p[selectedProvider] }))}
                onModelSelect={handleModelSelect}
                onModelFetch={triggerModelFetch}
                fetching={fetchingStates[selectedProvider]}
              />

              <SaveSection 
                hasChanges={hasChanges}
                saving={saving}
                saved={saved}
                onSave={handleSave}
              />
            </main>
          </div>
        ) : (
          <main style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            padding: '24px'
          }}>
            <EmailSettingsTab />
          </main>
        )}
      </div>
    </div>
  )
}