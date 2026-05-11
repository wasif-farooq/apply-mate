import { useState, useEffect, useCallback } from 'react'
import { getSettings, updateProviderConfig, updateProviderModels, updateGlobalSelection, ProviderConfig, ModelConfig } from '@/lib/api'
import { getToken } from '@/lib/auth'

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

export { PROVIDER_LABELS }

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

const DEFAULT_PROVIDERS: Record<string, ProviderState> = {
  ollama: { enabled: true, config: { url: 'http://localhost:11434', api_key: '' }, models: [] },
  ollama_cloud: { enabled: false, config: { url: 'https://cloud.ollama.com', api_key: '' }, models: [] },
  openrouter: { enabled: false, config: { url: 'https://openrouter.ai/api/v1', api_key: '' }, models: [] },
  opencode_zen: { enabled: false, config: { url: 'https://opencode.ai/zen/v1', api_key: '' }, models: [] },
  opencode_go: { enabled: false, config: { url: 'https://opencode.ai/zen/go/v1', api_key: '' }, models: [] },
  openai: { enabled: false, config: { url: '', api_key: '' }, models: [] },
  anthropic: { enabled: false, config: { url: '', api_key: '' }, models: [] },
  google: { enabled: false, config: { url: '', api_key: '' }, models: [] }
}

const isDev = process.env.NODE_ENV === 'development'

const DEFAULT_PROVIDER_NAMES = isDev
  ? ['ollama', 'ollama_cloud', 'openrouter', 'opencode_zen', 'opencode_go']
  : ['ollama_cloud', 'openrouter', 'opencode_zen', 'opencode_go']

export interface UseSettingsReturn {
  loading: boolean
  saving: boolean
  saved: boolean
  selectedProvider: string
  globalSelectedModel: string | null
  globalSelectedProvider: string | null
  hasChanges: boolean
  expandedProviders: Record<string, boolean>
  showApiKey: Record<string, boolean>
  fetchingStates: Record<string, boolean>
  providers: Record<string, ProviderState>
  activeProvider: [string, ProviderState] | undefined
  currentProvider: ProviderState
  setSelectedProvider: (name: string) => void
  setExpandedProviders: (prev: any) => void
  setShowApiKey: (prev: any) => void
  setFetchingState: (provider: string, state: boolean) => void
  setProviders: (prev: any) => void
  handleConfigChange: (key: string, value: string) => void
  handleToggleProvider: (name: string) => void
  handleModelSelect: (modelName: string) => Promise<void>
  handleModelFetch: (dbModels: { model_name: string; is_default: boolean }[]) => void
  handleSave: () => Promise<void>
  loadSettings: () => Promise<void>
}

export function useSettings(): UseSettingsReturn {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState(DEFAULT_PROVIDER_NAMES[0])
  const [globalSelectedModel, setGlobalSelectedModel] = useState<string | null>(null)
  const [globalSelectedProvider, setGlobalSelectedProvider] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [expandedProviders, setExpandedProviders] = useState<Record<string, boolean>>({})
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({})
  const [fetchingStates, setFetchingStates] = useState<Record<string, boolean>>({
    ollama: false,
    ollama_cloud: false,
    openrouter: false,
    opencode_zen: false,
    opencode_go: false
  })
  
  const [providers, setProviders] = useState<Record<string, ProviderState>>(DEFAULT_PROVIDERS)

  const loadSettings = useCallback(async () => {
    try {
      const data = await getSettings()
      
      const globalModel = data.selected_model
      const globalProvider = data.selected_provider
      
      setGlobalSelectedModel(globalModel || null)
      setGlobalSelectedProvider(globalProvider || null)
      
const newProviders: Record<string, ProviderState> = {}
      const newExpanded: Record<string, boolean> = {}

      for (const name of DEFAULT_PROVIDER_NAMES) {
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
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const saveProvider = useCallback(async (name: string, state: ProviderState) => {
    try {
      await updateProviderConfig(name, state.enabled, state.config)
      const models = state.models
        .filter(m => m.selected)
        .map(m => ({ model_name: m.name, is_default: m.selected }))
      await updateProviderModels(name, models)
    } catch (error) {
      console.error('Failed to save provider:', name, error)
    }
  }, [])

  const handleConfigChange = useCallback((key: string, value: string) => {
    setProviders(prev => ({
      ...prev,
      [selectedProvider]: {
        ...prev[selectedProvider],
        config: { ...prev[selectedProvider].config, [key]: value }
      }
    }))
    setHasChanges(true)
  }, [selectedProvider])

  const handleToggleProvider = useCallback((name: string) => {
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
  }, [])

  const handleModelSelect = useCallback(async (modelName: string) => {
    setProviders(prev => {
      const provider = prev[selectedProvider]
      if (!provider) return prev
      
      const updatedModels = provider.models.map(m => ({
        name: m.name,
        selected: m.name === modelName
      }))
      
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
  }, [selectedProvider])

  const handleModelFetch = useCallback((dbModels: { model_name: string; is_default: boolean }[]) => {
    const provider = providers[selectedProvider]
    if (!provider) return

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
  }, [providers, selectedProvider])

  const handleSave = useCallback(async () => {
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
  }, [providers, saveProvider])

  const validProviders = Object.keys(providers)
  const safeSelectedProvider = validProviders.includes(selectedProvider) ? selectedProvider : validProviders[0] || 'ollama'
  const activeProvider = Object.entries(providers).find(([_, p]) => p?.enabled && p?.models?.some(m => m?.selected))
  const currentProvider = providers[safeSelectedProvider] || { enabled: false, config: { url: '', api_key: '' }, models: [] }

  const setFetchingState = useCallback((provider: string, state: boolean) => {
    setFetchingStates(prev => ({ ...prev, [provider]: state }))
  }, [])

  return {
    loading,
    saving,
    saved,
    selectedProvider,
    globalSelectedModel,
    globalSelectedProvider,
    hasChanges,
    expandedProviders,
    showApiKey,
    fetchingStates,
    providers,
    activeProvider,
    currentProvider,
    setSelectedProvider,
    setExpandedProviders,
    setShowApiKey,
    setFetchingState,
    setProviders,
    handleConfigChange,
    handleToggleProvider,
    handleModelSelect,
    handleModelFetch,
    handleSave,
    loadSettings,
  }
}