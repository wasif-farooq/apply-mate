import { colors, spacing, fontSize } from '../styles/tokens'

interface ProcessingStateProps {
  message?: string
  emoji?: string
}

export function ProcessingState({
  message = 'Processing...',
  emoji = '🤖'
}: ProcessingStateProps) {
  const containerStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: spacing.xxl,
  }

  const emojiStyle: React.CSSProperties = {
    fontSize: '48px',
    marginBottom: spacing.lg,
    animation: 'bounce 1s infinite',
  }

  const titleStyle: React.CSSProperties = {
    fontSize: fontSize.xl,
    marginBottom: spacing.sm,
    margin: 0,
  }

  const textStyle: React.CSSProperties = {
    color: colors.text.secondary,
    marginBottom: spacing.xl,
  }

  const progressContainerStyle: React.CSSProperties = {
    background: colors.background.tertiary,
    borderRadius: '4px',
    height: '8px',
    maxWidth: '300px',
    margin: '0 auto',
    overflow: 'hidden',
  }

  const progressStyle: React.CSSProperties = {
    height: '100%',
    background: `linear-gradient(90deg, ${colors.accent.primary}, ${colors.accent.secondary})`,
    borderRadius: '4px',
    animation: 'progress 2s infinite',
  }

  return (
    <div style={containerStyle}>
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes progress {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 100%; }
        }
      `}</style>
      <div style={emojiStyle}>{emoji}</div>
      <h2 style={titleStyle}>{message}</h2>
      <p style={textStyle}>Please wait...</p>
      <div style={progressContainerStyle}>
        <div style={progressStyle} />
      </div>
    </div>
  )
}