import React from 'react'
import { colors, borderRadius, fontSize, spacing } from '../styles/tokens'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  fullWidth?: boolean
}

export function Input({
  label,
  error,
  fullWidth = true,
  style,
  ...props
}: InputProps) {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
    width: fullWidth ? '100%' : 'auto',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  }

  const inputStyle: React.CSSProperties = {
    padding: `${spacing.md} ${spacing.lg}`,
    background: colors.background.secondary,
    border: `1px solid ${error ? colors.error : colors.border}`,
    borderRadius: borderRadius.md,
    color: colors.text.primary,
    fontSize: fontSize.md,
    outline: 'none',
    transition: 'border-color 0.2s',
    width: '100%',
    boxSizing: 'border-box',
    ...style,
  }

  const errorStyle: React.CSSProperties = {
    fontSize: fontSize.xs,
    color: colors.error,
  }

  return (
    <div style={containerStyle}>
      {label && <label style={labelStyle}>{label}</label>}
      <input
        style={inputStyle}
        onFocus={(e) => {
          e.target.style.borderColor = colors.accent.primary
        }}
        onBlur={(e) => {
          e.target.style.borderColor = error ? colors.error : colors.border
        }}
        {...props}
      />
      {error && <span style={errorStyle}>{error}</span>}
    </div>
  )
}