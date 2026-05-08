import React, { useEffect } from 'react'
import { colors, borderRadius, fontSize, spacing } from '../styles/tokens'

interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info'
  onClose?: () => void
  duration?: number
}

export function Toast({
  message,
  type = 'info',
  onClose,
  duration = 3000,
}: ToastProps) {
  useEffect(() => {
    if (duration > 0 && onClose) {
      const timer = setTimeout(onClose, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  const bgColors = {
    success: '#e3fcef',
    error: '#fff8e0',
    info: '#f0f4f8',
  }

  const textColors = {
    success: '#00684a',
    error: '#946f3f',
    info: '#333333',
  }

  const style: React.CSSProperties = {
    padding: `${spacing.md} ${spacing.lg}`,
    background: bgColors[type],
    color: textColors[type],
    borderRadius: borderRadius.md,
    fontSize: fontSize.sm,
    border: `1px solid ${type === 'success' ? colors.accent.primary : colors.border}`,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    animation: 'slideIn 0.3s ease-out',
  }

  return (
    <div style={style}>
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      {message}
    </div>
  )
}