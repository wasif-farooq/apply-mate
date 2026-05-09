import { LogoIcon } from '@applybuddy/ui'

interface HeaderProps {
  onSettings?: () => void
  onLogout?: () => void
}

export function Header({ onSettings, onLogout }: HeaderProps) {
  const handleSettings = () => {
    if (onSettings) {
      onSettings()
    } else {
      chrome.tabs.create({ url: 'http://localhost:3000/settings' })
    }
  }

  return (
    <div className="ext-header">
      <div className="ext-header-left">
        <LogoIcon style={{ width: '24px', height: '24px' }} />
        <h1>ApplyBuddy</h1>
      </div>
      <div className="ext-header-actions">
        {onSettings && (
          <button className="ext-button--icon" onClick={handleSettings} title="Settings">
            ⚙️
          </button>
        )}
        {onLogout && (
          <button className="ext-button--icon" onClick={onLogout} title="Sign Out">
            🚪
          </button>
        )}
      </div>
    </div>
  )
}