'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useAuth, getToken } from '@/lib/auth'
import { getSettings, updateProviderConfig, updateProviderModels, updateGlobalSelection, ProviderConfig, ModelConfig } from '@/lib/api'

const PROVIDER_LABELS: Record<string, string> = {
  ollama: 'Ollama (Local)',
  ollama_cloud: 'Ollama Cloud',
  openrouter: 'OpenRouter',
  opencode_zen: 'OpenCode Zen',
  opencode_go: 'OpenCode Go',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google'
}

interface ModelState {
  name: string
  selected: boolean
}

interface ProviderState {
  enabled: boolean
  config: {
    url: string
    api_key: string
  }
  models: ModelState[]
}

export default function SettingsPage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState('ollama')
  const [globalSelectedModel, setGlobalSelectedModel] = useState<string | null>(null)
  const [globalSelectedProvider, setGlobalSelectedProvider] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [expandedProviders, setExpandedProviders] = useState<Record<string, boolean>>({})
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({})
  const [ollamaFetching, setOllamaFetching] = useState(false)
  const [ollamaCloudFetching, setOllamaCloudFetching] = useState(false)
  const [openrouterFetching, setOpenrouterFetching] = useState(false)
  const [opencodeZenFetching, setOpencodeZenFetching] = useState(false)
  const [opencodeGoFetching, setOpencodeGoFetching] = useState(false)
  
  const [providers, setProviders] = useState<Record<string, ProviderState>>({
    ollama: { enabled: true, config: { url: 'http://localhost:11434', api_key: '' }, models: [] },
    ollama_cloud: { enabled: false, config: { url: 'https://cloud.ollama.com', api_key: '' }, models: [] },
    openrouter: { enabled: false, config: { url: 'https://openrouter.ai/api/v1', api_key: '' }, models: [] },
    opencode_zen: { enabled: false, config: { url: 'https://opencode.ai/zen/v1', api_key: '' }, models: [] },
    opencode_go: { enabled: false, config: { url: 'https://opencode.ai/zen/go/v1', api_key: '' }, models: [] },
    openai: { enabled: false, config: { url: '', api_key: '' }, models: [] },
    anthropic: { enabled: false, config: { url: '', api_key: '' }, models: [] },
    google: { enabled: false, config: { url: '', api_key: '' }, models: [] }
  })

  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = '/'
      return
    }
  }, [user, authLoading])

  useEffect(() => {
    if (user) {
      loadSettings()
    }
  }, [user])

  const loadSettings = async () => {
    try {
      const data = await getSettings()
      console.log('[loadSettings] Full data:', JSON.stringify(data))
      
      const globalModel = data.selected_model
      const globalProvider = data.selected_provider
      
      setGlobalSelectedModel(globalModel || null)
      setGlobalSelectedProvider(globalProvider || null)
      
      const newProviders: Record<string, ProviderState> = {}
      const newExpanded: Record<string, boolean> = {}
      const providerNames = ['ollama', 'ollama_cloud', 'openrouter', 'opencode_zen', 'opencode_go', 'openai', 'anthropic', 'google']
      
      for (const name of providerNames) {
        const existingConfig = data.providers?.find((p: ProviderConfig) => p.provider === name)
        const existingModels = data.models?.[name] || []
        
        const models = existingModels.map((m: ModelConfig) => ({
          name: m.model_name,
          selected: !!(globalModel && globalProvider === name && m.model_name === globalModel)
        }))
        
        newProviders[name] = {
          enabled: existingConfig?.enabled || (name === 'ollama'),
          config: {
            url: existingConfig?.config?.url || (name === 'ollama' ? 'http://localhost:11434' : ''),
            api_key: existingConfig?.config?.api_key || ''
          },
          models
        }
        
        newExpanded[name] = existingConfig?.enabled || name === 'ollama'
      }
      
      setProviders(newProviders)
      setExpandedProviders(newExpanded)
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveProvider = useCallback(async (name: string, state: ProviderState) => {
    try {
      await updateProviderConfig(name, state.enabled, state.config)
      const models = state.models
        .filter(m => m.selected)
        .map(m => ({ model_name: m.name, is_default: m.selected }))
      console.log(`[saveProvider] ${name}: saving models:`, models)
      await updateProviderModels(name, models)
    } catch (error) {
      console.error('Failed to save provider:', name, error)
    }
  }, [])

  const handleConfigChange = (key: string, value: string) => {
    setProviders(prev => ({
      ...prev,
      [selectedProvider]: {
        ...prev[selectedProvider],
        config: { ...prev[selectedProvider].config, [key]: value }
      }
    }))
    setHasChanges(true)
  }

  const handleToggleProvider = (name: string) => {
    setProviders(prev => {
      const updated = {
        ...prev,
        [name]: { ...prev[name], enabled: !prev[name].enabled }
      }
      if (!prev[name].enabled) {
        setExpandedProviders(p => ({ ...p, [name]: true }))
        setSelectedProvider(name)
      }
      return updated
    })
    setHasChanges(true)
  }

  const handleModelSelect = async (modelName: string) => {
    console.log(`[handleModelSelect] Clicked model: ${modelName}, provider: ${selectedProvider}`)
    
    setProviders(prev => {
      const provider = prev[selectedProvider]
      if (!provider) return prev
      
      const updatedModels = provider.models.map(m => ({
        name: m.name,
        selected: m.name === modelName
      }))
      
      console.log(`[handleModelSelect] Updated models:`, updatedModels.map(m => ({name: m.name, selected: m.selected})))
      
      return {
        ...prev,
        [selectedProvider]: { 
          ...provider, 
          models: updatedModels 
        }
      }
    })
    
    setGlobalSelectedModel(modelName)
    setGlobalSelectedProvider(selectedProvider)
    setHasChanges(true)
    
    try {
      await updateGlobalSelection(selectedProvider, modelName)
    } catch (error) {
      console.error('Failed to save global selection:', error)
    }
  }

const handleModelFetch = (dbModels: { model_name: string; is_default: boolean }[]) => {
    const provider = providers[selectedProvider]
    if (!provider) return

    console.log('[handleModelFetch] dbModels:', dbModels)
    
    const firstModel = dbModels[0]?.model_name
    
    const models = dbModels.map((m, index) => ({
      name: m.model_name,
      selected: !!(firstModel && index === 0)
    }))

    setProviders(prev => ({
      ...prev,
      [selectedProvider]: {
        ...provider,
        models
      }
    }))
    
    if (firstModel) {
      setGlobalSelectedModel(firstModel)
      setGlobalSelectedProvider(selectedProvider)
      updateGlobalSelection(selectedProvider, firstModel).catch(console.error)
    }
    setHasChanges(true)
  }

  const handleSave = async () => {
    const enabledProviders = Object.entries(providers).filter(([_, p]) => p.enabled)
    const hasSelectedModels = enabledProviders.some(([_, p]) => 
      p.models.some(m => m.selected)
    )
    
    if (!hasSelectedModels) {
      alert('Please select at least one model before saving.')
      return
    }
    
    setSaving(true)
    try {
      for (const [name, state] of Object.entries(providers)) {
        await saveProvider(name, state)
      }
      
      setSaved(true)
      setHasChanges(false)
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('Failed to save settings:', error)
      alert('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const getActiveProvider = () => {
    return Object.entries(providers).find(([_, p]) => p.enabled && p.models.some(m => m.selected))
  }

  const activeProvider = getActiveProvider()
  const currentProvider = providers[selectedProvider]

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

  return (
    <div style={{
      minHeight: '100vh',
      background: '#001e2b',
      color: '#ffffff'
    }}>
      <header style={{
        background: '#001e2b',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #1c2d38'
      }}>
        <Link href="/apply" style={{ color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>←</span>
          <span style={{ fontSize: '18px' }}>Back</span>
        </Link>
        <h1 style={{ fontSize: '20px', fontWeight: 600 }}>Settings</h1>
        <button 
          onClick={signOut}
          style={{ 
            background: 'transparent', 
            border: '1px solid #ff6b6b', 
            color: '#ff6b6b',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Sign Out
        </button>
      </header>

      <div style={{ 
        maxWidth: '1000px', 
        margin: '0 auto', 
        padding: '24px',
        display: 'grid',
        gridTemplateColumns: '280px 1fr',
        gap: '24px'
      }}>
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
              {activeProvider?.[1]?.models?.find(m => m.selected)?.name || 'No model selected'}
            </div>
          </div>

          <div style={{ fontSize: '12px', color: '#a8b3bc', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '0 8px' }}>
            AI Providers
          </div>

          {Object.entries(providers).map(([name, state]) => (
            <button
              key={name}
              onClick={() => {
                setSelectedProvider(name)
                setExpandedProviders(p => ({ ...p, [name]: true }))
              }}
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
{state.enabled && state.models.some(m => m.selected) && (
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
              {state.enabled && state.models.some(m => m.selected) && (
                <div style={{ fontSize: '11px', color: '#a8b3bc', marginTop: '6px' }}>
                  {state.models.find(m => m.selected)?.name}
                </div>
              )}
            </button>
          ))}
        </aside>

        <main style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '16px',
          padding: '24px'
        }}>
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
              onClick={() => handleToggleProvider(selectedProvider)}
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

          {currentProvider.enabled ? (
            <>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#a8b3bc', fontSize: '13px' }}>
                  {selectedProvider === 'ollama' ? 'Base URL' : 'API Key'}
                </label>
                {selectedProvider === 'ollama' ? (
                  <input
                    type="text"
                    value={currentProvider.config.url}
                    onChange={(e) => handleConfigChange('url', e.target.value)}
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
                      type={showApiKey[selectedProvider] ? 'text' : 'password'}
                      value={currentProvider.config.api_key}
                      onChange={(e) => handleConfigChange('api_key', e.target.value)}
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
                      onClick={() => setShowApiKey(p => ({ ...p, [selectedProvider]: !p[selectedProvider] }))}
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
                      {showApiKey[selectedProvider] ? '🙈' : '👁️'}
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '12px', color: '#a8b3bc', fontSize: '13px' }}>
                  Select Model (click to select)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                  {currentProvider.models.map(model => (
                    <button
                      key={model.name}
                      onClick={() => handleModelSelect(model.name)}
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

                {selectedProvider === 'ollama' && (
                  <button
                    onClick={async () => {
                      const baseUrl = currentProvider.config.url || 'http://localhost:11434';
                      setOllamaFetching(true);
                      try {
                        const res = await fetch(`http://localhost:8000/api/settings/models/fetch-ollama?url=${encodeURIComponent(baseUrl)}`, {
                          headers: { 'Authorization': `Bearer ${getToken()}` }
                        });
                        const data = await res.json();
                        if (data.models) {
                          handleModelFetch(data.models);
                        } else if (data.error) {
                          alert(data.error);
                        }
                      } catch (err) {
                        alert('Failed to fetch models. Is Ollama running?');
                      }
                      setOllamaFetching(false);
                    }}
                    disabled={ollamaFetching}
                    style={{
                      marginTop: '16px',
                      padding: '10px 16px',
                      background: ollamaFetching ? '#1c2d38' : '#00ed64',
                      border: 'none',
                      borderRadius: '8px',
                      color: ollamaFetching ? '#5c6c7a' : '#001e2b',
                      fontSize: '14px',
                      cursor: ollamaFetching ? 'default' : 'pointer',
                      fontWeight: 500
                    }}
                  >
                    {ollamaFetching ? 'Fetching...' : 'Fetch Models'}
                  </button>
                )}

                {selectedProvider === 'ollama_cloud' && (
                  <button
                    onClick={async () => {
                      const apiKey = currentProvider.config.api_key;
                      if (!apiKey) {
                        alert('Please enter an API key first');
                        return;
                      }
                      setOllamaCloudFetching(true);
                      try {
                        const res = await fetch('http://localhost:8000/api/settings/models/fetch-ollama-cloud', {
                          method: 'POST',
                          headers: { 
                            'Authorization': `Bearer ${getToken()}`,
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({ api_key: apiKey })
                        });
                        const data = await res.json();
                        if (data.models) {
                          handleModelFetch(data.models);
                        } else if (data.error) {
                          alert(data.error);
                        }
                      } catch (err) {
                        alert('Failed to fetch models. Check your API key.');
                      }
                      setOllamaCloudFetching(false);
                    }}
                    disabled={ollamaCloudFetching}
                    style={{
                      marginTop: '16px',
                      padding: '10px 16px',
                      background: ollamaCloudFetching ? '#1c2d38' : '#00ed64',
                      border: 'none',
                      borderRadius: '8px',
                      color: ollamaCloudFetching ? '#5c6c7a' : '#001e2b',
                      fontSize: '14px',
                      cursor: ollamaCloudFetching ? 'default' : 'pointer',
                      fontWeight: 500
                    }}
                  >
                    {ollamaCloudFetching ? 'Fetching...' : 'Fetch Models'}
                  </button>
                )}

                {selectedProvider === 'openrouter' && (
                  <button
                    onClick={async () => {
                      const apiKey = currentProvider.config.api_key;
                      if (!apiKey) {
                        alert('Please enter an API key first');
                        return;
                      }
                      setOpenrouterFetching(true);
                      try {
                        const res = await fetch('http://localhost:8000/api/settings/models/fetch-openrouter', {
                          method: 'POST',
                          headers: { 
                            'Authorization': `Bearer ${getToken()}`,
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({ api_key: apiKey })
                        });
                        const data = await res.json();
                        if (data.models) {
                          handleModelFetch(data.models);
                        } else if (data.error) {
                          alert(data.error);
                        }
                      } catch (err) {
                        alert('Failed to fetch models. Check your API key.');
                      }
                      setOpenrouterFetching(false);
                    }}
                    disabled={openrouterFetching}
                    style={{
                      marginTop: '16px',
                      padding: '10px 16px',
                      background: openrouterFetching ? '#1c2d38' : '#00ed64',
                      border: 'none',
                      borderRadius: '8px',
                      color: openrouterFetching ? '#5c6c7a' : '#001e2b',
                      fontSize: '14px',
                      cursor: openrouterFetching ? 'default' : 'pointer',
                      fontWeight: 500
                    }}
                  >
                    {openrouterFetching ? 'Fetching...' : 'Fetch Models'}
                  </button>
                )}

                {selectedProvider === 'opencode_zen' && (
                  <button
                    onClick={async () => {
                      const apiKey = currentProvider.config.api_key;
                      if (!apiKey) {
                        alert('Please enter an API key first');
                        return;
                      }
                      setOpencodeZenFetching(true);
                      try {
                        const res = await fetch('http://localhost:8000/api/settings/models/fetch-opencode', {
                          method: 'POST',
                          headers: { 
                            'Authorization': `Bearer ${getToken()}`,
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({ provider: 'zen', api_key: apiKey })
                        });
                        const data = await res.json();
                        if (data.models) {
                          handleModelFetch(data.models);
                        } else if (data.error) {
                          alert(data.error);
                        }
                      } catch (err) {
                        alert('Failed to fetch models. Check your API key.');
                      }
                      setOpencodeZenFetching(false);
                    }}
                    disabled={opencodeZenFetching}
                    style={{
                      marginTop: '16px',
                      padding: '10px 16px',
                      background: opencodeZenFetching ? '#1c2d38' : '#00ed64',
                      border: 'none',
                      borderRadius: '8px',
                      color: opencodeZenFetching ? '#5c6c7a' : '#001e2b',
                      fontSize: '14px',
                      cursor: opencodeZenFetching ? 'default' : 'pointer',
                      fontWeight: 500
                    }}
                  >
                    {opencodeZenFetching ? 'Fetching...' : 'Fetch Models'}
                  </button>
                )}

                {selectedProvider === 'opencode_go' && (
                  <button
                    onClick={async () => {
                      const apiKey = currentProvider.config.api_key;
                      if (!apiKey) {
                        alert('Please enter an API key first');
                        return;
                      }
                      setOpencodeGoFetching(true);
                      try {
                        const res = await fetch('http://localhost:8000/api/settings/models/fetch-opencode', {
                          method: 'POST',
                          headers: { 
                            'Authorization': `Bearer ${getToken()}`,
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({ provider: 'go', api_key: apiKey })
                        });
                        const data = await res.json();
                        if (data.models) {
                          handleModelFetch(data.models);
                        } else if (data.error) {
                          alert(data.error);
                        }
                      } catch (err) {
                        alert('Failed to fetch models. Check your API key.');
                      }
                      setOpencodeGoFetching(false);
                    }}
                    disabled={opencodeGoFetching}
                    style={{
                      marginTop: '16px',
                      padding: '10px 16px',
                      background: opencodeGoFetching ? '#1c2d38' : '#00ed64',
                      border: 'none',
                      borderRadius: '8px',
                      color: opencodeGoFetching ? '#5c6c7a' : '#001e2b',
                      fontSize: '14px',
                      cursor: opencodeGoFetching ? 'default' : 'pointer',
                      fontWeight: 500
                    }}
                  >
                    {opencodeGoFetching ? 'Fetching...' : 'Fetch Models'}
                  </button>
                )}
              </div>
            </>
          ) : (
            <div style={{ 
              textAlign: 'center', 
              padding: '48px 24px',
              color: '#5c6c7a'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚙️</div>
              <p>This provider is disabled. Click "Disabled" above to enable it.</p>
            </div>
          )}

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
              onClick={handleSave}
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
        </main>
      </div>
    </div>
  )
}