export const colors = {
  background: {
    primary: '#001e2b',
    secondary: '#0d1f2b',
    tertiary: '#1c2d38',
  },
  text: {
    primary: '#ffffff',
    secondary: '#a8b3bc',
    muted: '#6b7280',
  },
  accent: {
    primary: '#00ed64',
    secondary: '#00b84d',
    hover: '#00d75a',
  },
  error: '#ff6b6b',
  warning: '#fbbf24',
  success: '#00ed64',
  border: '#1c2d38',
} as const

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  xxl: '32px',
} as const

export const borderRadius = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
} as const

export const fontSize = {
  xs: '12px',
  sm: '14px',
  md: '16px',
  lg: '18px',
  xl: '22px',
  xxl: '28px',
} as const

export const fontWeight = {
  normal: 400,
  medium: 500,
  semibold: 600,
} as const

export const transition = {
  fast: '0.15s',
  normal: '0.2s',
  slow: '0.3s',
} as const

export const theme = {
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
  transition,
} as const

export type Theme = typeof theme