import React from 'react'
import { colors } from '../styles/tokens'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
}

export function LoadingSpinner({ size = 'md' }: LoadingSpinnerProps) {
  const sizes = {
    sm: 16,
    md: 24,
    lg: 40,
  }

  const px = sizes[size]

  const style: React.CSSProperties = {
    width: px,
    height: px,
    border: `${px / 8}px solid ${colors.background.tertiary}`,
    borderTopColor: colors.accent.primary,
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  }

  return (
    <>
      <div style={style} />
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  )
}