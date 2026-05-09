interface LoadingOverlayProps {
  message?: string
  visible: boolean
}

export function LoadingOverlay({ message = 'Loading...', visible }: LoadingOverlayProps) {
  if (!visible) return null

  return (
    <div className="ext-loading-overlay">
      <div className="ext-spinner" />
      <div className="ext-loading-text">{message}</div>
    </div>
  )
}