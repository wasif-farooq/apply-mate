import React from 'react'
import { colors, borderRadius, fontSize, fontWeight } from '../styles/tokens'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: React.ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  style,
  ...props
}: ButtonProps) {
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    border: 'none',
    borderRadius: borderRadius.md,
    fontWeight: fontWeight.semibold,
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s',
    opacity: disabled || loading ? 0.5 : 1,
  }

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { padding: '8px 12px', fontSize: fontSize.sm },
    md: { padding: '12px 16px', fontSize: fontSize.md },
    lg: { padding: '16px 24px', fontSize: fontSize.lg },
  }

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: colors.accent.primary,
      color: colors.background.primary,
    },
    secondary: {
      background: 'transparent',
      border: `1px solid ${colors.border}`,
      color: colors.text.secondary,
    },
    danger: {
      background: 'transparent',
      border: `1px solid ${colors.error}`,
      color: colors.error,
    },
    ghost: {
      background: 'transparent',
      color: colors.text.secondary,
    },
  }

  return (
    <button
      disabled={disabled || loading}
      style={{
        ...baseStyle,
        ...sizeStyles[size],
        ...variantStyles[variant],
        ...style,
      }}
      {...props}
    >
      {loading && <span className="spinner" />}
      {children}
      <style>{spinnerStyles}</style>
    </button>
  )
}

const spinnerStyles = `
  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`