interface ErrorToastProps {
  message: string
  onDismiss?: () => void
}

export function ErrorToast({ message, onDismiss }: ErrorToastProps) {
  if (!message) return null

  return (
    <div className="ext-error-toast" onClick={onDismiss}>
      {message}
    </div>
  )
}